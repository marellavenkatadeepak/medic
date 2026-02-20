import { google } from 'npm:googleapis';

export default async function (req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const walletAddress = url.searchParams.get('wallet');

        if (!walletAddress) {
            return new Response(JSON.stringify({ error: 'Wallet address required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        // InsForge functions usually run on a subdomain, we need to know the callback URL.
        // For now, let's assume the user will configure the redirect URI in Google Console to point to this function
        // OR back to the frontend which then calls the callback function.
        // Standard flow: Frontend -> Auth Function -> Google -> Frontend Callback Page -> Callback Function -> Frontend Success
        // Let's stick to the Next.js pattern: Google -> Frontend /api/calendar/callback
        // But since we are moving logic to backend, maybe: Google -> Function Callback?
        // Easier to keep Frontend Callback Page that calls Function.

        // Let's verify what the Next.js code did.
        // It set redirect_uri to `${process.env.NEXT_PUBLIC_BASE_URL}/api/calendar/callback`
        // We should change this to the frontend URL.
        const redirectUri = `${Deno.env.get('NEXT_PUBLIC_INSFORGE_BASE_URL') || 'https://medilock-app.insforge.app'}/api/calendar/callback`;
        // Wait, if we use static export, /api/calendar/callback won't exist as a route.
        // It must be a page: /doctor/calendar-callback or similar.
        // OR we can point Google directly to the Edge Function URL?
        // If we point to Edge Function, it can redirect to Frontend.

        // Let's try to point to the Edge Function for callback to handle the exchange, then redirect to frontend.
        // But we don't know the Edge Function URL until we deploy it.
        // Chicken and egg.
        // strategy: Deploy callback function first, update env var, then deploy auth function.
        // OR: Use a fixed path on the frontend for the "processing" page, e.g., /doctor?action=calendar_callback
        // The Google Console likely needs a fixed URL.

        // Let's try keeping the Redirect URI as the FRONTEND URL (e.g., /doctor).
        // The frontend component, upon loading with ?code=..., will call the 'calendar-callback' function.
        // This is cleaner for static sites.

        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'; // Fallback for dev
        const redirectRedirectUri = `${frontendUrl}/doctor`;

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectRedirectUri
        );

        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: walletAddress,
        });

        return new Response(JSON.stringify({ url: authUrl }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Auth Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
