'use client';

interface RiskScoreProps {
    score: number;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function RiskScore({ score, size = 'md' }: RiskScoreProps) {
    const getColor = () => {
        if (score <= 25) return { ring: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Low Risk', class: 'risk-low' };
        if (score <= 50) return { ring: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Moderate', class: 'risk-medium' };
        if (score < 75) return { ring: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'High Risk', class: 'risk-high' };
        return { ring: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Critical', class: 'risk-critical' };
    };

    const config = getColor();
    const dims = size === 'xs' ? 44 : size === 'sm' ? 80 : size === 'md' ? 120 : 160;
    const strokeW = size === 'xs' ? 4 : size === 'sm' ? 6 : 8;
    const radius = (dims - strokeW) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`flex flex-col items-center justify-center ${size === 'xs' ? '' : 'gap-2'}`}>
            <div className="relative" style={{ width: dims, height: dims }}>
                <svg width={dims} height={dims} className="-rotate-90">
                    <circle cx={dims / 2} cy={dims / 2} r={radius} stroke="rgba(55,65,81,0.5)" strokeWidth={strokeW} fill="none" />
                    <circle
                        cx={dims / 2} cy={dims / 2} r={radius}
                        stroke={config.ring}
                        strokeWidth={strokeW}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-bold ${config.class} ${size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-lg' : size === 'md' ? 'text-3xl' : 'text-4xl'}`}>
                        {score}
                    </span>
                    {(size !== 'sm' && size !== 'xs') && <span className="text-[10px] text-gray-500 uppercase tracking-wider">/ 100</span>}
                </div>
            </div>
            {size !== 'xs' && (
                <span className={`text-xs font-semibold uppercase tracking-wider ${config.class}`}>{config.label}</span>
            )}
        </div>
    );
}
