'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPatientRecords } from '@/lib/api';

interface DataPoint {
    date: string;
    score: number;
    fileName: string;
}

interface RiskProgressChartProps {
    patientWallet: string;
    refreshTrigger?: number;
}

export default function RiskProgressChart({ patientWallet, refreshTrigger = 0 }: RiskProgressChartProps) {
    const [data, setData] = useState<DataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [patientWallet, refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { records: analyses } = await getPatientRecords(patientWallet);
            if (analyses) {
                const sorted = [...analyses].sort((a: any, b: any) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setData(sorted.map((a: any) => ({
                    date: a.created_at,
                    score: a.risk_score,
                    fileName: a.file_name,
                })));
            }
        } catch (err) {
            console.error('Failed to load chart data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Chart dimensions
    const width = 600;
    const height = 200;
    const paddingX = 40;
    const paddingY = 30;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;

    const points = useMemo(() => {
        if (data.length === 0) return [];
        if (data.length === 1) {
            return [{ x: paddingX + chartW / 2, y: paddingY + chartH - (data[0].score / 100) * chartH }];
        }
        return data.map((d, i) => ({
            x: paddingX + (i / (data.length - 1)) * chartW,
            y: paddingY + chartH - (d.score / 100) * chartH,
        }));
    }, [data]);

    const linePath = useMemo(() => {
        if (points.length < 2) return '';
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }, [points]);

    // Simple pattern for area fill
    const areaPath = useMemo(() => {
        if (points.length < 2) return '';
        const base = paddingY + chartH;
        return `${linePath} L ${points[points.length - 1].x} ${base} L ${points[0].x} ${base} Z`;
    }, [linePath, points]);

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#ef4444'; // red
        if (score >= 50) return '#f97316'; // orange
        if (score >= 30) return '#f59e0b'; // yellow
        return '#10b981'; // green
    };

    const avgScore = data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length)
        : 0;

    const trend = data.length >= 2
        ? data[data.length - 1].score - data[0].score
        : 0;

    if (isLoading) {
        return (
            <div className="border-2 border-black p-8 text-center bg-white">
                <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-xs font-mono uppercase">Loading metrics...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="border-2 border-black p-8 text-center bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-2xl block mb-2">📈</span>
                <p className="text-xs font-bold uppercase">No data available</p>
            </div>
        );
    }

    return (
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-black">Analysis History</h3>
                    <p className="text-xs font-mono text-gray-500 mt-1">{data.length} REPORTS SCANNED</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-gray-500">Average Risk</p>
                        <p className={`text-2xl font-black font-mono`} style={{ color: getScoreColor(avgScore) }}>{avgScore}</p>
                    </div>
                    {data.length >= 2 && (
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-gray-500">Trend</p>
                            <p className={`text-2xl font-black font-mono flex items-center gap-1 ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
                                {Math.abs(trend)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* SVG Chart */}
            <div className="relative border border-black bg-gray-50">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: '180px' }}>

                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(v => {
                        const y = paddingY + chartH - (v / 100) * chartH;
                        return (
                            <g key={v}>
                                <line x1={paddingX} y1={y} x2={paddingX + chartW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                <text x={paddingX - 8} y={y + 3} textAnchor="end" fill="#000" fontSize="10" fontFamily="monospace" fontWeight="bold">{v}</text>
                            </g>
                        );
                    })}

                    {/* Area fill - Retro pattern or solid opacity */}
                    {areaPath && <path d={areaPath} fill="#000" fillOpacity="0.05" />}

                    {/* Line */}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="#000"
                            strokeWidth="3"
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                        />
                    )}

                    {/* Data points */}
                    {points.map((p, i) => (
                        <g key={i}>
                            {/* Point */}
                            <rect
                                x={p.x - (hoveredIndex === i ? 6 : 3)}
                                y={p.y - (hoveredIndex === i ? 6 : 3)}
                                width={hoveredIndex === i ? 12 : 6}
                                height={hoveredIndex === i ? 12 : 6}
                                fill={getScoreColor(data[i].score)}
                                stroke="#000"
                                strokeWidth="2"
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />

                            {/* Date labels on X axis - simplified */}
                            {(data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
                                <text x={p.x} y={paddingY + chartH + 20} textAnchor="middle" fill="#000" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                    {new Date(data[i].date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && points[hoveredIndex] && (
                    <div
                        className="absolute bg-white border-2 border-black px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 min-w-[150px]"
                        style={{
                            left: `${(points[hoveredIndex].x / width) * 100}%`,
                            top: `${(points[hoveredIndex].y / height) * 100 - 10}%`,
                            transform: 'translate(-50%, -100%)',
                        }}
                    >
                        <p className="font-bold text-xs uppercase text-black mb-1 line-clamp-1">{data[hoveredIndex].fileName}</p>
                        <div className="flex justify-between items-end border-t border-black pt-1 mt-1">
                            <span className="text-[10px] font-mono text-gray-500">{new Date(data[hoveredIndex].date).toLocaleDateString()}</span>
                            <span className="text-sm font-black" style={{ color: getScoreColor(data[hoveredIndex].score) }}>{data[hoveredIndex].score}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
