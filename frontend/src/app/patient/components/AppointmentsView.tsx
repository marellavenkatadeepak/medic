'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAppointments, cancelAppointment as cancelAppointmentApi } from '@/lib/api';

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
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        confirmed: 'bg-green-50 text-green-700 border-green-200',
        completed: 'bg-gray-50 text-gray-700 border-gray-200',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
    };

    useEffect(() => {
        loadAppointments();
    }, [address]);

    const loadAppointments = async () => {
        if (!address) return;
        try {
            const res = await getAppointments(address);
            if (res.success && res.appointments) {
                setAppointments(res.appointments as Appointment[]);
            }
        } catch (err) {
            console.error('Failed to load appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const cancelAppointment = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;
        try {
            await cancelAppointmentApi(id);
            await loadAppointments();
        } catch (err) {
            console.error('Failed to cancel:', err);
            alert('Failed to cancel appointment');
        }
    };

    if (loading) return (
        <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">Loading appointments...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Appointments</h3>
                <Link
                    href="/patient/book"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Book New
                </Link>
            </div>

            {appointments.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <p className="text-base font-medium text-gray-900 mb-1">No appointments scheduled</p>
                    <p className="text-sm text-gray-500">Book a consultation to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map(apt => (
                        <div key={apt.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                                    {apt.doctor_name ? apt.doctor_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {apt.doctor_name ? `Dr. ${apt.doctor_name}` : `${apt.doctor_wallet?.slice(0, 8)}...`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {apt.doctor_specialty && (
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {apt.doctor_specialty}
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-500">
                                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {apt.time?.slice(0, 5)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-2 border-t sm:border-0 pt-4 sm:pt-0 border-gray-100">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[apt.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                </span>

                                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                                        <button
                                            onClick={() => cancelAppointment(apt.id)}
                                            className="text-sm text-gray-400 hover:text-red-600 font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {apt.meeting_link && (
                                        <a
                                            href={apt.meeting_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-1.5"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                            Join Meeting
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
