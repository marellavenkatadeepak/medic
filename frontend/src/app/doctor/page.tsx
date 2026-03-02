'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import {
    getDoctorProfile,
    upsertDoctorProfile,
    getDoctorGrants,
    getDoctorAppointments,
    updateDoctorAppointmentStatus,
    getConsultationNotes,
    addConsultationNote
} from '@/lib/api';
import RiskScore from '@/components/RiskScore';
import MedicalDisclaimer from '@/components/MedicalDisclaimer';

interface GrantedRecord {
    id: string;
    patient_wallet: string;
    analysis_id: string;
    granted_at: string;
    analysis?: {
        id: string;
        file_name: string;
        summary: string;
        risk_score: number;
        conditions: string[];
        specialist: string;
        urgency: string;
        created_at: string;
        improvement_plan?: string[];
    };
}

interface Appointment {
    id: string;
    patient_wallet: string;
    doctor_wallet: string;
    date: string;
    time: string;
    status: string;
    reason: string;
    notes: string;
    meeting_link?: string;
}

interface ConsultationNote {
    id: string;
    doctor_wallet: string;
    patient_wallet: string;
    analysis_id: string;
    note: string;
    created_at: string;
}

interface DoctorProfile {
    id: string;
    wallet_address: string;
    name: string;
    specialty: string;
    bio: string;
    google_calendar_connected?: boolean;
}

