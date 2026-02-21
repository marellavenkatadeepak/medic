import { createClient } from 'npm:@insforge/sdk';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import CryptoJS from 'npm:crypto-js';

console.log("[Init] analyze-report function loaded");

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
        const { file_base64, file_cid, encryption_key, iv, file_type, patient_wallet, file_name, source } = body;

        console.log(`[Parsed Body] source=${source || 'direct'} file=${file_name}`);

        if (!patient_wallet) {
            return new Response(JSON.stringify({ error: 'patient_wallet required' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let base64File = file_base64;

        // Handle IPFS Source
        if (source === 'ipfs' || (file_cid && !file_base64)) {
            if (!file_cid || !encryption_key || !iv) {
                return new Response(JSON.stringify({ error: 'Missing IPFS parameters (cid, key, iv)' }), {
                    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            console.log(`[IPFS] Fetching CID: ${file_cid}`);
            const gateway = "https://gateway.pinata.cloud/ipfs";
            const response = await fetch(`${gateway}/${file_cid}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
            }

            const ciphertext = await response.text();
            console.log(`[IPFS] Fetched ${ciphertext.length} bytes (encrypted)`);

            // Decrypt
            console.log(`[Crypto] Decrypting file...`);
            try {
                const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(encryption_key), {
                    iv: CryptoJS.enc.Hex.parse(iv),
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7,
                });

                base64File = CryptoJS.enc.Base64.stringify(decrypted);
                console.log(`[Crypto] Decryption success. Base64 length: ${base64File.length}`);

                if (base64File.length === 0) {
                    throw new Error("Decryption resulted in empty file. Check key/iv.");
                }

            } catch (decryptErr) {
                console.error("[Crypto Error]", decryptErr);
                throw new Error("Decryption failed");
            }
        }

        if (!base64File) {
            return new Response(JSON.stringify({ error: 'No file content available' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const apiKey = Deno.env.get('GOOGLE_API_KEY');
        if (!apiKey) {
            console.error("GOOGLE_API_KEY missing in environment");
            return new Response(JSON.stringify({
                error: 'Configuration Error: GOOGLE_API_KEY is missing in Edge Function environment variables.'
            }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Initialize SDK
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log(`[Processing] Analyzing file: ${file_name || 'unknown'}`);
        const contentType = file_type || 'application/pdf';

        const systemInstruction = `You are a professional medical analysis AI assistant. Analyze the provided medical report and return a structured JSON response. 
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

        // Switch to stable model for reliability verification
        const primaryModelId = "gemini-2.5-flash";

        let responseText;
        let model;

        console.log('[AI] Generating content via Gemini...');

        try {
            console.log(`[AI] Attempting generation with model: ${primaryModelId}`);
            model = genAI.getGenerativeModel({
                model: primaryModelId,
                systemInstruction: systemInstruction,
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: base64File,
                        mimeType: contentType
                    }
                },
                { text: "Analyze this medical report." }
            ]);

            responseText = result.response.text();

        } catch (aiError) {
            console.error(`[AI Error] Model ${primaryModelId} failed:`, aiError);
            return new Response(JSON.stringify({
                error: 'AI Analysis Failed',
                details: aiError.message,
                stack: aiError.stack
            }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log("AI Response received");

        // Parse JSON safely
        let analysis;
        try {
            analysis = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", responseText);
            // Attempt cleanup
            try {
                const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
                analysis = JSON.parse(cleaned);
            } catch (e2) {
                analysis = {
                    summary: 'Analysis completed but format was invalid. Please review the raw report manually.',
                    risk_score: 50,
                    conditions: ['Formatted extraction failed'],
                    biomarkers: {},
                    specialist: 'General Practitioner',
                    urgency: 'low',
                    raw_text: responseText
                };
            }
        }

        // Initialize InsForge Client
        const insforge = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('ANON_KEY'),
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        // Generate SHA256 hash
        const hashPayload = JSON.stringify(analysis);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashPayload));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const recordHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Store in database
        console.log('[DB] Storing analysis record...');
        const { data: dbRecord, error: dbError } = await insforge.database
            .from('analyses')
            .insert({
                patient_wallet: patient_wallet,
                file_name: file_name || 'report',
                file_url: source === 'ipfs' ? `ipfs://${file_cid}` : 'direct-upload',
                ocr_text: responseText,
                summary: analysis.summary,
                risk_score: analysis.risk_score || 50,
                conditions: analysis.conditions || [],
                biomarkers: analysis.biomarkers || {},
                specialist: analysis.specialist || 'General',
                urgency: analysis.urgency || 'low',
                record_hash: recordHash,
                ipfs_cid: file_cid || null,
                encryption_iv: iv || null,
            })
            .select();

        if (dbError) throw dbError;

        console.log('[Success] Analysis stored:', dbRecord[0].id);

        return new Response(JSON.stringify({
            success: true,
            analysis: {
                id: dbRecord[0].id,
                ...analysis,
                record_hash: recordHash,
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error("Function Fatal Error:", err);
        return new Response(JSON.stringify({
            error: 'Server Error during analysis',
            details: err.message,
            stack: err.stack
        }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
