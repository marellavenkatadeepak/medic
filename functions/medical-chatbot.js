import { createClient } from 'npm:@insforge/sdk';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

export default async function (req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        console.log("[Start] Medical Chatbot Function Invoked");

        // 1. Parse Request Body
        let body;
        let textBody = '';
        try {
            textBody = await req.text();
            console.log("[Body] Raw Text:", textBody ? textBody.slice(0, 500) : '<empty>');
            if (!textBody) throw new Error("Empty body");
            body = JSON.parse(textBody);
            console.log("[Body] Parsed successfully");
        } catch (e) {
            console.error("[Error] invalid JSON body", e, "Raw Text:", textBody);
            throw new Error(`Invalid JSON body: ${e.message}`);
        }

        const { patient_wallet, message } = body;

        if (!patient_wallet || !message) {
            console.error("[Error] Missing patient_wallet or message");
            return new Response(JSON.stringify({ error: 'patient_wallet and message required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Client Initialization
        const supabaseUrl = Deno.env.get('INSFORGE_BASE_URL');
        const supabaseKey = Deno.env.get('ANON_KEY');
        const googleKey = Deno.env.get('GOOGLE_API_KEY') || "AIzaSyAiboVwrC6N3gbdoBXLDf5nUd3QrppdFMM";

        if (!supabaseUrl || !supabaseKey) {
            console.error(`[Error] Missing Env Vars: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
            throw new Error("Server Misconfiguration: Missing INSFORGE_BASE_URL or ANON_KEY");
        }

        if (!googleKey) {
            console.error("[Error] Missing Google API Key");
            throw new Error("Server Misconfiguration: Missing GOOGLE_API_KEY");
        }

        console.log(`[Config] URL=${supabaseUrl.slice(0, 10)}... Key=${supabaseKey.slice(0, 5)}... GoogleKey=${googleKey.slice(0, 5)}...`);

        const insforge = createClient({
            baseUrl: supabaseUrl,
            anonKey: supabaseKey,
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        const genAI = new GoogleGenerativeAI(googleKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            // systemInstruction is set later or moved here. 
            // Note: systemInstruction in getGenerativeModel might be supported in newer SDKs. 
            // If it fails, we can add it to the history as a 'user' message or 'system' role if supported.
            // For now, let's keep it but wrap in try/catch if model creation fails.
        });

        // 3. Fetch Context
        console.log(`[DB] Fetching analyses for wallet: ${patient_wallet}`);
        const { data: analyses, error: analysisError } = await insforge.database
            .from('analyses')
            .select('summary, risk_score, conditions, specialist, urgency, created_at')
            .eq('patient_wallet', patient_wallet)
            .order('created_at', { ascending: false })
            .order('created_at', { ascending: false });
        // .limit(5); // Removed limit to access all files as requested

        if (analysisError) {
            console.error("[DB Error] Fetching analyses:", analysisError);
            throw new Error(`Database Error (Analyses): ${analysisError.message}`);
        }

        console.log(`[DB] Found ${analyses ? analyses.length : 0} analyses`);

        // 4. Fetch History
        console.log(`[DB] Fetching chat history`);
        const { data: history, error: historyError } = await insforge.database
            .from('chat_history')
            .select('role, message')
            .eq('patient_wallet', patient_wallet)
            .order('created_at', { ascending: false })
            .limit(10);

        if (historyError) {
            console.error("[DB Error] Fetching history:", historyError);
            throw new Error(`Database Error (History): ${historyError.message}`);
        }

        // Build context from analyses
        const analysisContext = analyses && analyses.length > 0
            ? analyses.map((a, i) => `Report ${i + 1}: Summary: ${a.summary} | Risk: ${a.risk_score}/100 | Conditions: ${a.conditions?.join(', ')} | Specialist: ${a.specialist} | Urgency: ${a.urgency}`).join('\n')
            : 'No previous reports found for this patient.';

        const systemInstruction = `You are a professional medical AI assistant for MediChain AI. You help patients understand their medical reports, risk scores, and recommended next steps.
        
IMPORTANT RULES:
- You are NOT a replacement for professional medical advice
- Always recommend consulting a healthcare professional for serious concerns
- Be empathetic, clear, and avoid overly technical jargon
- If asked about something outside the patient's reports, provide general health information with appropriate disclaimers

PATIENT CONTEXT:
${analysisContext}

You MUST respond in this exact JSON format:
{
  "answer": "Your detailed, helpful response",
  "warning": "Any important medical disclaimers or warnings (empty string if none)",
  "confidence": 0.85,
  "tool_call": { 
      "type": "book_appointment", 
      "specialty": "Cardiology", 
      "doctor_name": "Dr. Smith" 
  } // Optional: Only include this if user wants to perform an action
}

If the user asks to book an appointment, set "tool_call" with type "book_appointment". Infer specialty/doctor if possible.
The confidence should be 0.0-1.0 based on how well the question relates to available data.`;

        // Update model with system instruction if possible, or just proceed
        // The previous code passed systemInstruction to getGenerativeModel. 
        // We will re-instantiate or just assume it worked.

        // 5. Prepare Chat
        let chatHistory = [];
        if (history && history.length > 0) {
            const reversedHistory = [...history].reverse();
            chatHistory = reversedHistory.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.message }]
            }));

            // Ensure history starts with user message for Gemini
            while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
                chatHistory.shift();
            }
        }

        // Add system instruction as the first message if needed, but 'systemInstruction' param is better.
        // We'll trust the checked-in code used it.
        const chat = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: systemInstruction
        }).startChat({
            history: chatHistory,
            generationConfig: {
                temperature: 0.4,
                responseMimeType: "application/json",
            }
        });

        console.log(`[AI] Sending message: ${message}`);
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        console.log(`[AI] Response: ${responseText.slice(0, 100)}...`);

        // ... (JSON parsing logic is fine, let's keep it mostly same but formatted)
        let response;
        try {
            const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
            response = JSON.parse(cleanedText);
        } catch (e) {
            console.warn("Retrying JSON parse on raw text due to:", e);
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    response = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No JSON found in response");
                }
            } catch (innerError) {
                console.error("Failed to parse AI response:", responseText, innerError);
                response = {
                    answer: responseText,
                    warning: 'Note: AI response format was unexpected.',
                    confidence: 0.5,
                };
            }
        }

        // 6. Save to DB
        console.log(`[DB] Saving interaction`);
        // Save user message
        await insforge.database.from('chat_history').insert([
            { patient_wallet, role: 'user', message: message }
        ]);

        // Save assistant message
        const { error: insertError } = await insforge.database.from('chat_history').insert([
            {
                patient_wallet,
                role: 'assistant', // DB uses 'assistant'
                message: response.answer,
                warning: response.warning,
                confidence: response.confidence,
            }
        ]);

        if (insertError) {
            console.error("[DB Error] Saving chat:", insertError);
            // Don't throw here, just log, so we can still return the response to user
        }

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error("Chat Error:", err);
        return new Response(JSON.stringify({
            error: 'Chat failed',
            details: err.message,
            stack: err.stack
        }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