export default function DoctorDashboard() {
    const router = useRouter();
    const { address, isConnected, isConnecting, connect, signer } = useWallet();
    const { registerUser, getUserRole } = useContract();

    const [grants, setGrants] = useState<GrantedRecord[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [selectedGrant, setSelectedGrant] = useState<GrantedRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'profile'>('patients');

    // Profile state
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [profileForm, setProfileForm] = useState({ name: '', specialty: '', bio: '' });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Consultation note state
    const [consultNote, setConsultNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [consultNotes, setConsultNotes] = useState<ConsultationNote[]>([]);

    const checkRegistration = async () => {
        try {
            const role = await getUserRole();
            setIsRegistered(role === 2); // 2 = Doctor
        } catch {
            setIsRegistered(false);
        }
    };

    useEffect(() => {
        if (!isConnected) {
            setIsLoading(false);
            return;
        }
        loadProfile();
        loadGrantedRecords();
        loadAppointments();
        checkRegistration();
    }, [isConnected, address]);

    const handleRegister = async () => {
        if (!address) return;
        setIsRegistering(true);
        try {
            const tx = await registerUser(2);
            await upsertDoctorProfile(address, {
                name: 'Dr. New Doctor',
                specialty: 'General Practice',
                bio: '',
            });

            await loadProfile();
            setIsRegistered(true);
            setActiveTab('profile');
        } catch (err: any) {
            console.error('Registration failed:', err);
            alert(`Registration failed: ${err.message || 'Check console details'}`);
        } finally {
            setIsRegistering(false);
        }
    };

    const loadProfile = async () => {
        if (!address) return;
        try {
            const { success, profiles: data } = await getDoctorProfile(address);
            if (success && data && data.length > 0) {
                setProfile(data[0] as DoctorProfile);
                setProfileForm({ name: data[0].name, specialty: data[0].specialty, bio: data[0].bio || '' });
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    };

    const saveProfile = async () => {
        if (!address) return;
        if (!isRegistered) {
            alert("Please click 'Complete Profile' at the top of the page first!");
            return;
        }

        setIsSavingProfile(true);
        try {
            await upsertDoctorProfile(address, {
                name: profileForm.name,
                specialty: profileForm.specialty,
                bio: profileForm.bio
            });
            await loadProfile();
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const loadGrantedRecords = async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const { success, grants: accessData } = await getDoctorGrants(address);

            if (success && accessData && accessData.length > 0) {
                setGrants(accessData);
                if (accessData.length > 0) setSelectedGrant(accessData[0]);
            } else {
                setGrants([]);
                setSelectedGrant(null);
            }
        } catch (err) {
            console.error('Failed to load records:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAppointments = async () => {
        if (!address) return;
        try {
            const { success, appointments: data } = await getDoctorAppointments(address);
            if (success && data) setAppointments(data as Appointment[]);
        } catch (err) {
            console.error('Failed to load appointments:', err);
        }
    };

    const loadConsultNotes = async (patientWallet: string) => {
        if (!address) return;
        try {
            const { success, notes: data } = await getConsultationNotes(address, patientWallet);
            if (success && data) setConsultNotes(data as ConsultationNote[]);
        } catch (err) {
            console.error('Failed to load notes:', err);
        }
    };

    const saveConsultNote = async () => {
        if (!address || !selectedGrant || !consultNote.trim()) return;
        setIsSavingNote(true);
        try {
            await addConsultationNote(address, {
                patient_wallet: selectedGrant.patient_wallet,
                analysis_id: selectedGrant.analysis_id,
                note: consultNote.trim(),
            });
            setConsultNote('');
            await loadConsultNotes(selectedGrant.patient_wallet);
        } catch (err) {
            console.error('Failed to save note:', err);
        } finally {
            setIsSavingNote(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (code && state) {
            handleCalendarCallback(code, state);
        }
    }, []);

    const handleCalendarCallback = async (code: string, wallet: string) => {
        window.history.replaceState({}, '', '/doctor');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/integrations/calendar/callback?code=${code}&state=${wallet}`);
            if (!res.ok) throw new Error('Failed to exchange code');
            await loadProfile();
        } catch (err) {
            console.error('Calendar callback error:', err);
        }
    };

    const updateAppointmentStatus = async (appointmentId: string, status: string) => {
        try {
            await updateDoctorAppointmentStatus(appointmentId, status);

            if (status === 'confirmed' && profile?.google_calendar_connected) {
                const apt = appointments.find(a => a.id === appointmentId);
                if (apt) {
                    try {
                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                        const res = await fetch(`${apiUrl}/api/integrations/calendar/create`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                appointment_id: apt.id,
                                doctor_wallet: address,
                                patient_wallet: apt.patient_wallet,
                                date: apt.date,
                                time: apt.time,
                                reason: apt.reason,
                            }),
                        });
                        const result = await res.json();
                        if (result.meeting_link) {
                            console.log('Google Meet link created:', result.meeting_link);
                        }
                    } catch (calErr) {
                        console.warn('Calendar event creation skipped:', calErr);
                    }
                }
            }
            await loadAppointments();
        } catch (err) {
            console.error('Failed to update appointment:', err);
        }
    };

    useEffect(() => {
        if (selectedGrant) loadConsultNotes(selectedGrant.patient_wallet);
    }, [selectedGrant]);

    if (!isConnected) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-6 font-sans bg-[#FAFAFA]">
                <div className="max-w-md mx-auto text-center mt-12">
                    <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                        </div>
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">Healthcare Portal</h2>
                        <p className="text-sm text-gray-500 font-medium mb-8">Access patient records securely via blockchain, manage cross-facility appointments, and write clinical notes.</p>
                        <button onClick={connect} disabled={isConnecting} className="w-full bg-blue-600 text-white rounded-xl px-6 py-3.5 font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            {isConnecting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Connecting...
                                </>
                            ) : (
                                <>Connect Wallet</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const urgencyColors: Record<string, string> = {
        low: 'bg-green-50 text-green-700 border-green-200',
        medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        high: 'bg-orange-50 text-orange-700 border-orange-200',
        critical: 'bg-red-50 text-red-700 border-red-200',
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
        completed: 'bg-gray-50 text-gray-700 border-slate-300',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 relative bg-[#FAFAFA]">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight mb-2">
                            {profile?.name ? `Dr. ${profile.name.replace('Dr. ', '')}` : 'Clinical'} <span className="text-blue-600">Dashboard</span>
                        </h1>
                        <p className="text-base text-gray-500 font-medium">
                            {profile?.specialty || 'Manage your patients, appointments, and medical records'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isRegistered && signer && (
                            <button onClick={handleRegister} disabled={isRegistering} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm">
                                {isRegistering ? 'Registering...' : 'Complete Profile'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                    {[
                        { label: 'Active Patients', value: grants.length, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
                        { label: "Today's Appts", value: todayAppointments.length, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
                        { label: 'Requires Action', value: pendingAppointments.length, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> },
                        { label: 'Clinical Notes', value: consultNotes.length, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-blue-50' : i === 1 ? 'bg-indigo-50' : i === 2 ? 'bg-amber-50' : 'bg-emerald-50'
                                }`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{stat.value}</p>
                                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tab bar */}
                <div className="flex gap-2 overflow-x-auto pb-6 border-b border-slate-300 mb-8">
                    {(['patients', 'appointments', 'profile'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-500 hover:text-gray-900 border border-slate-300'
                                }`}
                        >
                            {tab === 'patients' ? 'Patient Records' : tab === 'appointments' ? 'Schedule & Appts' : 'Provider Profile'}
                        </button>
                    ))}
                </div>

                {/* ==================== PATIENTS TAB ==================== */}
                {activeTab === 'patients' && (
                    <div className="grid lg:grid-cols-[1fr_2.5fr] gap-8 items-start">
                        {/* Records list (Sidebar) */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
                            <div className="bg-gray-50/80 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
                                <h3 className="font-semibold text-gray-900 text-sm tracking-wide">Shared Records</h3>
                                <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{grants.length}</div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                {isLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mb-3"></div>
                                        <p className="text-sm font-medium text-gray-500">Decrypting records...</p>
                                    </div>
                                ) : grants.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                        <div className="w-12 h-12 rounded-full bg-gray-50 border border-slate-300 flex items-center justify-center mb-3">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mb-1">No patient records</p>
                                        <p className="text-xs text-gray-500">Patients need to grant you access first.</p>
                                    </div>
                                ) : (
                                    grants.map(g => (
                                        <div
                                            key={g.id}
                                            onClick={() => setSelectedGrant(g)}
                                            className={`group relative cursor-pointer p-4 rounded-2xl transition-all border ${selectedGrant?.id === g.id
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-white border-transparent hover:border-slate-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                                <h3 className={`font-semibold text-sm truncate pr-2 ${selectedGrant?.id === g.id ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {g.analysis?.file_name.replace(/\.[^/.]+$/, "") || 'Medical Document'}
                                                </h3>
                                                {g.analysis && (
                                                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${selectedGrant?.id === g.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-slate-300'
                                                        }`}>
                                                        RS: {g.analysis.risk_score}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <p className="text-[11px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {g.patient_wallet?.slice(0, 6)}...{g.patient_wallet?.slice(-4)}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                                <span>Granted {new Date(g.granted_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Detail panel */}
                        <div className="h-full">
                            {selectedGrant?.analysis ? (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Main Analysis Header Card */}
                                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                                        {selectedGrant.analysis.file_name}
                                                    </h1>
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${selectedGrant.analysis.urgency === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        selectedGrant.analysis.urgency === 'high' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                            selectedGrant.analysis.urgency === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                                'bg-green-50 text-green-600 border-green-200'
                                                        }`}>
                                                        {selectedGrant.analysis.urgency}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Patient Wallet: <span className="font-mono bg-gray-50 border border-slate-200 px-1.5 py-0.5 rounded text-gray-600">{selectedGrant.patient_wallet.slice(0, 8)}...{selectedGrant.patient_wallet.slice(-4)}</span>
                                                    </span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span>Uploaded {new Date(selectedGrant.analysis.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex bg-gray-50/50 rounded-2xl p-4 border border-slate-200 items-center gap-4 min-w-[200px]">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Risk Score</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-bold text-gray-900 tracking-tight">{selectedGrant.analysis.risk_score}</span>
                                                        <span className="text-sm font-medium text-gray-400">/ 100</span>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <RiskScore score={selectedGrant.analysis.risk_score} size="xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body Grid */}
                                    <div className="grid lg:grid-cols-3 gap-6">
                                        {/* Left Col: Summary & Specs */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Summary */}
                                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900">AI Executive Summary</h3>
                                                </div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                    {selectedGrant.analysis.summary}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 mt-1">Specialist Ref</p>
                                                        <p className="text-base font-semibold text-gray-900">
                                                            {selectedGrant.analysis.specialist}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 mt-1">Conditions</p>
                                                        <p className="text-xl font-bold text-gray-900 leading-none mt-1">
                                                            {selectedGrant.analysis.conditions?.length || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Improvement Plan (Conditional or Fallback) */}
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-3xl p-6 shadow-sm border border-green-100 mt-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                            </svg>
                                                        </div>
                                                        <h3 className="text-sm font-semibold text-gray-900 tracking-wide">Health Recommendations</h3>
                                                    </div>
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">Action Plan</span>
                                                </div>
                                                <ul className="space-y-3">
                                                    {selectedGrant.analysis.improvement_plan && selectedGrant.analysis.improvement_plan.length > 0 ? (
                                                        selectedGrant.analysis.improvement_plan.map((step, idx) => (
                                                            <li key={idx} className="flex items-start gap-3">
                                                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-[10px] font-bold mt-0.5">{idx + 1}</div>
                                                                <span className="text-sm text-gray-700 font-medium leading-relaxed">{step}</span>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="flex items-start gap-3">
                                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                                                            <span className="text-sm text-gray-700 font-medium leading-relaxed">Please consult a healthcare professional for a tailored improvement plan based on this analysis.</span>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Right Col: Conditions List */}
                                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
                                            <div className="flex items-center justify-between mb-5">
                                                <h3 className="text-sm font-semibold text-gray-900 tracking-wide">Indicators</h3>
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-semibold border border-slate-300">
                                                    {selectedGrant.analysis.conditions?.length || 0}
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                                {selectedGrant.analysis.conditions?.map((c, i) => (
                                                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-slate-200 rounded-xl">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                                        <span className="text-sm font-medium text-gray-800 leading-snug">{c}</span>
                                                    </div>
                                                ))}
                                                {(!selectedGrant.analysis.conditions || selectedGrant.analysis.conditions.length === 0) && (
                                                    <div className="text-center py-10 opacity-60">
                                                        <p className="text-sm text-gray-500 font-medium">No conditions isolated.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Consultation Notes Section */}
                                    <div className="bg-white p-8 border border-slate-200 rounded-3xl shadow-sm mt-8">
                                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Clinical Observations</h3>
                                                    <p className="text-xs text-gray-500">Add secure, private notes to this patient record</p>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 font-medium">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                Encrypted Note
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                            <textarea
                                                value={consultNote}
                                                onChange={e => setConsultNote(e.target.value)}
                                                placeholder="Document your clinical findings, next steps, or medication adjustments..."
                                                rows={3}
                                                className="flex-1 bg-gray-50 border border-slate-300 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                            />
                                            <button
                                                onClick={saveConsultNote}
                                                disabled={isSavingNote || !consultNote.trim()}
                                                className="px-6 py-4 self-end sm:self-stretch font-semibold text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 min-w-[140px]"
                                            >
                                                {isSavingNote ? 'Saving...' : 'Save Record'}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {consultNotes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-slate-200">
                                                    <p className="text-sm font-medium">No clinical notes recorded yet.</p>
                                                </div>
                                            ) : (
                                                consultNotes.map(n => (
                                                    <div key={n.id} className="bg-gray-50 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-5">
                                                        <div className="sm:w-32 shrink-0 sm:border-r border-slate-300 pr-4">
                                                            <div className="text-xs font-semibold text-gray-700 mb-0.5">
                                                                {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[10px] font-medium text-gray-500">
                                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 font-medium leading-relaxed flex-1 whitespace-pre-wrap">
                                                            {n.note}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl h-full min-h-[500px] flex items-center justify-center border border-slate-200 shadow-sm p-6 text-center">
                                    <div>
                                        <div className="w-20 h-20 bg-gray-50 rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-5">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Record Selected</h3>
                                        <p className="text-sm font-medium text-gray-500 max-w-[250px] mx-auto">Select a patient file from the sidebar to view their AI analysis and history.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== APPOINTMENTS TAB ==================== */}
                {activeTab === 'appointments' && (
                    <div className="space-y-8 animate-fade-in max-w-5xl">
                        {/* Pending appointments */}
                        {pendingAppointments.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 tracking-wide mb-4">Pending Approval Requests</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {pendingAppointments.map(apt => (
                                        <div key={apt.id} className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400"></div>
                                            <div className="flex items-start justify-between mb-4 pl-2">
                                                <div>
                                                    <p className="text-base font-semibold text-gray-900 leading-tight">
                                                        {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-sm font-medium text-gray-500 mt-0.5">{apt.time}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusColors.pending}`}>NEEDS REVIEW</span>
                                            </div>

                                            <div className="pl-2 mb-4">
                                                <div className="text-xs bg-gray-50 border border-slate-200 rounded-lg p-3">
                                                    <p className="text-gray-500 font-medium mb-1 truncate"><span className="text-gray-400">Patient:</span> {apt.patient_wallet}</p>
                                                    {apt.reason && <p className="text-gray-700 font-medium"><span className="text-gray-400">Reason:</span> {apt.reason}</p>}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pl-2 border-t border-slate-200 pt-4">
                                                <button
                                                    onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                                                    className="flex-1 px-3 py-2.5 rounded-xl bg-blue-600 border border-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    Confirm Booking
                                                </button>
                                                <button
                                                    onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                                    className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-slate-300 text-gray-600 text-sm font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All appointments */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 tracking-wide">Scheduled Schedule</h2>
                                <div className="text-xs font-semibold text-gray-500 bg-white border border-slate-300 px-3 py-1 rounded-full">{appointments.length} total</div>
                            </div>

                            {appointments.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    </div>
                                    <p className="text-base font-semibold text-gray-900 mb-1">Your schedule is clear</p>
                                    <p className="text-sm text-gray-500">Patients will appear here once they request a booking.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {appointments.map(apt => (
                                        <div key={apt.id} className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                                    {apt.time.split(':')[0]}<span className="text-[10px] font-medium ml-0.5 opacity-70">HH</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {apt.time}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {apt.patient_wallet?.slice(0, 6)}...
                                                        </span>
                                                        {apt.reason && <span className="text-xs font-medium text-gray-500 truncate max-w-[200px] border-l border-slate-300 pl-2">
                                                            {apt.reason}
                                                        </span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center sm:flex-col sm:items-end flex-wrap gap-2 pt-3 border-t sm:border-0 sm:pt-0 border-slate-200">
                                                <div className="flex items-center gap-2 mb-1 w-full sm:w-auto justify-between sm:justify-end">
                                                    {apt.meeting_link && (
                                                        <a href={apt.meeting_link} target="_blank" rel="noreferrer" className="text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                            Meet
                                                        </a>
                                                    )}
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusColors[apt.status] || statusColors.pending}`}>
                                                        {apt.status.toUpperCase()}
                                                    </span>
                                                </div>

                                                {apt.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                                        className="text-xs font-medium text-green-700 hover:text-green-800 transition-colors bg-green-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-green-200 w-full sm:w-auto text-center"
                                                    >
                                                        Mark Completed
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== PROFILE TAB ==================== */}
                {activeTab === 'profile' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-2xl shrink-0">
                                    👨‍⚕️
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Provider Settings</h2>
                                    <p className="text-sm text-gray-500 font-medium">This information is visible to patients when booking appointments.</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Full Professional Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Dr. John Smith"
                                        className="w-full bg-gray-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Primary Specialty</label>
                                    <select
                                        value={profileForm.specialty}
                                        onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))}
                                        className="w-full bg-gray-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                                    >
                                        <option value="General Practice">General Practice</option>
                                        <option value="Cardiology">Cardiology</option>
                                        <option value="Neurology">Neurology</option>
                                        <option value="Orthopedics">Orthopedics</option>
                                        <option value="Dermatology">Dermatology</option>
                                        <option value="Oncology">Oncology</option>
                                        <option value="Pediatrics">Pediatrics</option>
                                        <option value="Psychiatry">Psychiatry</option>
                                        <option value="Radiology">Radiology</option>
                                        <option value="Surgery">Surgery</option>
                                        <option value="Endocrinology">Endocrinology</option>
                                        <option value="Pulmonology">Pulmonology</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Professional Bio</label>
                                    <textarea
                                        value={profileForm.bio}
                                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                                        placeholder="Brief description about your practice philosophy, experience, and background..."
                                        rows={4}
                                        className="w-full bg-gray-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                    />
                                </div>
                                <div className="bg-gray-50 border border-slate-300 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-700 mb-0.5">Connected Wallet</h4>
                                        <p className="text-xs text-gray-500 font-mono break-all">{address}</p>
                                    </div>
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-sm ml-4">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <button
                                    onClick={saveProfile}
                                    disabled={isSavingProfile || !profileForm.name}
                                    className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSavingProfile ? 'Saving Changes...' : profile ? 'Save Profile Settings' : 'Create Profile'}
                                </button>
                            </div>

                            {/* Google Calendar Connection */}
                            <div className="mt-6 bg-white border border-slate-300 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">Google Calendar Sync</h4>
                                            <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-sm">Automatically generate Google Meet links when confirming patient appointments.</p>
                                        </div>
                                    </div>
                                    {profile?.google_calendar_connected ? (
                                        <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold shrink-0">
                                            ✓ Synced
                                        </span>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/calendar/auth?wallet=${address}`);
                                                    const { url } = await res.json();
                                                    if (url) window.location.href = url;
                                                } catch (err) {
                                                    console.error('Failed to start calendar auth:', err);
                                                }
                                            }}
                                            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm shrink-0"
                                        >
                                            Connect Calendar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <MedicalDisclaimer />
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #E5E7EB;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #D1D5DB;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
