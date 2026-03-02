'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { getAllDoctors, getBookedSlots as fetchBookedSlots, createAppointment } from '@/lib/api';

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

    // Generate next 7 days for quick selection
    const quickDates = useMemo(() => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d);
        }
        return dates;
    }, []);

    useEffect(() => {
        if (!isConnected) { router.push('/'); return; }
        loadDoctors();
    }, [isConnected, specialtyFilter]);

    const loadDoctors = async () => {
        setIsLoading(true);
        try {
            const { success, doctors: data } = await getAllDoctors(specialtyFilter || undefined);

            if (success && data && data.length > 0) {
                setDoctors(data as DoctorProfile[]);
            } else {
                console.log("No doctors found, attempting fallback to shreeharsha...");
                const { success: fallbackSuccess, doctors: fallbackDocs } = await getAllDoctors('shreeharsha');

                if (fallbackSuccess && fallbackDocs && fallbackDocs.length > 0) {
                    setDoctors(fallbackDocs as DoctorProfile[]);
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
            const { success, booked_slots } = await fetchBookedSlots(doctorWallet, date);
            if (success && booked_slots) {
                setBookedSlots(booked_slots);
            }
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
            const { success } = await createAppointment({
                patient_wallet: address,
                doctor_wallet: selectedDoctor.wallet_address,
                date: selectedDate,
                time: selectedTime,
                reason: reason,
            });
            if (!success) throw new Error("Failed to create appointment");
            setSuccessMsg(`Your appointment with Dr. ${selectedDoctor.name} has been successfully requested. You will receive a confirmation shortly.`);
            setStep(3);
        } catch (err: any) {
            console.error('Booking failed:', err);
        } finally {
            setIsBooking(false);
        }
    };

    const getFormattedDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getFormattedDateString(new Date());

    if (!isConnected) return null;

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 bg-[#FAFAFA]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-5 mb-12">
                    <Link href="/patient" className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm bg-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Book Appointment</h1>
                        <p className="text-sm text-gray-500 mt-1">Schedule a consultation with a specialist</p>
                    </div>
                </div>

                {/* Modern Progress Steps */}
                <div className="flex items-center gap-3 mb-12">
                    {[
                        { num: 1, label: 'Doctor' },
                        { num: 2, label: 'Details' },
                        { num: 3, label: 'Confirm' }
                    ].map((s, i) => (
                        <div key={s.num} className="flex-1 flex items-center gap-3">
                            <div className={`flex flex-col ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>
                                <span className="text-xs font-medium uppercase tracking-wider mb-1">Step {s.num}</span>
                                <span className={`text-sm font-semibold ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>{s.label}</span>
                            </div>
                            {i < 2 && <div className={`flex-1 h-[2px] rounded-full ml-4 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Doctor Selection */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-xl font-semibold text-gray-900">Available Doctors</h2>
                        {isLoading ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-sm text-gray-500">Loading specialists...</p>
                            </div>
                        ) : doctors.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Doctors Found</h3>
                                <p className="text-sm text-gray-500">We couldn't find any doctors matching your criteria.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {doctors.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                                        className={`bg-white rounded-2xl border p-6 cursor-pointer transition-all duration-200 flex flex-col items-start ${selectedDoctor?.id === doc.id ? 'border-blue-600 ring-1 ring-blue-600 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                                {doc.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900">Dr. {doc.name}</h3>
                                                <p className="text-sm text-blue-600 font-medium">{doc.specialty}</p>
                                            </div>
                                        </div>
                                        {doc.bio ? (
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-6">{doc.bio}</p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic mb-6">No biography provided.</p>
                                        )}
                                        <button className={`mt-auto w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${selectedDoctor?.id === doc.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                                            Select Doctor
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && selectedDoctor && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Selected doctor banner */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                    {selectedDoctor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Selected Doctor</p>
                                    <p className="text-base font-semibold text-gray-900">Dr. {selectedDoctor.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setStep(1); setSelectedDoctor(null); setSelectedDate(''); setSelectedTime(''); }}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                                Change
                            </button>
                        </div>

                        {/* Quick Date Select */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Select Date</h3>
                                    <p className="text-sm text-gray-500">Choose an available day for your visit</p>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                                        min={todayStr}
                                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                                    />
                                    <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors relative z-0 bg-blue-50 px-3 py-1.5 rounded-lg">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        Custom Date
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {quickDates.map((d, i) => {
                                    const dateStr = getFormattedDateString(d);
                                    const isSelected = selectedDate === dateStr;
                                    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const dayNum = d.getDate();
                                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                                            className={`flex flex-col items-center justify-center min-w-[4.5rem] py-3 px-4 rounded-xl border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                                                }`}
                                        >
                                            <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{dayName}</span>
                                            <span className="text-xl font-semibold mb-0.5">{dayNum}</span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{monthName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time slots */}
                        {selectedDate && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in">
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Available Times</h3>
                                    <p className="text-sm text-gray-500">
                                        For {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {timeSlots.map(slot => {
                                        const isBooked = bookedSlots.includes(slot);
                                        return (
                                            <button
                                                key={slot}
                                                onClick={() => !isBooked && setSelectedTime(slot)}
                                                disabled={isBooked}
                                                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${isBooked
                                                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                                                    : selectedTime === slot
                                                        ? 'bg-blue-600 text-white shadow-md border border-blue-600'
                                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
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
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes <span className="text-gray-400 text-sm font-normal">(Optional)</span></h3>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Briefly describe your symptoms or reason for visit..."
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                        )}

                        {/* Book button */}
                        {selectedTime && (
                            <div className="pt-4 animate-fade-in">
                                <button
                                    onClick={handleBook}
                                    disabled={isBooking}
                                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isBooking ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                            Confirming...
                                        </>
                                    ) : (
                                        'Confirm Appointment'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm max-w-2xl mx-auto animate-fade-in">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                            Appointment Requested
                        </h2>
                        <p className="text-base text-gray-500 mb-8 max-w-md mx-auto">
                            {successMsg}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/patient" className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                                Return to Dashboard
                            </Link>
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setSelectedDoctor(null);
                                    setSelectedDate('');
                                    setSelectedTime('');
                                    setReason('');
                                    setSuccessMsg('');
                                }}
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Book Another
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
