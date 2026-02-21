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
        const { organName, analysisText } = await req.json();

        if (!organName || !analysisText) {
            return new Response(JSON.stringify({ error: 'Missing organName or analysisText' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('GOOGLE_API_KEY') || "AIzaSyAiboVwrC6N3gbdoBXLDf5nUd3QrppdFMM";
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not set');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
        You are an expert AI medical consultant. Analyze the provided clinical text exclusively for the specific body part or organ provided.

        Organ/Body Part to Analyze: ${organName}

        Clinical Analysis Data context:
        ${JSON.stringify(analysisText)}

        Based ONLY on the clinical context provided and your medical knowledge, generate a detailed sub-analysis of health insights relating ONLY to the ${organName}.
        If the context does not explicitly mention the ${organName}, logically connect the patient's conditions or risk_score in the context to potential risks or standard preventative care for this specific organ.

        Output your detailed analysis as a raw JSON object (without markdown wrapping) with exactly the following structure:
        {
          "status": "safe|warning|risk", // safe if no anomalies, warning if mild/moderate, risk if severe
          "score": 0, // an integer 0-100 where 100 is highest risk, based on your medical reasoning
          "details": "A 1-sentence brief summary of the exact state of this organ based on the analysis context.",
          "aiInsights": ["Detailed clinical observation 1", "Observation 2", "Observation 3"],
          "recommendations": ["Actionable medical recommendation 1", "Recommendation 2", "Recommendation 3"],
          "markers": [ // Infer plausible markers to monitor based on the condition
            {"name": "Marker Name (e.g., Cortisol)", "value": "Placeholder or specific value if found", "status": "safe|warning|risk"}
          ],
          "normalRange": "General healthy reference range for the main marker"
        }
        `;

        const result = await model.generateContent(prompt);
        let rawResponse = result.response.text();

        // Strip markdown backticks if present
        rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const organAnalysis = JSON.parse(rawResponse);

        return new Response(JSON.stringify({ organAnalysis }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error generating organ analysis:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
