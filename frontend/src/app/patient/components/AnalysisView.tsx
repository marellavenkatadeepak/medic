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
    improvement_plan?: string[];
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
        <div className="space-y-4 animate-fadeIn">
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{record.file_name}</h2>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.urgency === 'critical' ? 'bg-red-50 text-red-600 border border-red-200' :
                                record.urgency === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                    record.urgency === 'medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                                        'bg-green-50 text-green-600 border border-green-200'
                                }`}>
                                {record.urgency} Priority
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-2">
                            <span>📅 Date: {new Date(record.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600">{record.id.slice(0, 8)}...</span>
                        </p>
                        <button
                            onClick={handleViewDocument}
                            className="group relative inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 bg-gray-900 border border-transparent rounded-xl hover:bg-gray-800 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                        >
                            <span>{status ? status : '👁️ View Original Report'}</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>

                    <div className="flex bg-gray-50/50 rounded-2xl p-4 border border-slate-200 items-center gap-4 min-w-[180px] justify-center shadow-inner">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Risk Score</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-black text-gray-900 tracking-tighter">{record.risk_score}</span>
                                <span className="text-sm font-medium text-gray-400">/ 100</span>
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            <RiskScore score={record.risk_score} size="md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid lg:grid-cols-3 gap-4">
                {/* Left Col: Exec Summary & Key Info */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Summary */}
                    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-200 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Executive Summary</h3>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {record.summary}
                        </p>
                    </div>

                    {/* Improvement Plan (Conditional or Fallback for old records) */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-green-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Health Recommendations</h3>
                            </div>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase">Action Plan</span>
                        </div>
                        <ul className="space-y-3">
                            {record.improvement_plan && record.improvement_plan.length > 0 ? (
                                record.improvement_plan.map((step, idx) => (
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

                    {/* Meta Specs */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl p-4 border border-blue-100/50 hover:shadow-sm transition-shadow relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                                <span className="text-6xl">👨‍⚕️</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5 relative z-10">Recommended Specialist</p>
                            <p className="text-lg font-bold text-gray-900 mb-4 relative z-10">{record.specialist}</p>
                            <Link
                                href={`/patient/book?specialty=${encodeURIComponent(record.specialist)}`}
                                className="inline-flex relative z-10 items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white px-3 py-2 rounded-xl shadow-sm w-full justify-center transition-all hover:shadow"
                            >
                                <span>Find a Doctor</span>
                                <span className="text-lg leading-none">→</span>
                            </Link>
                        </div>

                        {record.record_hash && (
                            <div className="bg-gray-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        Blockchain Verification
                                    </p>
                                    <div className="space-y-2 mt-3">
                                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                            <p className="text-[9px] text-gray-400 font-bold tracking-widest mb-1 uppercase">Hash</p>
                                            <p className="text-[11px] font-mono text-gray-600 truncate" title={record.record_hash}>{record.record_hash}</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                            <p className="text-[9px] text-gray-400 font-bold tracking-widest mb-1 uppercase">Transaction</p>
                                            <p className="text-[11px] font-mono text-emerald-600 truncate" title={record.tx_hash}>{record.tx_hash || 'PENDING'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Conditions & Secret */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Detected Conditions</h3>
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">{record.conditions?.length || 0}</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {record.conditions?.map((c, i) => (
                                <div key={i} className="group flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-slate-200 transition-all cursor-default">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-[1.5] transition-transform"></div>
                                    <span className="text-xs font-semibold text-gray-700">{c}</span>
                                </div>
                            ))}
                            {(!record.conditions || record.conditions.length === 0) && (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">No particular conditions detected.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Encryption Key Box */}
                    {record.encryption_key && (
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl -mr-8 -mt-8"></div>

                            <h4 className="font-bold uppercase text-[9px] tracking-widest mb-3 flex items-center justify-between text-gray-300 relative z-10">
                                <span className="flex items-center gap-1.5"><span className="text-yellow-400 text-xs">🔑</span> Encryption Key</span>
                                <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest">SECRET</span>
                            </h4>

                            <p className="text-[10px] text-gray-400 mb-3 relative z-10 font-medium">Keep this key safe to decrypt your report later.</p>

                            <div className="relative z-10 font-mono text-[10px] text-emerald-400 break-all bg-black/60 p-3 rounded-xl border border-gray-700/50 mb-3 shadow-inner hover:bg-black/80 transition-all duration-300">
                                <div className="blur-[3px] group-hover:blur-none transition-all duration-300">
                                    {record.encryption_key}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(record.encryption_key!);
                                    alert('Key copied to clipboard!');
                                }}
                                className="relative z-10 w-full bg-white/5 hover:bg-white/10 text-white text-xs font-semibold py-2.5 rounded-xl transition-all border border-slate-600 hover:border-slate-500 flex items-center justify-center gap-2"
                            >
                                <span>Copy Key</span>
                                <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
