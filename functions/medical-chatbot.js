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
        // 1. Parse body (use req.json() like analyze-report)
        let body;
        try {
            body = await req.json();
        } catch {
            // Fallback to text parsing
            const textBody = await req.text();
            if (!textBody) throw new Error("Empty body");
            body = JSON.parse(textBody);
        }
        const { patient_wallet, message } = body;

        if (!patient_wallet || !message) {
            return new Response(JSON.stringify({ error: 'patient_wallet and message required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Init clients
        const supabaseUrl = Deno.env.get('INSFORGE_BASE_URL');
        const supabaseKey = Deno.env.get('ANON_KEY');
        const googleKey = Deno.env.get('GOOGLE_API_KEY') || "AIzaSyAiboVwrC6N3gbdoBXLDf5nUd3QrppdFMM";

        if (!supabaseUrl || !supabaseKey) throw new Error("Missing INSFORGE_BASE_URL or ANON_KEY");

        const insforge = createClient({
            baseUrl: supabaseUrl,
            anonKey: supabaseKey,
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const genAI = new GoogleGenerativeAI(googleKey);

        // 3. Fetch context + history IN PARALLEL (big speed boost)
        const [analysesResult, historyResult] = await Promise.all([
            insforge.database
                .from('analyses')
                .select('summary, risk_score, conditions, specialist, urgency, created_at')
                .eq('patient_wallet', patient_wallet)
                .order('created_at', { ascending: false })
                .limit(5),
            insforge.database
                .from('chat_history')
                .select('role, message')
                .eq('patient_wallet', patient_wallet)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        const analyses = analysesResult.data;
        const history = historyResult.data;

        // 4. Build context (compact format = fewer tokens = faster)
        const analysisContext = analyses && analyses.length > 0
            ? analyses.map((a, i) => `[${i + 1}] ${a.summary} | Risk:${a.risk_score} | ${a.conditions?.join(',')} | ${a.specialist} | ${a.urgency}`).join('\n')
            : 'No reports found.';

        const systemInstruction = `You are MediLock AI, an advanced, empathetic, and highly professional medical assistant. Your primary goal is to help patients understand their medical reports, health risks, and actionable next steps while strictly adhering to safety guidelines.

CORE PERSONALITY & TONE:
- Empathetic and Reassuring: Always start with a warm, caring, and professional tone. Acknowledge patient concerns.
- Clear and Accessible: Explain complex medical terms using simple, everyday language. Avoid overwhelming jargon.
- Structured and Organized: Use bullet points, bold text, and clear paragraphs to make information easy to digest.
- Objective yet Supportive: Provide factual insights from the reports without causing unnecessary panic.

STRICT SAFETY RULES:
1. NEVER diagnose a condition or prescribe medication. You are an AI assistant, not a doctor.
2. ALWAYS include a clear disclaimer that your advice is informational and does not replace professional medical consultation.
3. For serious concerns, high risk scores, or emergencies, urgently recommend consulting a healthcare professional or visiting an ER.
4. If a question is outside the scope of the provided reports, offer general health information but reiterate your limitations.

AVAILABLE PATIENT REPORTS:
${analysisContext}

INSTRUCTIONS FOR JSON OUTPUT:
Return your response STRICTLY as a JSON object with the following fields:
- "answer": Your detailed, supportive, and structured response using Markdown (e.g., **bold**, bullet points).
- "warning": A brief, specific disclaimer or warning relevant to their query (e.g., "Please consult your doctor immediately."). Leave as an empty string if entirely benign.
- "confidence": A number between 0.0 and 1.0 reflecting your confidence in the answer based on the provided context.`;

        // 5. Build chat history
        let chatHistory = [];
        if (history && history.length > 0) {
            chatHistory = [...history].reverse()
                .map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.message }] }));
            while (chatHistory.length > 0 && chatHistory[0].role !== 'user') {
                chatHistory.shift();
            }
        }

        // 6. Send to Gemini (using stable flash model for speed)
        const chat = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction,
        }).startChat({
            history: chatHistory,
            generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json",
                maxOutputTokens: 1024,
            }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // 7. Parse response
        let response;
        try {
            response = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
        } catch {
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                response = jsonMatch ? JSON.parse(jsonMatch[0]) : { answer: responseText, warning: '', confidence: 0.5 };
            } catch {
                response = { answer: responseText, warning: '', confidence: 0.5 };
            }
        }

        // 8. Save to DB (fire-and-forget — don't await, return response immediately)
        insforge.database.from('chat_history').insert([
            { patient_wallet, role: 'user', message },
            { patient_wallet, role: 'assistant', message: response.answer, warning: response.warning, confidence: response.confidence },
        ]).then(() => console.log("[DB] Chat saved")).catch(e => console.error("[DB] Save error:", e));

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error("Chat Error:", err);
        return new Response(JSON.stringify({ error: 'Chat failed', details: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
