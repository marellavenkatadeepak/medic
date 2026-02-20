import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const INSFORGE_BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
const INSFORGE_API_KEY = process.env.INSFORGE_SERVICE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/calendar/callback`
    );
}

// POST: Create a Google Calendar event for a confirmed appointment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { appointment_id, doctor_wallet, patient_wallet, date, time, reason } = body;

        if (!appointment_id || !doctor_wallet) {
            return NextResponse.json({ error: 'appointment_id and doctor_wallet required' }, { status: 400 });
        }

        // 1. Get doctor's refresh token
        const profileRes = await fetch(
            `${INSFORGE_BASE_URL}/rest/v1/doctor_profiles?wallet_address=eq.${doctor_wallet}&select=google_refresh_token,name,google_calendar_connected`,
            {
                headers: {
                    'apikey': INSFORGE_API_KEY || '',
                    'Authorization': `Bearer ${INSFORGE_API_KEY}`,
                },
            }
        );

        const profiles = await profileRes.json();
        if (!profiles || profiles.length === 0 || !profiles[0].google_refresh_token) {
            return NextResponse.json({ error: 'Doctor has not connected Google Calendar', calendar_connected: false }, { status: 400 });
        }

        const { google_refresh_token, name: doctorName } = profiles[0];

        // 2. Set up OAuth2 client with refresh token
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: google_refresh_token });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Create calendar event
        const startDateTime = `${date}T${time}:00`;
        const endDate = new Date(`${date}T${time}`);
        endDate.setMinutes(endDate.getMinutes() + 30); // 30 min appointment
        const endDateTime = endDate.toISOString().replace('Z', '');

        const event = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `MediLock: Patient Consultation`,
                description: `Appointment via MediLock Healthcare Platform\n\nPatient Wallet: ${patient_wallet}\nReason: ${reason || 'General consultation'}\n\nDr. ${doctorName || 'Doctor'}`,
                start: {
                    dateTime: startDateTime,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                conferenceData: {
                    createRequest: {
                        requestId: `medilock-${appointment_id}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 30 },
                        { method: 'email', minutes: 60 },
                    ],
                },
            },
        });

        const googleEventId = event.data.id;
        const meetLink = event.data.conferenceData?.entryPoints?.find(
            (e: any) => e.entryPointType === 'video'
        )?.uri || event.data.hangoutLink || '';

        // 4. Update appointment with Google event details
        const updateRes = await fetch(
            `${INSFORGE_BASE_URL}/rest/v1/appointments?id=eq.${appointment_id}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': INSFORGE_API_KEY || '',
                    'Authorization': `Bearer ${INSFORGE_API_KEY}`,
                },
                body: JSON.stringify({
                    google_event_id: googleEventId,
                    meeting_link: meetLink,
                    updated_at: new Date().toISOString(),
                }),
            }
        );

        if (!updateRes.ok) {
            console.error('Failed to update appointment:', await updateRes.text());
        }

        return NextResponse.json({
            success: true,
            google_event_id: googleEventId,
            meeting_link: meetLink,
        });
    } catch (error: any) {
        console.error('Calendar event creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
