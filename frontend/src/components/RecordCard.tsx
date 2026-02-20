'use client';

import RiskScore from './RiskScore';

interface RecordCardProps {
    id: string;
    fileName: string;
    summary: string;
    riskScore: number;
    conditions: string[];
    specialist: string;
    urgency: string;
    createdAt: string;
    txHash?: string;
    onSelect?: () => void;
    isSelected?: boolean;
}

export default function RecordCard({
    fileName, summary, riskScore, conditions, specialist, urgency, createdAt, txHash, onSelect, isSelected,
}: RecordCardProps) {
    const urgencyColors: Record<string, string> = {
        low: 'bg-green-500/10 text-green-400 border-green-500/20',
        medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
        <div
            onClick={onSelect}
            className={`glass-card p-5 cursor-pointer transition-all duration-300 ${isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : ''
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-white truncate">{fileName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${urgencyColors[urgency] || urgencyColors.low}`}>
                            {urgency.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{summary}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {conditions?.slice(0, 3).map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-[10px] text-indigo-300 border border-indigo-500/10">
                                {c}
                            </span>
                        ))}
                        {conditions?.length > 3 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-800 text-[10px] text-gray-500">+{conditions.length - 3}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-gray-500">
                        <span>🩺 {specialist}</span>
                        <span>{new Date(createdAt).toLocaleDateString()}</span>
                        {txHash && <span className="font-mono">TX: {txHash.slice(0, 8)}...</span>}
                    </div>
                </div>

                <RiskScore score={riskScore} size="sm" />
            </div>
        </div>
    );
}
