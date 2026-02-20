'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';

interface Appointment {
    id: string;
    patient_wallet: string;
    doctor_wallet: string;
    date: string;
    time: string;
    status: string;
    reason: string;
    meeting_link?: string;
    doctor_name?: string;
    doctor_specialty?: string;
}

interface AppointmentsViewProps {
    address: string;
}

export default function AppointmentsView({ address }: AppointmentsViewProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
        completed: 'bg-green-100 text-green-800 border-green-300',
        cancelled: 'bg-red-100 text-red-800 border-red-300',
    };

    useEffect(() => {
        loadAppointments();
    }, [address]);

    const loadAppointments = async () => {
        if (!address) return;
        try {
            const { data: appts } = await insforge.database
                .from('appointments')
                .select()
                .eq('patient_wallet', address)
                .order('date', { ascending: true });

            if (appts && appts.length > 0) {
                // Fetch doctor profiles for names
                const doctorWallets = [...new Set(appts.map((a: any) => a.doctor_wallet))];
                const { data: profiles } = await insforge.database
                    .from('doctor_profiles')
                    .select()
                    .in('wallet_address', doctorWallets);

                const profileMap: Record<string, any> = {};
                if (profiles) profiles.forEach((p: any) => { profileMap[p.wallet_address] = p; });

                const enriched = appts.map((a: any) => ({
                    ...a,
                    doctor_name: profileMap[a.doctor_wallet]?.name || null,
                    doctor_specialty: profileMap[a.doctor_wallet]?.specialty || null,
                }));
                setAppointments(enriched);
            } else if (appts) {
                setAppointments(appts as Appointment[]);
            }
        } catch (err) {
            console.error('Failed to load appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const cancelAppointment = async (id: string) => {
        try {
            await insforge.database
                .from('appointments')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', id);
            await loadAppointments();
        } catch (err) {
            console.error('Failed to cancel:', err);
            alert('Failed to cancel appointment');
        }
    };

    if (loading) return <div className="p-12 text-center font-mono animate-pulse">LOADING APPOINTMENTS...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wider border-l-4 border-retro-accent-green pl-3">Your Appointments</h3>
                <Link
                    href="/patient/book"
                    className="text-sm underline font-bold hover:text-retro-accent-pink"
                >
                    + Book New
                </Link>
            </div>

            {appointments.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-12 text-center">
                    <span className="text-4xl block mb-4">📅</span>
                    <p className="font-medium">No appointments scheduled.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map(apt => (
                        <div key={apt.id} className="bg-white border-2 border-black p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-retro-accent-yellow border-2 border-black flex items-center justify-center text-xl font-serif italic">
                                    Dr.
                                </div>
                                <div>
                                    <p className="font-bold text-lg">
                                        {apt.doctor_name ? `Dr. ${apt.doctor_name}` : `${apt.doctor_wallet?.slice(0, 8)}...`}
                                    </p>
                                    {apt.doctor_specialty && <p className="text-xs uppercase tracking-wide bg-black text-white px-1 inline-block">{apt.doctor_specialty}</p>}
                                    <p className="text-sm font-mono mt-1">
                                        {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ {apt.time?.slice(0, 5)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 text-xs font-bold uppercase border border-black ${statusColors[apt.status] || 'bg-gray-100'}`}>
                                    {apt.status}
                                </span>
                                {(apt.status === 'pending' || apt.status === 'confirmed') && (
                                    <button
                                        onClick={() => cancelAppointment(apt.id)}
                                        className="block mt-2 text-xs text-red-600 hover:underline font-bold"
                                    >
                                        CANCEL
                                    </button>
                                )}
                                {apt.meeting_link && (
                                    <a href={apt.meeting_link} target="_blank" rel="noreferrer" className="block mt-2 text-xs bg-black text-white px-2 py-1 hover:bg-gray-800">
                                        JOIN MEET
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
