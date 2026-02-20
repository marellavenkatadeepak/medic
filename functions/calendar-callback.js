import { createClient } from 'npm:@insforge/sdk';
import { google } from 'npm:googleapis';

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
        const body = await req.json();
        const { code, wallet } = body;

        if (!code || !wallet) {
            return new Response(JSON.stringify({ error: 'Code and wallet required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
        const redirectUri = `${frontendUrl}/doctor`;

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            return new Response(JSON.stringify({ error: 'No refresh token received' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('INSFORGE_BASE_URL');
        const supabaseKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('ANON_KEY'); // Should use Service Key for writing but ANON might work with RLS if user is authed?
        // Actually, for updating doctor profiles, likely need Service Role or RLS policy matching wallet.
        // Assuming SERVICE_KEY is available in Edge Function env.

        const insforge = createClient({
            baseUrl: supabaseUrl,
            anonKey: supabaseKey,
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        // Update profile
        const { error } = await insforge
            .from('doctor_profiles')
            .update({
                google_refresh_token: tokens.refresh_token,
                google_calendar_connected: true,
                updated_at: new Date().toISOString(),
            })
            .eq('wallet_address', wallet);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Callback Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
