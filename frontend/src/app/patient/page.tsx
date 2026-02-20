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
    created_at: string;
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

    // ... (rest of code)



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
            // ... (keep existing upload logic intact) ...
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

                setUploadStatus('🤖 Analyzing with AI...');
                const { data: analysis, error: analysisError } = await insforge.functions.invoke('analyze-report', {
                    body: {
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
                    const { tx } = await storeRecord(analysis.analysis.record_hash, analysis.analysis.id);
                    await insforge.database
                        .from('analyses')
                        .update({ tx_hash: tx.hash })
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

                // Convert file to base64 for direct function usage (skipping storage to avoid permission issues)
                const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data:application/pdf;base64, prefix
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
                    const { tx } = await storeRecord(analysis.analysis.record_hash, analysis.analysis.id);
                    await insforge.database
                        .from('analyses')
                        .update({ tx_hash: tx.hash })
                        .eq('id', analysis.analysis.id);
                } catch (blockchainErr) {
                    console.warn('Blockchain storage skipped:', blockchainErr);
                }

                setUploadStatus('');
            }

            await loadRecords();
            setRefreshTrigger(prev => prev + 1);

            // Auto-switch to Digital Twin view to show AI analysis
            setActiveTab('twin');

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
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
        completed: 'bg-green-100 text-green-800 border-green-300',
        cancelled: 'bg-red-100 text-red-800 border-red-300',
    };

    const deleteRecord = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("Delete clicked for ID:", id);

        if (!confirm('Are you sure you want to delete this record?')) {
            console.log("Delete cancelled");
            return;
        }

        // Optimistic update
        const originalRecords = [...records];
        setRecords(prev => prev.filter(r => r.id !== id));
        if (selectedRecord?.id === id) setSelectedRecord(null);

        try {
            console.log("Deleting from DB...");
            const { error } = await insforge.database
                .from('analyses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            console.log("Delete successful");

            setRefreshTrigger(prev => prev + 1);
            // Optionally, reload to fully sync
            await loadRecords();
        } catch (err: any) {
            console.error('Failed to delete:', err);
            // Revert on failure
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
        <div className="min-h-screen pt-24 pb-12 px-6 font-sans relative">
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
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h1 className="text-6xl font-serif font-bold text-black mb-2 tracking-tight">
                            Patient <span className="text-retro-accent-pink italic">Dashboard</span>
                        </h1>
                        <p className="text-lg text-gray-700 font-medium">Manage your medical records and AI analysis</p>
                    </div>
                    <div className="flex gap-4">
                        {!isRegistered && signer && (
                            <button onClick={handleRegister} disabled={isRegistering} className="btn-primary text-sm">
                                {isRegistering ? 'Registering...' : 'Register as Patient'}
                            </button>
                        )}
                        <Link
                            href="/patient/book"
                            className="bg-white border-2 border-black px-6 py-3 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                        >
                            📅 Book Appointment
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left column: Upload + Records List */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Upload Window */}
                        <div className="retro-card">
                            <div className="window-header">
                                <span className="window-title">Upload File</span>
                                <div className="window-controls">
                                    <div className="window-dot bg-red-400"></div>
                                    <div className="window-dot bg-yellow-400"></div>
                                    <div className="window-dot bg-green-400"></div>
                                </div>
                            </div>
                            <div className="p-4">
                                <FileUpload onFileSelect={handleFileUpload} isUploading={isUploading} />
                                {uploadStatus && (
                                    <div className="mt-4 p-3 border-2 border-black bg-yellow-100 font-mono text-xs">
                                        <p className="animate-pulse"> {uploadStatus}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Records Window */}
                        <div className="retro-card">
                            <div className="window-header">
                                <span className="window-title">Records Database</span>
                                <div className="window-controls">
                                    <div className="window-dot"></div>
                                    <div className="window-dot"></div>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {records.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-gray-400">
                                            <p className="text-sm text-gray-500 font-mono">No records found locally.</p>
                                        </div>
                                    ) : (
                                        records.map(r => (
                                            <div
                                                key={r.id}
                                                onClick={() => setSelectedRecord(r)}
                                                className={`cursor-pointer p-4 border-2 border-black transition-all ${selectedRecord?.id === r.id
                                                    ? 'bg-retro-accent-green shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                                                    : 'bg-white hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-sm truncate pr-2 flex-1">{r.file_name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono border border-black px-1">{new Date(r.created_at).toLocaleDateString()}</span>
                                                        <button
                                                            onClick={(e) => deleteRecord(r.id, e)}
                                                            className="w-5 h-5 flex items-center justify-center hover:bg-red-100 rounded text-gray-500 hover:text-red-500 font-bold"
                                                            title="Delete Record"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-1">
                                                        {r.urgency === 'critical' && <span className="w-3 h-3 bg-red-500 border border-black rounded-full"></span>}
                                                        {r.urgency === 'high' && <span className="w-3 h-3 bg-orange-500 border border-black rounded-full"></span>}
                                                        {r.urgency === 'medium' && <span className="w-3 h-3 bg-yellow-500 border border-black rounded-full"></span>}
                                                        {r.urgency === 'low' && <span className="w-3 h-3 bg-green-500 border border-black rounded-full"></span>}
                                                    </div>
                                                    <RiskScore score={r.risk_score} size="xs" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column: Analysis / Chat / Avatar / Access / Appointments */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedRecord ? (
                            <>
                                {/* Tab bar */}
                                <div className="flex overflow-x-auto gap-2 pb-2 border-b-2 border-black mb-4">
                                    {(['analysis', 'health', 'twin', 'chat', 'avatar', 'access', 'appointments'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-6 py-2 font-bold text-sm uppercase tracking-wider border-t-2 border-x-2 border-black transition-all ${activeTab === tab
                                                ? 'bg-retro-accent-pink text-black -mb-[2px] pb-[4px] z-10'
                                                : 'bg-white text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {tab === 'analysis' ? 'Analysis' : tab === 'health' ? 'Health' : tab === 'twin' ? '3D Body' : tab === 'chat' ? 'Chat' : tab === 'avatar' ? 'AI Doc' : tab === 'access' ? 'Access' : 'Appts'}
                                        </button>
                                    ))}
                                </div>

                                {/* Content Window */}
                                <div className="retro-card min-h-[500px]">
                                    <div className="window-header justify-end">
                                        <span className="text-xs font-mono uppercase mr-4">FILE_ID: {selectedRecord.id.slice(0, 8)}</span>
                                        <div className="window-controls">
                                            <div className="window-dot"></div>
                                            <div className="window-dot"></div>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        {/* Analysis panel */}
                                        {activeTab === 'analysis' && (
                                            <AnalysisView record={selectedRecord} />
                                        )}

                                        {/* Chat panel */}
                                        {activeTab === 'chat' && address && <ChatBot patientWallet={address} />}

                                        {/* Avatar panel */}
                                        {activeTab === 'avatar' && (
                                            <TavusVideo
                                                summary={selectedRecord.summary}
                                                riskScore={selectedRecord.risk_score}
                                                conditions={selectedRecord.conditions}
                                                specialist={selectedRecord.specialist}
                                                urgency={selectedRecord.urgency}
                                            />
                                        )}

                                        {/* Access control panel */}
                                        {activeTab === 'access' && (
                                            <AccessManager analysisId={selectedRecord.id} patientWallet={address ? address : undefined} />
                                        )}

                                        {/* Appointments panel */}
                                        {activeTab === 'appointments' && (
                                            <AppointmentsView address={address || ''} />
                                        )}

                                        {/* Health Analytics panel */}
                                        {activeTab === 'health' && address && (
                                            <HealthView records={records} address={address} refreshTrigger={refreshTrigger} />
                                        )}

                                        {/* Digital Twin panel */}
                                        {activeTab === 'twin' && (
                                            <div className="space-y-4">
                                                <div className="bg-black text-white p-4 font-mono text-sm border-2 border-cyan-500 mb-4">
                                                    <h3 className="text-cyan-400 font-bold uppercase mb-2">Holographic Patient Status</h3>
                                                    <p>Interactive 3D visualization of your current health markers. Rotate the model and click on highlighted organs to view detailed AI analysis.</p>
                                                </div>
                                                <DigitalTwin analysisData={selectedRecord} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="retro-card p-12 text-center h-full flex flex-col items-center justify-center bg-image-grid">
                                <div className="w-24 h-24 bg-white border-2 border-black rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="text-4xl">📂</span>
                                </div>
                                <h3 className="text-3xl font-serif font-bold mb-2">No Record Selected</h3>
                                <p className="text-gray-600 max-w-md mx-auto">Select a record from the database list on the left, or upload a new medical document to get started.</p>
                            </div>
                        )}
                    </div>
                </div>

                <MedicalDisclaimer />
            </div>
        </div>
    );
}
