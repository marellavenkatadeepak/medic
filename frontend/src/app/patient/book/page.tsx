'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { insforge } from '@/lib/insforge';

interface DoctorProfile {
    id: string;
    wallet_address: string;
    name: string;
    specialty: string;
    bio: string;
}

const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30',
];

export default function BookAppointmentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const specialtyFilter = searchParams.get('specialty');
    const { address, isConnected } = useWallet();

    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [reason, setReason] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [successMsg, setSuccessMsg] = useState('');
    const [step, setStep] = useState<1 | 2 | 3>(1);

    useEffect(() => {
        if (!isConnected) { router.push('/'); return; }
        loadDoctors();
    }, [isConnected, specialtyFilter]);

    const loadDoctors = async () => {
        setIsLoading(true);
        try {
            let query = insforge.database
                .from('doctor_profiles')
                .select()
                .order('name', { ascending: true });

            if (specialtyFilter) {
                query = query.ilike('specialty', `%${specialtyFilter}%`);
            }

            const { data } = await query;

            if (data && data.length > 0) {
                setDoctors(data as DoctorProfile[]);
            } else {
                // FALLBACK: If no doctors found (e.g. no match for specialty),
                // try to find the default doctor "shreeharsha"
                console.log("No doctors found, attempting fallback to shreeharsha...");
                const { data: defaultDoc } = await insforge.database
                    .from('doctor_profiles')
                    .select()
                    .ilike('name', '%shreeharsha%')
                    .limit(1);

                if (defaultDoc && defaultDoc.length > 0) {
                    setDoctors(defaultDoc as DoctorProfile[]);
                } else {
                    setDoctors([]);
                }
            }
        } catch (err) {
            console.error('Failed to load doctors:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBookedSlots = async (doctorWallet: string, date: string) => {
        try {
            const { data } = await insforge.database
                .from('appointments')
                .select('time')
                .eq('doctor_wallet', doctorWallet)
                .eq('date', date)
                .neq('status', 'cancelled');
            if (data) setBookedSlots(data.map((d: any) => d.time?.slice(0, 5)));
        } catch (err) {
            console.error('Failed to load booked slots:', err);
        }
    };

    useEffect(() => {
        if (selectedDoctor && selectedDate) {
            loadBookedSlots(selectedDoctor.wallet_address, selectedDate);
        }
    }, [selectedDoctor, selectedDate]);

    const handleBook = async () => {
        if (!address || !selectedDoctor || !selectedDate || !selectedTime) return;
        setIsBooking(true);
        try {
            const { error } = await insforge.database
                .from('appointments')
                .insert([{
                    patient_wallet: address,
                    doctor_wallet: selectedDoctor.wallet_address,
                    date: selectedDate,
                    time: selectedTime,
                    reason: reason,
                    status: 'pending',
                }]);
            if (error) throw error;
            setSuccessMsg(`Appointment request sent to Dr. ${selectedDoctor.name}! They will confirm it shortly.`);
            setStep(3);
        } catch (err: any) {
            console.error('Booking failed:', err);
        } finally {
            setIsBooking(false);
        }
    };

    // Get minimum date (today)
    const today = new Date().toISOString().split('T')[0];

    if (!isConnected) return null;

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/patient" className="text-gray-500 hover:text-gray-300 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-black">Book Appointment</h1>
                        <p className="text-sm text-gray-600">Find a doctor and schedule a consultation</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map(s => (
                        <div key={s} className="flex-1 flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-800 text-gray-600 border border-gray-700'
                                }`}>
                                {s === 3 && step === 3 ? '✓' : s}
                            </div>
                            <span className={`text-xs font-medium ${step >= s ? 'text-indigo-300' : 'text-gray-600'}`}>
                                {s === 1 ? 'Select Doctor' : s === 2 ? 'Pick Time' : 'Confirmed'}
                            </span>
                            {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-indigo-500' : 'bg-gray-800'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Doctor Selection */}
                {step === 1 && (
                    <div className="space-y-4 animate-slide-up">
                        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Choose a Doctor</h2>
                        {isLoading ? (
                            <div className="glass-card p-12 text-center">
                                <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto mb-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                <p className="text-sm text-gray-600">Loading doctors...</p>
                            </div>
                        ) : doctors.length === 0 ? (
                            <div className="glass-card p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">🩺</span>
                                </div>
                                <h3 className="text-lg font-semibold text-black mb-2">No Doctors Available</h3>
                                <p className="text-sm text-gray-600">No doctors have registered their profiles yet.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {doctors.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                                        className={`glass-card p-6 cursor-pointer transition-all duration-300 hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:scale-[1.02] ${selectedDoctor?.id === doc.id ? 'border-cyan-500/50 bg-cyan-500/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-2xl shrink-0">
                                                🩺
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-semibold text-black">Dr. {doc.name}</h3>
                                                <p className="text-xs text-cyan-600 font-medium">{doc.specialty}</p>
                                                {doc.bio && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{doc.bio}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && selectedDoctor && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Selected doctor banner */}
                        <div className="glass-card p-4 flex items-center gap-3 border-cyan-500/20">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-xl">🩺</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-black">Dr. {selectedDoctor.name}</p>
                                <p className="text-xs text-cyan-600">{selectedDoctor.specialty}</p>
                            </div>
                            <button onClick={() => { setStep(1); setSelectedDoctor(null); setSelectedDate(''); setSelectedTime(''); }} className="text-xs text-gray-500 hover:text-gray-700">Change</button>
                        </div>

                        {/* Date picker */}
                        <div>
                            <label className="text-xs font-semibold text-black uppercase tracking-wider mb-2 block">Select Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                                min={today}
                                className="w-full bg-white border border-black rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-indigo-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            />
                        </div>

                        {/* Time slots */}
                        {selectedDate && (
                            <div>
                                <label className="text-xs font-semibold text-black uppercase tracking-wider mb-2 block">Select Time Slot</label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {timeSlots.map(slot => {
                                        const isBooked = bookedSlots.includes(slot);
                                        return (
                                            <button
                                                key={slot}
                                                onClick={() => !isBooked && setSelectedTime(slot)}
                                                disabled={isBooked}
                                                className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${isBooked
                                                    ? 'bg-gray-200 text-gray-500 border-gray-400 cursor-not-allowed line-through'
                                                    : selectedTime === slot
                                                        ? 'bg-black text-white border-black'
                                                        : 'bg-white text-black border-black hover:bg-gray-100'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        {selectedTime && (
                            <div>
                                <label className="text-xs font-semibold text-black uppercase tracking-wider mb-2 block">Reason for Visit (Optional)</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Brief description of your concern..."
                                    rows={3}
                                    className="w-full bg-white border border-black rounded-xl px-4 py-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                />
                            </div>
                        )}

                        {/* Book button */}
                        {selectedTime && (
                            <button
                                onClick={handleBook}
                                disabled={isBooking}
                                className="btn-primary w-full !py-4 text-base"
                            >
                                {isBooking ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Booking...
                                    </span>
                                ) : (
                                    `Request Appointment — ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedTime}`
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="glass-card p-12 text-center animate-slide-up">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">✅</span>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-3">Appointment Requested!</h2>
                        <p className="text-sm text-gray-600 max-w-md mx-auto mb-8">{successMsg}</p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/patient" className="btn-primary text-sm">
                                ← Back to Dashboard
                            </Link>
                            <button
                                onClick={() => { setStep(1); setSelectedDoctor(null); setSelectedDate(''); setSelectedTime(''); setReason(''); setSuccessMsg(''); }}
                                className="px-6 py-2.5 rounded-xl bg-white border-2 border-black text-black text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                            >
                                Book Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
