import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Insforge SDK for server-side operations
const INSFORGE_BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const INSFORGE_API_KEY = process.env.INSFORGE_SERVICE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/calendar/callback`
    );
}

// GET: Handle OAuth callback — exchange code for tokens, save refresh token
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const walletAddress = searchParams.get('state');

        if (!code || !walletAddress) {
            return NextResponse.redirect(new URL('/doctor?calendar_error=missing_params', request.url));
        }

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            return NextResponse.redirect(new URL('/doctor?calendar_error=no_refresh_token', request.url));
        }

        // Store refresh token in doctor_profiles
        const updateRes = await fetch(`${INSFORGE_BASE_URL}/rest/v1/doctor_profiles?wallet_address=eq.${walletAddress}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': INSFORGE_API_KEY || '',
                'Authorization': `Bearer ${INSFORGE_API_KEY}`,
            },
            body: JSON.stringify({
                google_refresh_token: tokens.refresh_token,
                google_calendar_connected: true,
                updated_at: new Date().toISOString(),
            }),
        });

        if (!updateRes.ok) {
            console.error('Failed to store refresh token:', await updateRes.text());
            return NextResponse.redirect(new URL('/doctor?calendar_error=save_failed', request.url));
        }

        return NextResponse.redirect(new URL('/doctor?calendar_connected=true', request.url));
    } catch (error: any) {
        console.error('Calendar callback error:', error);
        return NextResponse.redirect(new URL(`/doctor?calendar_error=${encodeURIComponent(error.message)}`, request.url));
    }
}
