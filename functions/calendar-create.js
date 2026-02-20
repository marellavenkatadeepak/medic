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
        const { appointment_id, doctor_wallet, patient_wallet, date, time, reason } = body;

        if (!appointment_id || !doctor_wallet) {
            return new Response(JSON.stringify({ error: 'appointment_id and doctor_wallet required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('INSFORGE_BASE_URL');
        const supabaseKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('ANON_KEY');

        const insforge = createClient({
            baseUrl: supabaseUrl,
            anonKey: supabaseKey,
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        // 1. Get doctor's refresh token
        const { data: profiles, error: profileError } = await insforge
            .from('doctor_profiles')
            .select('google_refresh_token, name, google_calendar_connected')
            .eq('wallet_address', doctor_wallet);

        if (profileError || !profiles || profiles.length === 0 || !profiles[0].google_refresh_token) {
            return new Response(JSON.stringify({ error: 'Doctor has not connected Google Calendar', calendar_connected: false }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { google_refresh_token, name: doctorName } = profiles[0];

        // 2. Set up OAuth2 client
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            `${frontendUrl}/doctor`
        );
        oauth2Client.setCredentials({ refresh_token: google_refresh_token });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Create Event
        const startDateTime = `${date}T${time}:00`;
        const endDate = new Date(`${date}T${time}`);
        endDate.setMinutes(endDate.getMinutes() + 30);
        const endDateTime = endDate.toISOString().replace('Z', '');

        const event = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `MediLock: Patient Consultation`,
                description: `Appointment via MediLock Healthcare Platform\n\nPatient Wallet: ${patient_wallet}\nReason: ${reason || 'General consultation'}\n\nDr. ${doctorName || 'Doctor'}`,
                start: { dateTime: startDateTime, timeZone: 'UTC' }, // Keeping it simple for now
                end: { dateTime: endDateTime, timeZone: 'UTC' },
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
            (e) => e.entryPointType === 'video'
        )?.uri || event.data.hangoutLink || '';

        // 4. Update Appointment
        await insforge
            .from('appointments')
            .update({
                google_event_id: googleEventId,
                meeting_link: meetLink,
                updated_at: new Date().toISOString(),
            })
            .eq('id', appointment_id);

        return new Response(JSON.stringify({
            success: true,
            google_event_id: googleEventId,
            meeting_link: meetLink,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Calendar Create Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
