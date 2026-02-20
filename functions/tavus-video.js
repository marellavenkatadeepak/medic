export default async function (req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const TAVUS_API_KEY = Deno.env.get('TAVUS_API_KEY');
    if (!TAVUS_API_KEY) {
        return new Response(JSON.stringify({ error: 'Tavus API key not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');

        // POST: Generate video
        if (req.method === 'POST') {
            const { summary, risk_score, conditions, specialist, urgency } = await req.json();

            if (!summary) {
                return new Response(JSON.stringify({ error: 'summary is required' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Build doctor avatar script
            const script = `Hello! I've reviewed your medical report and I'd like to walk you through the findings.

${summary}

Your overall health risk score is ${risk_score} out of 100. ${risk_score <= 30 ? "This is a low risk score, which is great news!" :
                    risk_score <= 60 ? "This is a moderate risk score. While not immediately concerning, it's worth paying attention to." :
                        risk_score <= 80 ? "This is an elevated risk score. I'd recommend scheduling a follow-up appointment soon." :
                            "This is a high risk score. I strongly recommend seeking medical attention promptly."
                }

${conditions && conditions.length > 0 ? `The analysis identified the following conditions to be aware of: ${conditions.join(', ')}.` : ''}

${specialist ? `I would recommend consulting with a ${specialist} for a more thorough evaluation.` : ''}

${urgency === 'critical' ? 'Given the urgency level, please seek immediate medical attention.' :
                    urgency === 'high' ? 'I recommend scheduling an appointment within the next few days.' :
                        urgency === 'medium' ? 'A follow-up within the next couple of weeks would be advisable.' :
                            'A routine check-up at your convenience would be sufficient.'}

Remember, this AI analysis is meant to assist—not replace—professional medical advice. Please consult your doctor for a definitive diagnosis and treatment plan. Take care!`;

            // Call Tavus API to create video
            const tavusResponse = await fetch('https://tavusapi.com/v2/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': TAVUS_API_KEY,
                },
                body: JSON.stringify({
                    replica_id: Deno.env.get('TAVUS_REPLICA_ID') || 'default',
                    script: script,
                    video_name: `MediChain Report Analysis - ${new Date().toISOString()}`,
                }),
            });

            if (!tavusResponse.ok) {
                const errText = await tavusResponse.text();
                // If 402/403/etc, fail gracefully
                return new Response(JSON.stringify({ error: 'Tavus API error', details: errText }), {
                    status: tavusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            let videoData;
            try {
                videoData = await tavusResponse.json();
            } catch (e) {
                console.error("Failed to parse Tavus response", e);
                return new Response(JSON.stringify({ error: 'Invalid response from Tavus API' }), {
                    status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                video_id: videoData.video_id,
                status: videoData.status || 'queued',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // GET: Check video status (pass ?video_id=xxx)
        if (req.method === 'GET') {
            const videoId = url.searchParams.get('video_id');
            if (!videoId) {
                return new Response(JSON.stringify({ error: 'video_id query param required' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const statusResponse = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
                headers: { 'x-api-key': TAVUS_API_KEY },
            });

            if (!statusResponse.ok) {
                return new Response(JSON.stringify({ error: 'Failed to check status' }), {
                    status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const statusData = await statusResponse.json();

            return new Response(JSON.stringify({
                video_id: statusData.video_id,
                status: statusData.status,
                download_url: statusData.download_url || null,
                stream_url: statusData.stream_url || null,
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Tavus service error', details: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
