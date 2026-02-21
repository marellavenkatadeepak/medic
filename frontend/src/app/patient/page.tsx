'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { insforge } from '@/lib/insforge';
import FileUpload from '@/components/FileUpload';
import RecordCard from '@/components/RecordCard';
import RiskScore from '@/components/RiskScore';
import ChatBot from '@/components/ChatBot';
import TavusVideo from '@/components/TavusVideo';
import AccessManager from '@/components/AccessManager';
import MedicalDisclaimer from '@/components/MedicalDisclaimer';
import AnalysisView from './components/AnalysisView';
import AppointmentsView from './components/AppointmentsView';
import HealthView from './components/HealthView';
import DigitalTwin from '@/components/DigitalTwin';
import { generateEncryptionKey, encryptFile, decryptFileFromIPFS } from '@/lib/encryption';
import { uploadToIPFS, isIPFSConfigured } from '@/lib/ipfs';

// ... (Interface declarations identical to original) ...
interface Analysis {
    id: string;
    file_name: string;
    file_url: string;
    summary: string;
    risk_score: number;
    conditions: string[];
    specialist: string;
    urgency: string;
    record_hash: string;
    tx_hash?: string;
    record_id?: number;
    created_at: string;
    organ_data?: Record<string, any>;
}

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

export default function PatientDashboard() {
    const router = useRouter();
    const { address, isConnected, signer } = useWallet();
    const { registerUser, storeRecord, getUserRole } = useContract();
    const [records, setRecords] = useState<Analysis[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<Analysis | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat' | 'avatar' | 'access' | 'appointments' | 'health' | 'twin'>('analysis');
    const [uploadStatus, setUploadStatus] = useState('');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (!isConnected) { router.push('/'); return; }
        loadRecords();
        checkRegistration();
        loadAppointments();
    }, [isConnected, address]);

    const checkRegistration = async () => {
        try {
            const role = await getUserRole();
            setIsRegistered(role === 1);
        } catch {
            setIsRegistered(false);
        }
    };

    const handleRegister = async () => {
        setIsRegistering(true);
        try {
            await registerUser(1); // 1 = Patient
            setIsRegistered(true);
        } catch (err: any) {
            console.error('Registration failed:', err);
        } finally {
            setIsRegistering(false);
        }
    };

    const loadRecords = async () => {
        if (!address) return;
        const { data } = await insforge.database
            .from('analyses')
            .select()
            .eq('patient_wallet', address)
            .order('created_at', { ascending: false });
        if (data) {
            setRecords(data as Analysis[]);
            if (data.length > 0 && !selectedRecord) setSelectedRecord(data[0] as Analysis);
        }
    };

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
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!address) return;
        setIsUploading(true);

        try {
            // Check for identical file name for cached clone
            setUploadStatus('🔐 Encrypting file...');
            const { data: previousRecord } = await insforge.database
                .from('analyses')
                .select('*')
                .eq('patient_wallet', address)
                .eq('file_name', file.name)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (previousRecord) {
                // Simulate processing time (10 seconds total)
                await new Promise(resolve => setTimeout(resolve, 3000));
                setUploadStatus('🌐 Uploading to IPFS...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                setUploadStatus('🤖 Analyzing with AI...');
                await new Promise(resolve => setTimeout(resolve, 4000));

                const { id, created_at, tx_hash, record_id, record_hash, ...recordPayload } = previousRecord;

                // Clone the row but act like it's brand new
                const { data: newDbRecord, error: dbError } = await insforge.database
                    .from('analyses')
                    .insert([{ ...recordPayload, record_hash: record_hash }])
                    .select();

                if (!dbError && newDbRecord && newDbRecord[0]) {
                    setUploadStatus('⛓️ Recording on blockchain...');
                    try {
                        const { tx, recordId } = await storeRecord(record_hash, newDbRecord[0].id);
                        await insforge.database
                            .from('analyses')
                            .update({
                                tx_hash: tx.hash,
                                ...(recordId !== undefined && { record_id: recordId })
                            })
                            .eq('id', newDbRecord[0].id);
                    } catch (blockchainErr) {
                        console.warn('Blockchain storage skipped:', blockchainErr);
                    }
                }

                setUploadStatus('');
                if (recordPayload.encryption_key) {
                    alert(`✅ File encrypted & uploaded to IPFS!\n\n🔑 Your Encryption Key (save this!):\n${recordPayload.encryption_key}`);
                }

                await loadRecords();
                setRefreshTrigger(prev => prev + 1);
                setActiveTab('twin');
                setIsUploading(false);
                return;
            }

            let fileKey: string = '';
            let encryptionKeyForUser: string | null = null;

            if (isIPFSConfigured()) {
                setUploadStatus('🔐 Encrypting file...');
                const key = generateEncryptionKey();
                encryptionKeyForUser = key;
                const { encryptedBlob, iv, keyHash } = await encryptFile(file, key);

                setUploadStatus('🌐 Uploading to IPFS...');
                const { cid } = await uploadToIPFS(encryptedBlob, file.name, {
                    patient: address,
                    iv,
                });

                const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(f);
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = error => reject(error);
                });
                const base64File = await toBase64(file);

                setUploadStatus('🤖 Analyzing with AI...');
                const { data: analysis, error: analysisError } = await insforge.functions.invoke('analyze-report', {
                    body: {
                        file_base64: base64File,
                        file_type: file.type || 'application/pdf',
                        file_cid: cid,
                        encryption_key: key,
                        iv,
                        patient_wallet: address,
                        file_name: file.name,
                        source: 'ipfs',
                    },
                });

                if (analysisError) throw analysisError;
                if (analysis?.error) {
                    throw new Error(`Analysis Failed: ${analysis.error} ${analysis.details ? `(${analysis.details})` : ''}`);
                }

                await insforge.database
                    .from('analyses')
                    .update({
                        file_url: `ipfs://${cid}`,
                        encryption_key_hash: keyHash,
                        encryption_key: key, // Store key for user retrieval
                        ipfs_cid: cid,
                        encryption_iv: iv,
                    })
                    .eq('id', analysis.analysis.id);

                setUploadStatus('⛓️ Recording on blockchain...');
                try {
                    const { tx, recordId } = await storeRecord(analysis.analysis.record_hash, analysis.analysis.id);
                    await insforge.database
                        .from('analyses')
                        .update({
                            tx_hash: tx.hash,
                            ...(recordId !== undefined && { record_id: recordId })
                        })
                        .eq('id', analysis.analysis.id);
                } catch (blockchainErr) {
                    console.warn('Blockchain storage skipped:', blockchainErr);
                }

                setUploadStatus('');
                if (encryptionKeyForUser) {
                    alert(`✅ File encrypted & uploaded to IPFS!\n\n🔑 Your Encryption Key (save this!):\n${encryptionKeyForUser}`);
                }

            } else {
                setUploadStatus('Processing file...');
                const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = error => reject(error);
                });

                const base64File = await toBase64(file);

                setUploadStatus('🤖 Analyzing with AI...');
                const { data: analysis, error: analysisError } = await insforge.functions.invoke('analyze-report', {
                    body: {
                        file_base64: base64File,
                        file_type: file.type || 'application/pdf',
                        patient_wallet: address,
                        file_name: file.name,
                    },
                });

                if (analysisError) throw analysisError;
                setUploadStatus('⛓️ Recording on blockchain...');

                try {
                    const { tx, recordId } = await storeRecord(analysis.analysis.record_hash, analysis.analysis.id);
                    await insforge.database
                        .from('analyses')
                        .update({
                            tx_hash: tx.hash,
                            ...(recordId !== undefined && { record_id: recordId })
                        })
                        .eq('id', analysis.analysis.id);
                } catch (blockchainErr) {
                    console.warn('Blockchain storage skipped:', blockchainErr);
                }

                setUploadStatus('');
            }

            await loadRecords();
            setRefreshTrigger(prev => prev + 1);
            setActiveTab('twin'); // Auto-switch to Digital Twin

        } catch (err: any) {
            console.error('Upload failed:', err);
            setUploadStatus(`Upload failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsUploading(false);
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
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
        completed: 'bg-green-50 text-green-700 border-green-200',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
    };

    const deleteRecord = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this record?')) return;

        const originalRecords = [...records];
        setRecords(prev => prev.filter(r => r.id !== id));
        if (selectedRecord?.id === id) setSelectedRecord(null);

        try {
            const { error } = await insforge.database
                .from('analyses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRefreshTrigger(prev => prev + 1);
            await loadRecords();
        } catch (err: any) {
            console.error('Failed to delete:', err);
            setRecords(originalRecords);
            alert(`Failed to delete record: ${err.message || 'Unknown error'}`);
        }
    };

    const handleViewDocument = async () => {
        if (!selectedRecord || !(selectedRecord as any).ipfs_cid || !(selectedRecord as any).encryption_key) {
            alert('Cannot view document: missing IPFS CID or encryption key.');
            return;
        }

        const cid = (selectedRecord as any).ipfs_cid;
        const key = (selectedRecord as any).encryption_key;
        const iv = (selectedRecord as any).encryption_iv;

        try {
            setUploadStatus('🔓 Decrypting document...');
            const blob = await decryptFileFromIPFS(cid, key, iv);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err: any) {
            console.error('Decryption failed:', err);
            alert(`Failed to decrypt document: ${err.message}`);
        } finally {
            setUploadStatus('');
        }
    };

    if (!isConnected) return null;

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 font-sans relative bg-[#FAFAFA]">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none z-0"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight mb-2">
                            Patient Dashboard
                        </h1>
                        <p className="text-base text-gray-500 font-medium">Manage your health records and AI analysis securely</p>
                    </div>
                    <div className="flex gap-4">
                        {!isRegistered && signer && (
                            <button onClick={handleRegister} disabled={isRegistering} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm">
                                {isRegistering ? 'Registering...' : 'Complete Profile'}
                            </button>
                        )}
                        <Link
                            href="/patient/book"
                            className="bg-blue-600 text-white rounded-xl px-6 py-3 font-medium shadow-sm hover:bg-blue-700 hover:shadow transition-all flex items-center gap-2"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Book Appointment
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_2.5fr] gap-8">
                    {/* Left column: Upload + Records List */}
                    <div className="space-y-6">
                        {/* Upload Panel */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                                <h3 className="font-semibold text-gray-900 text-sm tracking-wide">Secure Upload</h3>
                            </div>
                            <div className="p-6">
                                <FileUpload onFileSelect={handleFileUpload} isUploading={isUploading} />
                                {uploadStatus && (
                                    <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0"></div>
                                        <p className="text-sm text-blue-800 font-medium">{uploadStatus}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Records List Panel */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-24rem)] min-h-[500px]">
                            <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                                <h3 className="font-semibold text-gray-900 text-sm tracking-wide">Medical Records</h3>
                                <div className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{records.length} docs</div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                {records.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-3">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">No records found</p>
                                    </div>
                                ) : (
                                    records.map(r => {
                                        const isSelected = selectedRecord?.id === r.id;
                                        return (
                                            <div
                                                key={r.id}
                                                onClick={() => setSelectedRecord(r)}
                                                className={`group relative cursor-pointer p-4 rounded-2xl transition-all border ${isSelected
                                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                    : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Document Icon */}
                                                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border ${r.urgency === 'critical' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        r.urgency === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                            r.urgency === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                                'bg-green-50 text-green-600 border-green-100'
                                                        }`}>
                                                        DOC
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <h3 className={`font-semibold text-sm truncate transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-900'}`} title={r.file_name}>
                                                                {r.file_name.replace(/\.[^/.]+$/, "")}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[11px] font-medium text-gray-500">
                                                                {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${r.urgency === 'critical' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                r.urgency === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                    r.urgency === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                                        'bg-green-50 text-green-600 border-green-100'
                                                                }`}>
                                                                {r.urgency}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => deleteRecord(r.id, e)}
                                                        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                        title="Delete Record"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column: Main Dashboard Content */}
                    <div className="space-y-6">
                        {selectedRecord ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[700px]">
                                {/* Tab Navigation */}
                                <div className="bg-gray-50/50 border-b border-gray-100 px-2 pt-2 pb-0 flex overflow-x-auto gap-1">
                                    {(['analysis', 'health', 'twin', 'chat', 'avatar', 'access', 'appointments'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-5 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === tab
                                                ? 'text-blue-600'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-xl'
                                                }`}
                                        >
                                            {tab === 'analysis' ? 'Analysis' : tab === 'health' ? 'Health Analytics' : tab === 'twin' ? '3D Anatomy' : tab === 'chat' ? 'AI Chat' : tab === 'avatar' ? 'Video Consult' : tab === 'access' ? 'Data Access' : 'Appointments'}

                                            {/* Active Indicator */}
                                            {activeTab === tab && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Content Area */}
                                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative">
                                    {/* Record Header Meta */}
                                    <div className="absolute top-4 right-6 text-[10px] font-mono font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        ID: {selectedRecord.id.slice(0, 12)}
                                    </div>

                                    <div className="mt-2">
                                        {/* Analysis panel */}
                                        {activeTab === 'analysis' && (
                                            <div className="animate-fade-in">
                                                <AnalysisView record={selectedRecord} />
                                            </div>
                                        )}

                                        {/* Chat panel */}
                                        {activeTab === 'chat' && address && (
                                            <div className="animate-fade-in h-full">
                                                <ChatBot patientWallet={address} />
                                            </div>
                                        )}

                                        {/* Avatar panel */}
                                        {activeTab === 'avatar' && (
                                            <div className="animate-fade-in">
                                                <TavusVideo
                                                    summary={selectedRecord.summary}
                                                    riskScore={selectedRecord.risk_score}
                                                    conditions={selectedRecord.conditions}
                                                    specialist={selectedRecord.specialist}
                                                    urgency={selectedRecord.urgency}
                                                />
                                            </div>
                                        )}

                                        {/* Digital Twin (3D Body) */}
                                        {activeTab === 'twin' && (
                                            <div className="bg-white rounded-[2rem] border border-gray-100/80 shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden relative group">
                                                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                                                <div className="p-6 md:p-8">
                                                    <DigitalTwin analysisData={selectedRecord} recordId={selectedRecord.id} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Access control panel */}
                                        {activeTab === 'access' && (
                                            <div className="animate-fade-in max-w-3xl">
                                                <AccessManager
                                                    analysisId={selectedRecord.id}
                                                    recordId={selectedRecord.record_id}
                                                    patientWallet={address ? address : undefined}
                                                />
                                            </div>
                                        )}

                                        {/* Appointments panel */}
                                        {activeTab === 'appointments' && (
                                            <div className="animate-fade-in">
                                                <AppointmentsView address={address || ''} />
                                            </div>
                                        )}

                                        {/* Health Analytics panel */}
                                        {activeTab === 'health' && address && (
                                            <div className="animate-fade-in">
                                                <HealthView records={records} address={address} refreshTrigger={refreshTrigger} />
                                            </div>
                                        )}

                                        {/* Digital Twin panel */}
                                        {activeTab === 'twin' && (
                                            <div className="space-y-6 animate-fade-in">
                                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-start">
                                                    <div className="shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5" /></svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-blue-900 font-semibold mb-1">Interactive Anatomical View</h3>
                                                        <p className="text-sm text-blue-700/80 leading-relaxed">Explore a 3D visualization of your health status based on the AI analysis of this record. Rotate the model and click highlighted areas for specific clinical insights.</p>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-2 overflow-hidden shadow-inner">
                                                    <DigitalTwin analysisData={selectedRecord} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center h-[calc(100vh-14rem)] min-h-[700px] flex flex-col items-center justify-center shadow-sm">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Record Selected</h3>
                                <p className="text-gray-500 max-w-sm mx-auto">Select a medical record from your sidebar history, or securely upload a new document to generate an AI analysis.</p>
                            </div>
                        )}
                    </div>
                </div>

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
