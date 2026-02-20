import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth2 client
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/calendar/callback`
    );
}

// GET: Generate Google OAuth URL for doctor authorization
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const walletAddress = searchParams.get('wallet');

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
        }

        const oauth2Client = getOAuth2Client();

        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: walletAddress, // Pass wallet address through OAuth flow
        });

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Calendar auth error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
