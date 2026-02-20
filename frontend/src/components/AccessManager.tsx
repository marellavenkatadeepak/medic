'use client';

import { useState } from 'react';
import { useContract } from '@/hooks/useContract';

interface AccessManagerProps {
    analysisId: string;
    recordId?: number;
}

export default function AccessManager({ analysisId, recordId }: AccessManagerProps) {
    const { grantAccess, revokeAccess } = useContract();
    const [doctorAddress, setDoctorAddress] = useState('');
    const [isGranting, setIsGranting] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [grantedDoctors, setGrantedDoctors] = useState<string[]>([]);

    const handleGrant = async () => {
        if (!doctorAddress.trim() || !doctorAddress.startsWith('0x') || doctorAddress.length !== 42) {
            setMessage({ type: 'error', text: 'Please enter a valid Ethereum address (0x...)' });
            return;
        }
        if (recordId === undefined) {
            setMessage({ type: 'error', text: 'Record must be stored on blockchain first.' });
            return;
        }

        setIsGranting(true);
        setMessage(null);
        try {
            await grantAccess(doctorAddress, recordId);
            setGrantedDoctors(prev => [...prev, doctorAddress]);
            setMessage({ type: 'success', text: `Access granted to ${doctorAddress.slice(0, 8)}...${doctorAddress.slice(-4)}` });
            setDoctorAddress('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message?.includes('user rejected') ? 'Transaction rejected' : 'Failed to grant access' });
        } finally {
            setIsGranting(false);
        }
    };

    const handleRevoke = async (doctor: string) => {
        if (recordId === undefined) return;
        setIsRevoking(true);
        setMessage(null);
        try {
            await revokeAccess(doctor, recordId);
            setGrantedDoctors(prev => prev.filter(d => d !== doctor));
            setMessage({ type: 'success', text: `Access revoked from ${doctor.slice(0, 8)}...${doctor.slice(-4)}` });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to revoke access' });
        } finally {
            setIsRevoking(false);
        }
    };

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Access Control</h3>
                    <p className="text-[10px] text-gray-500">Grant or revoke doctor access to this record</p>
                </div>
            </div>

            {/* Grant form */}
            <div className="flex gap-2">
                <input
                    value={doctorAddress}
                    onChange={e => setDoctorAddress(e.target.value)}
                    placeholder="Doctor wallet address (0x...)"
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                />
                <button
                    onClick={handleGrant}
                    disabled={isGranting || !doctorAddress.trim()}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
                >
                    {isGranting ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    ) : 'Grant'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`px-3 py-2 rounded-lg text-xs ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Granted doctors list */}
            {grantedDoctors.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Granted Doctors</h4>
                    {grantedDoctors.map(doc => (
                        <div key={doc} className="flex items-center justify-between bg-gray-800/30 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </div>
                                <span className="text-xs text-gray-300 font-mono">{doc.slice(0, 10)}...{doc.slice(-6)}</span>
                            </div>
                            <button
                                onClick={() => handleRevoke(doc)}
                                disabled={isRevoking}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
