'use client';

import { useState } from 'react';
import Link from 'next/link';
import RiskScore from '@/components/RiskScore';
import { decryptFileFromIPFS } from '@/lib/encryption';

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
    ipfs_cid?: string;
    encryption_key?: string;
    encryption_iv?: string;
}

interface AnalysisViewProps {
    record: Analysis;
}

export default function AnalysisView({ record }: AnalysisViewProps) {
    const [status, setStatus] = useState('');

    const handleViewDocument = async () => {
        if (!record.ipfs_cid || !record.encryption_key) {
            alert('Cannot view document: missing IPFS CID or encryption key.'); // TODO: Replace with Toast
            return;
        }

        try {
            setStatus('🔓 Decrypting document...');
            const blob = await decryptFileFromIPFS(record.ipfs_cid, record.encryption_key, record.encryption_iv || '');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err: any) {
            console.error('Decryption failed:', err);
            alert(`Failed to decrypt document: ${err.message}`);
        } finally {
            setStatus('');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between border-b-2 border-black pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold mb-2">{record.file_name}</h2>
                    <div className="flex gap-2 mb-4">
                        {record.conditions?.map((c, i) => (
                            <span key={i} className="badge badge-indigo">
                                {c}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={handleViewDocument}
                        className="bg-black text-white px-4 py-2 text-sm font-bold uppercase hover:bg-gray-800 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                        {status ? status : '👁️ View Original Report'}
                    </button>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black font-mono">{record.risk_score}</div>
                    <div className="text-xs uppercase tracking-widest">Risk Score</div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <h3 className="font-bold uppercase tracking-wider mb-4 border-l-4 border-retro-accent-yellow pl-3">Executive Summary</h3>
                    <p className="text-lg leading-relaxed font-medium">{record.summary}</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-100 p-4 border-2 border-black">
                        <h4 className="font-bold uppercase text-xs mb-2">Specialist</h4>
                        <p className="font-serif text-xl italic mb-2">{record.specialist}</p>
                        <Link
                            href={`/patient/book?specialty=${encodeURIComponent(record.specialist)}`}
                            className="text-[10px] uppercase font-bold text-white bg-black px-2 py-1 hover:bg-gray-800 inline-block transition-colors"
                        >
                            Find Doctor →
                        </Link>
                    </div>
                    <div className="bg-gray-100 p-4 border-2 border-black">
                        <h4 className="font-bold uppercase text-xs mb-2">Urgency</h4>
                        <span className={`px-2 py-1 font-bold text-sm uppercase border border-black inline-block ${record.urgency === 'critical' ? 'bg-red-300' :
                            record.urgency === 'high' ? 'bg-orange-300' :
                                record.urgency === 'medium' ? 'bg-yellow-300' :
                                    'bg-green-300'
                            }`}>
                            {record.urgency}
                        </span>
                    </div>
                </div>
            </div>

            {record.record_hash && (
                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-400">
                    <h4 className="font-mono text-xs font-bold uppercase mb-2">Blockchain Verification</h4>
                    <div className="font-mono text-[10px] break-all bg-gray-100 p-2 border border-black mb-4">
                        HASH: {record.record_hash}<br />
                        TX: {record.tx_hash || 'PENDING'}
                    </div>
                </div>
            )}

            {/* Secret Key Display - TODO: Remove/Secure later */}
            {record.encryption_key && (
                <div className="mt-4 bg-retro-accent-yellow p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-bold uppercase text-xs mb-2 flex items-center gap-2">
                        <span>🔑 Encryption Key</span>
                        <span className="text-[10px] bg-black text-white px-1">CONFIDENTIAL</span>
                    </h4>
                    <p className="text-xs mb-2">Save this key to decrypt your file later.</p>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-white border border-black p-2 font-mono text-xs break-all">
                            {record.encryption_key}
                        </code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(record.encryption_key!);
                                alert('Key copied to clipboard!');
                            }}
                            className="bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
