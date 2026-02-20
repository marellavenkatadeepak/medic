'use client';

import { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface Analysis {
    created_at: string;
    biomarkers?: Record<string, string>;
}

interface TrendChartProps {
    records: Analysis[];
}

export default function TrendChart({ records }: TrendChartProps) {
    // 1. Extract all unique biomarker keys
    const availableMetrics = useMemo(() => {
        const keys = new Set<string>();
        records.forEach(r => {
            if (r.biomarkers) {
                Object.keys(r.biomarkers).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).sort();
    }, [records]);

    const [selectedMetric, setSelectedMetric] = useState<string>(availableMetrics[0] || '');

    // 2. Prepare data for the chart
    const chartData = useMemo(() => {
        if (!selectedMetric) return [];

        return records
            .filter(r => r.biomarkers && r.biomarkers[selectedMetric])
            .map(r => {
                // Parse value (e.g. "12.5 g/dL" -> 12.5)
                const rawValue = r.biomarkers![selectedMetric];
                const cleanValue = parseFloat(rawValue.replace(/[^0-9.]/g, ''));

                return {
                    date: new Date(r.created_at).toLocaleDateString(),
                    // Use specific timestamp for sorting if needed, but display friendly date
                    timestamp: new Date(r.created_at).getTime(),
                    value: isNaN(cleanValue) ? null : cleanValue,
                    original: rawValue,
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
    }, [records, selectedMetric]);

    if (availableMetrics.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500 italic">
                No biomarker data found in your records yet. Upload a report to see trends!
            </div>
        );
    }

    return (
        <div className="w-full bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wider text-sm">Vital Trends</h3>
                <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="border-2 border-black px-2 py-1 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-retro-accent-pink"
                >
                    {availableMetrics.map(m => (
                        <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                </select>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="date"
                            stroke="#000"
                            fontSize={10}
                            tickMargin={10}
                        />
                        <YAxis
                            stroke="#000"
                            fontSize={10}
                        />
                        <Tooltip
                            contentStyle={{
                                border: '2px solid black',
                                borderRadius: '0px',
                                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
                            }}
                            itemStyle={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                            formatter={(value: any, name: any, props: any) => [props.payload.original || value, selectedMetric.toUpperCase()]}
                            labelStyle={{ textTransform: 'uppercase', fontSize: '10px', marginBottom: '5px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#DB2777" // retro-accent-pink
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, stroke: '#000', fill: '#DB2777' }}
                            activeDot={{ r: 6, stroke: '#000' }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center font-mono">
                * Values extracted automatically from uploaded reports.
            </p>
        </div>
    );
}
