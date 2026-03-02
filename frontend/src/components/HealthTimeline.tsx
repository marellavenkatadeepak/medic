'use client';

import { useState, useEffect } from 'react';
import { getPatientRecords } from '@/lib/api';
import RiskScore from './RiskScore';

interface TimelineEntry {
    id: string;
    file_name: string;
    summary: string;
    risk_score: number;
    conditions: string[];
    specialist: string;
    urgency: string;
    created_at: string;
}

interface HealthTimelineProps {
    patientWallet: string;
    refreshTrigger?: number;
}

export default function HealthTimeline({ patientWallet, refreshTrigger = 0 }: HealthTimelineProps) {
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTimeline();
    }, [patientWallet, refreshTrigger]);

    const loadTimeline = async () => {
        setIsLoading(true);
        try {
            const { records: data } = await getPatientRecords(patientWallet);
            if (data) {
                const sorted = [...data].sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setEntries(sorted as TimelineEntry[]);
            }
        } catch (err) {
            console.error('Failed to load timeline:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const urgencyColors: Record<string, string> = {
        low: 'bg-green-500 border-green-700',
        medium: 'bg-yellow-500 border-yellow-700',
        high: 'bg-orange-500 border-orange-700',
        critical: 'bg-red-500 border-red-700',
    };

    const urgencyBadge: Record<string, string> = {
        low: 'bg-green-100 text-green-800 border-green-500',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-500',
        high: 'bg-orange-100 text-orange-800 border-orange-500',
        critical: 'bg-red-100 text-red-800 border-red-500',
    };

    if (isLoading) {
        return (
            <div className="border-2 border-black p-8 text-center bg-gray-50">
                <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm font-mono uppercase">Loading timeline...</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="border-2 border-black p-8 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm font-bold uppercase">No health data available</p>
                <p className="text-xs font-mono mt-1">Upload reports to track your history</p>
            </div>
        );
    }

    return (
        <div className="space-y-0 relative pl-4 border-l-2 border-black ml-4 py-2">
            {entries.map((entry, index) => {
                const date = new Date(entry.created_at);
                const isFirst = index === 0;
                return (
                    <div key={entry.id} className="relative pl-8 pb-8">
                        {/* Dot */}
                        <div className={`absolute -left-[23px] top-0 w-4 h-4 rounded-full border-2 border-black ${urgencyColors[entry.urgency] || 'bg-gray-500'} ${isFirst ? 'scale-125' : ''}`} />

                        {/* Card */}
                        <div className={`border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 ${isFirst ? 'bg-retro-accent-yellow' : 'bg-white'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-bold text-black uppercase">{entry.file_name}</p>
                                    <p className="font-mono text-xs text-black mt-1">
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {' @ '}
                                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${urgencyBadge[entry.urgency] || urgencyBadge.low}`}>
                                        {entry.urgency}
                                    </span>
                                    <RiskScore score={entry.risk_score} size="sm" />
                                </div>
                            </div>

                            <p className="text-sm font-medium leading-relaxed mb-3">{entry.summary}</p>

                            {entry.conditions?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {entry.conditions.slice(0, 4).map((c, i) => (
                                        <span key={i} className="px-2 py-1 bg-black text-white text-[10px] uppercase font-bold tracking-wider">
                                            {c}
                                        </span>
                                    ))}
                                    {entry.conditions.length > 4 && (
                                        <span className="px-2 py-1 border border-black text-[10px] font-bold">+{entry.conditions.length - 4}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
