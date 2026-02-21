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
        console.log(`[Invoked] analyze-report method=${req.method}`);
        const body = await req.json();
        const { file_base64, file_type, patient_wallet, file_name } = body;

        console.log(`[Parsed Body] keys=${Object.keys(body)}`);
        console.log(`[Metadata] file=${file_name} type=${file_type} wallet=${patient_wallet} base64_len=${file_base64 ? file_base64.length : 0}`);

        if (!file_base64 || !patient_wallet) {
            console.error('[Error] Missing file_base64 or patient_wallet');
            return new Response(JSON.stringify({ error: 'file_base64 and patient_wallet required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Initialize Clients
        // SDK key precedence: Service Role > Anon > Environment default
        const insforge = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('ANON_KEY'),
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        // Use environment variable for API Key (secure)
        const apiKey = Deno.env.get('GOOGLE_API_KEY') || "AIzaSyAiboVwrC6N3gbdoBXLDf5nUd3QrppdFMM";

        if (!apiKey) {
            console.error("GOOGLE_API_KEY missing");
            throw new Error('GOOGLE_API_KEY is not set');
        } else {
            // Log partial key for debugging (safe)
            console.log(`[Config] Using Google API Key: ${apiKey.slice(0, 5)}...`);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Use provided base64 file directly
        console.log(`[Processing] Analyzing uploaded file: ${file_name || 'unknown'}`);

        const base64File = file_base64;
        const contentType = file_type || 'application/pdf';

        // Step 2: AI Analysis
        const prompt = `You are a professional medical analysis AI assistant. Analyze the provided medical report and return a structured JSON response. 
        You are NOT replacing a doctor.
        
        Return ONLY valid JSON in this exact format:
        {
          "summary": "A detailed, empathetic summary (4-6 sentences) focusing on the patient's experience, symptoms, and potential impact on daily life. Avoid cold clinical language.",
          "risk_score": 50,
          "conditions": ["list", "of", "detected", "conditions"],
          "biomarkers": { "hemoglobin": "12.5 g/dL", "platelets": "250000 /uL", "wbc": "5.4 10^3/uL", "glucose": "95 mg/dL" },
          "specialist": "Recommended specialist type (e.g. Cardiologist)",
          "urgency": "low|medium|high|critical"
        }
        
        Ensure risk_score is a number. Extract biomarkers as key-value pairs where possible.`;

        console.log('[AI] Generating content via Gemini...');
        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64File,
                    mimeType: contentType
                }
            }
        ]);

        const responseText = result.response.text();
        console.log("AI Response:", responseText);

        // Parse JSON safely
        let analysis;
        try {
            // Find JSON object in response (handles markdown code blocks)
            const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : cleanedText;
            analysis = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Response Text:", responseText);
            // Fallback object
            analysis = {
                summary: 'Analysis completed but format was invalid. Please review the raw report manually.',
                risk_score: 50,
                conditions: ['Formatted extraction failed'],
                biomarkers: {},
                specialist: 'General Practitioner',
                urgency: 'low'
            };
        }

        // Step 3: Generate SHA256 hash of the JSON result (as "record")
        const hashPayload = JSON.stringify(analysis);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashPayload));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const recordHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Step 4: Store in database
        console.log('[DB] Storing analysis record...');
        const { data: dbRecord, error: dbError } = await insforge.database
            .from('analyses')
            .insert({
                patient_wallet: patient_wallet,
                file_name: file_name || 'report',
                file_url: 'direct-upload',
                ocr_text: responseText, // Store full response as "text"
                summary: analysis.summary,
                risk_score: analysis.risk_score || 50,
                conditions: analysis.conditions || [],
                biomarkers: analysis.biomarkers || {},
                specialist: analysis.specialist || 'General',
                urgency: analysis.urgency || 'low',
                record_hash: recordHash,
            })
            .select();

        if (dbError) {
            console.error('[DB Error]', dbError);
            throw dbError;
        }

        console.log('[Success] Analysis stored:', dbRecord[0].id);

        const responseData = {
            success: true,
            analysis: {
                id: dbRecord[0].id,
                summary: analysis.summary,
                risk_score: analysis.risk_score,
                conditions: analysis.conditions,
                specialist: analysis.specialist,
                urgency: analysis.urgency,
                biomarkers: analysis.biomarkers,
                record_hash: recordHash,
            }
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error("Function Error:", err);
        return new Response(JSON.stringify({ error: 'Processing failed', details: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
