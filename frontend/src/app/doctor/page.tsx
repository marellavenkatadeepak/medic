'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { insforge } from '@/lib/insforge';
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
            // 1. Register on Blockchain FIRST (The "Trust" Layer)
            // Role 2 = Doctor
            console.log("Registering on blockchain...");
            const tx = await registerUser(2);
            console.log("Blockchain tx sent:", tx.hash);

            // 2. If Blockchain succeeds, save profile to Database (The "UI" Layer)
            await insforge.database
                .from('doctor_profiles')
                .insert([{
                    wallet_address: address,
                    name: 'Dr. New Doctor',
                    specialty: 'General Practice',
                    bio: '',
                }]);

            await loadProfile();
            setIsRegistered(true);
            // Switch to profile tab so they can fill in details
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
        const { data } = await insforge.database
            .from('doctor_profiles')
            .select()
            .eq('wallet_address', address)
            .limit(1);
        if (data && data.length > 0) {
            setProfile(data[0] as DoctorProfile);
            setProfileForm({ name: data[0].name, specialty: data[0].specialty, bio: data[0].bio || '' });
        }
    };

    const saveProfile = async () => {
        if (!address) return;

        if (!isRegistered) {
            alert("Please click 'Register as Doctor' at the top of the page first!");
            return;
        }

        setIsSavingProfile(true);
        try {
            if (profile) {
                await insforge.database
                    .from('doctor_profiles')
                    .update({ name: profileForm.name, specialty: profileForm.specialty, bio: profileForm.bio, updated_at: new Date().toISOString() })
                    .eq('wallet_address', address);
            } else {
                await insforge.database
                    .from('doctor_profiles')
                    .insert([{ wallet_address: address, name: profileForm.name, specialty: profileForm.specialty, bio: profileForm.bio }]);
            }
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
            const { data: accessData } = await insforge.database
                .from('access_grants')
                .select()
                .eq('doctor_wallet', address)
                .eq('is_active', true)
                .order('granted_at', { ascending: false });

            if (accessData && accessData.length > 0) {
                const analysisIds = accessData.map((g: any) => g.analysis_id).filter(Boolean);
                let analysesMap: Record<string, any> = {};
                if (analysisIds.length > 0) {
                    const { data: analyses } = await insforge.database.from('analyses').select().in('id', analysisIds);
                    if (analyses) analyses.forEach((a: any) => { analysesMap[a.id] = a; });
                }
                const enrichedGrants = accessData.map((g: any) => ({ ...g, analysis: analysesMap[g.analysis_id] || null }));
                setGrants(enrichedGrants);
                if (enrichedGrants.length > 0) setSelectedGrant(enrichedGrants[0]);
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
            const { data } = await insforge.database
                .from('appointments')
                .select()
                .eq('doctor_wallet', address)
                .order('date', { ascending: true });
            if (data) setAppointments(data as Appointment[]);
        } catch (err) {
            console.error('Failed to load appointments:', err);
        }
    };

    const loadConsultNotes = async (patientWallet: string) => {
        if (!address) return;
        try {
            const { data } = await insforge.database
                .from('consultation_notes')
                .select()
                .eq('doctor_wallet', address)
                .eq('patient_wallet', patientWallet)
                .order('created_at', { ascending: false });
            if (data) setConsultNotes(data as ConsultationNote[]);
        } catch (err) {
            console.error('Failed to load notes:', err);
        }
    };

    const saveConsultNote = async () => {
        if (!address || !selectedGrant || !consultNote.trim()) return;
        setIsSavingNote(true);
        try {
            await insforge.database
                .from('consultation_notes')
                .insert([{
                    doctor_wallet: address,
                    patient_wallet: selectedGrant.patient_wallet,
                    analysis_id: selectedGrant.analysis_id,
                    note: consultNote.trim(),
                }]);
            setConsultNote('');
            await loadConsultNotes(selectedGrant.patient_wallet);
        } catch (err) {
            console.error('Failed to save note:', err);
        } finally {
            setIsSavingNote(false);
        }
    };

    // Handle Google Calendar Callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state'); // wallet address returned by Google

        if (code && state) {
            handleCalendarCallback(code, state);
        }
    }, []);

    const handleCalendarCallback = async (code: string, wallet: string) => {
        // Optimistically clear URL to avoid re-triggering
        window.history.replaceState({}, '', '/doctor');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_INSFORGE_BASE_URL}/functions/v1/calendar-callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY}`
                },
                body: JSON.stringify({ code, wallet })
            });

            if (!res.ok) throw new Error('Failed to exchange code');

            await loadProfile();
            // Optional: Success toast
        } catch (err) {
            console.error('Calendar callback error:', err);
        }
    };

    const updateAppointmentStatus = async (appointmentId: string, status: string) => {
        try {
            await insforge.database
                .from('appointments')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', appointmentId);

            // If confirming, try to create a Google Calendar event
            if (status === 'confirmed' && profile?.google_calendar_connected) {
                const apt = appointments.find(a => a.id === appointmentId);
                if (apt) {
                    try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_INSFORGE_BASE_URL}/functions/v1/calendar-create`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY}`
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


    // When a patient record is selected, load consultation notes
    useEffect(() => {
        if (selectedGrant) loadConsultNotes(selectedGrant.patient_wallet);
    }, [selectedGrant]);

    if (!isConnected) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-6">
                <div className="max-w-md mx-auto text-center">
                    <div className="glass-card p-10 space-y-5">
                        <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-4xl">🩺</div>
                        <h2 className="text-2xl font-bold text-black">Doctor Dashboard</h2>
                        <p className="text-sm text-gray-600">Connect your wallet to access your dashboard, view patient records, and manage appointments.</p>
                        <button onClick={connect} disabled={isConnecting} className="btn-primary !py-3 !px-8 w-full">
                            {isConnecting ? 'Connecting...' : '🦊 Connect MetaMask'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const urgencyColors: Record<string, string> = {
        low: 'bg-green-500/10 text-green-700 border-green-500/20',
        medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        critical: 'bg-red-500/10 text-red-700 border-red-500/20',
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
        confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        completed: 'bg-green-500/10 text-green-700 border-green-500/20',
        cancelled: 'bg-red-500/10 text-red-700 border-red-500/20',
    };

    const pendingAppointments = appointments.filter(a => a.status === 'pending');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 relative">
            {/* Grid Background */}
            <div className="fixed inset-0 z-[-1] opacity-30 pointer-events-none">
                <Image
                    src="https://cdn.prod.website-files.com/68c8e57d6e512b9573db146f/68e7b2dcdd75a7584b6cc8fa_newsletter%20grid.svg"
                    alt="Grid Background"
                    fill
                    className="object-cover"
                />
            </div>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-black">
                            {profile ? `Dr. ${profile.name}` : 'Doctor Dashboard'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {profile?.specialty || 'Manage patients, appointments, and records'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isRegistered && signer && (
                            <button onClick={handleRegister} disabled={isRegistering} className="btn-primary text-sm">
                                {isRegistering ? 'Registering...' : 'Register as Doctor'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Patients', value: grants.length, icon: '👥' },
                        { label: "Today's Appointments", value: todayAppointments.length, icon: '📅' },
                        { label: 'Pending Requests', value: pendingAppointments.length, icon: '⏳' },
                        { label: 'Notes Written', value: consultNotes.length, icon: '📝' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{stat.icon}</span>
                                <div>
                                    <p className="text-xl font-bold text-black">{stat.value}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-xl mb-6">
                    {(['patients', 'appointments', 'profile'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-indigo-500/20 text-indigo-700 border border-indigo-500/30'
                                : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            {tab === 'patients' ? '👥 Patient Records' : tab === 'appointments' ? '📅 Appointments' : '⚙️ Profile'}
                        </button>
                    ))}
                </div>

                {/* ==================== PATIENTS TAB ==================== */}
                {activeTab === 'patients' && (
                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* Records list (Sidebar) */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                                    <span>📂</span> Patient Records
                                </h2>
                                <span className="bg-black text-white text-xs font-bold px-2 py-0.5">{grants.length}</span>
                            </div>

                            <div className="space-y-0 border-2 border-black bg-white max-h-[700px] overflow-y-auto custom-scrollbar shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                {isLoading ? (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                                        <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Loading...</p>
                                    </div>
                                ) : grants.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                                        <p className="text-sm font-bold text-gray-500">No records yet.</p>
                                        <p className="text-xs text-gray-400 mt-1">Wait for patients to grant access.</p>
                                    </div>
                                ) : (
                                    grants.map(g => (
                                        <div
                                            key={g.id}
                                            onClick={() => setSelectedGrant(g)}
                                            className={`p-3 cursor-pointer transition-all border-b-2 last:border-b-0 relative group ${selectedGrant?.id === g.id
                                                ? 'bg-black text-white border-black shadow-[inset_4px_0px_0px_0px_rgba(255,255,255,1)]'
                                                : 'bg-white border-black text-black hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-bold truncate pr-2 ${selectedGrant?.id === g.id ? 'text-white' : 'text-black'}`}>
                                                    {g.analysis?.file_name || 'Medical Record'}
                                                </h3>
                                                {g.analysis && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${selectedGrant?.id === g.id ? 'border-white text-white' : 'border-black text-black'
                                                        }`}>
                                                        {g.analysis.risk_score}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] font-mono mb-2 ${selectedGrant?.id === g.id ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {g.patient_wallet?.slice(0, 6)}...{g.patient_wallet?.slice(-4)}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] uppercase tracking-wider ${selectedGrant?.id === g.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(g.granted_at).toLocaleDateString()}
                                                </span>
                                                {selectedGrant?.id === g.id && <span className="text-xs">👉</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Detail panel */}
                        <div className="lg:col-span-8">
                            {selectedGrant?.analysis ? (
                                <div className="space-y-6 animate-fadeIn">
                                    {/* Main Analysis Card */}
                                    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                                        {selectedGrant.analysis.file_name}
                                                    </h1>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedGrant.analysis.urgency === 'critical' ? 'bg-red-50 text-red-600 border border-red-200' :
                                                        selectedGrant.analysis.urgency === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                                            selectedGrant.analysis.urgency === 'medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                                                                'bg-green-50 text-green-600 border border-green-200'
                                                        }`}>
                                                        {selectedGrant.analysis.urgency} Priority
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm font-medium text-gray-500 mb-2">
                                                    <span className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Patient: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600">{selectedGrant.patient_wallet.slice(0, 8)}...{selectedGrant.patient_wallet.slice(-4)}</span>
                                                    </span>
                                                    <span>•</span>
                                                    <span>📅 {new Date(selectedGrant.analysis.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex bg-gray-50/50 rounded-2xl p-6 border border-gray-100 items-center gap-6 min-w-[200px] justify-center shadow-inner">
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Risk Score</p>
                                                    <div className="flex items-baseline justify-center gap-1">
                                                        <span className="text-5xl font-black text-gray-900 tracking-tighter">{selectedGrant.analysis.risk_score}</span>
                                                        <span className="text-sm font-medium text-gray-400">/ 100</span>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <RiskScore score={selectedGrant.analysis.risk_score} size="md" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        {/* Left Col: Summary & Specs */}
                                        <div className="lg:col-span-2 space-y-8">
                                            {/* Summary */}
                                            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900">AI Exec Summary</h3>
                                                </div>
                                                <p className="text-base text-gray-600 leading-relaxed font-medium">
                                                    {selectedGrant.analysis.summary}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl p-6 border border-blue-100/50 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                                                        <span className="text-8xl">👨‍⚕️</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 relative z-10">Recommended Specialist</p>
                                                    <p className="text-xl font-bold text-gray-900 relative z-10">
                                                        {selectedGrant.analysis.specialist}
                                                    </p>
                                                </div>

                                                <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/30 rounded-2xl p-6 border border-purple-100/50 relative overflow-hidden group">
                                                    <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                                        <span className="text-8xl">🔬</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2 relative z-10">Detected Conditions</p>
                                                    <p className="text-4xl font-black text-gray-900 relative z-10">
                                                        {selectedGrant.analysis.conditions?.length || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Col: Conditions List */}
                                        <div className="lg:col-span-1">
                                            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 h-full">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conditions</h3>
                                                    <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-xs font-bold">{selectedGrant.analysis.conditions?.length || 0}</span>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    {selectedGrant.analysis.conditions?.map((c, i) => (
                                                        <div key={i} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all cursor-default">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform"></div>
                                                            <span className="text-sm font-semibold text-gray-700">{c}</span>
                                                        </div>
                                                    ))}
                                                    {(!selectedGrant.analysis.conditions || selectedGrant.analysis.conditions.length === 0) && (
                                                        <div className="text-center py-8">
                                                            <p className="text-sm text-gray-400 font-medium italic">No specific conditions detected.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Consultation Notes Section */}
                                    <div className="bg-gradient-to-b from-yellow-50/50 to-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-yellow-100/50 mt-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                                        <div className="flex items-center justify-between mb-8 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
                                                    <span className="text-lg">📝</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                                    Doctor's Clinical Notes
                                                </h3>
                                            </div>
                                            <span className="text-[10px] bg-yellow-100 border border-yellow-200 px-3 py-1 rounded-full text-yellow-800 font-bold uppercase tracking-widest hidden sm:inline-block shadow-sm">
                                                Private & Encrypted
                                            </span>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 mb-8 relative z-10">
                                            <textarea
                                                value={consultNote}
                                                onChange={e => setConsultNote(e.target.value)}
                                                placeholder="Write your clinical observations or treatment plan here..."
                                                rows={2}
                                                className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all shadow-sm resize-none"
                                            />
                                            <button
                                                onClick={saveConsultNote}
                                                disabled={isSavingNote || !consultNote.trim()}
                                                className="px-8 py-4 self-end sm:self-stretch rounded-2xl font-bold uppercase tracking-wider text-xs bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-w-[140px]"
                                            >
                                                {isSavingNote ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Saving
                                                    </span>
                                                ) : (
                                                    <><span>Save Note</span> <span className="text-sm">→</span></>
                                                )}
                                            </button>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            {consultNotes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                                    <svg className="w-8 h-8 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    <p className="text-sm font-medium">No clinical notes added yet.</p>
                                                </div>
                                            ) : (
                                                consultNotes.map(n => (
                                                    <div key={n.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5 hover:shadow-md transition-shadow">
                                                        <div className="sm:w-32 shrink-0">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 inline-block px-2 py-1 rounded-md mb-1">
                                                                {new Date(n.created_at).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-gray-400 pl-1">
                                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex-1">
                                                            {n.note}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                            <span className="text-2xl">👈</span>
                                        </div>
                                        <h3 className="text-lg font-black text-black mb-1">Select a Patient Record</h3>
                                        <p className="text-sm text-gray-500">Choose a file from the sidebar to view detailed analysis.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== APPOINTMENTS TAB ==================== */}
                {activeTab === 'appointments' && (
                    <div className="space-y-6">
                        {/* Pending appointments */}
                        {pendingAppointments.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wider mb-3">⏳ Pending Approval</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {pendingAppointments.map(apt => (
                                        <div key={apt.id} className="glass-card p-5 border-yellow-500/20">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-medium text-black">
                                                        📅 {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-gray-600">🕐 {apt.time}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-1">Patient: {apt.patient_wallet?.slice(0, 8)}...{apt.patient_wallet?.slice(-6)}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors.pending}`}>PENDING</span>
                                            </div>
                                            {apt.reason && <p className="text-xs text-gray-600 mb-3">Reason: {apt.reason}</p>}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-medium hover:bg-green-500/20 transition-all"
                                                >
                                                    ✓ Confirm
                                                </button>
                                                <button
                                                    onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-medium hover:bg-red-500/20 transition-all"
                                                >
                                                    ✕ Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All appointments */}
                        <div>
                            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">All Appointments</h2>
                            {appointments.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                    <p className="text-sm text-gray-500">No appointments yet.</p>
                                    <p className="text-xs text-gray-600 mt-1">Patients can book appointments with you from their dashboard.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {appointments.map(apt => (
                                        <div key={apt.id} className="glass-card p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-lg">
                                                    📅
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-black">
                                                        {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {apt.time}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 font-mono">Patient: {apt.patient_wallet?.slice(0, 8)}...{apt.patient_wallet?.slice(-6)}</p>
                                                    {apt.reason && <p className="text-xs text-gray-500 mt-0.5">{apt.reason}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {apt.meeting_link && (
                                                    <a href={apt.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300">
                                                        🔗 Meet Link
                                                    </a>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[apt.status] || statusColors.pending}`}>
                                                    {apt.status.toUpperCase()}
                                                </span>
                                                {apt.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                                        className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-medium hover:bg-green-500/20 transition-all"
                                                    >
                                                        Complete
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
                    <div className="max-w-2xl mx-auto">
                        <div className="glass-card p-8 space-y-6">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
                                    🩺
                                </div>
                                <h2 className="text-xl font-bold text-black">Doctor Profile</h2>
                                <p className="text-xs text-gray-500 mt-1">This information is visible to patients when booking appointments.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Dr. John Smith"
                                        className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 text-sm text-black placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Specialty</label>
                                    <select
                                        value={profileForm.specialty}
                                        onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))}
                                        className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-indigo-500/50"
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
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Bio / About</label>
                                    <textarea
                                        value={profileForm.bio}
                                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                                        placeholder="Brief description about your practice and experience..."
                                        rows={4}
                                        className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 text-sm text-black placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                    />
                                </div>
                                <div className="bg-gray-100 border-2 border-black rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Wallet Address</h4>
                                    <p className="text-xs text-gray-500 font-mono break-all">{address}</p>
                                </div>
                            </div>

                            <button
                                onClick={saveProfile}
                                disabled={isSavingProfile || !profileForm.name}
                                className="btn-primary w-full !py-3"
                            >
                                {isSavingProfile ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
                            </button>

                            {/* Google Calendar Connection */}
                            <div className="mt-6 bg-gray-100 border-2 border-black rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center text-lg">
                                            📆
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-black">Google Calendar</h4>
                                            <p className="text-[10px] text-gray-500">Auto-create events with Google Meet links when confirming appointments.</p>
                                        </div>
                                    </div>
                                    {profile?.google_calendar_connected ? (
                                        <span className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-medium">
                                            ✓ Connected
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
                                            className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all"
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <MedicalDisclaimer />
            </div>
        </div>
    );
}
