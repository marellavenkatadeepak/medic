'use client';

import { useState } from 'react';
import TrendChart from '@/components/TrendChart';
import RiskProgressChart from '@/components/RiskProgressChart';
import HealthTimeline from '@/components/HealthTimeline';
import WearableControl from './WearableControl';
import Link from 'next/link';

// Define Recharts types locally to avoid complex import issues if they arise
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface HealthViewProps {
    records: any[];
    address: string;
    refreshTrigger: number;
}

export default function HealthView({ records, address, refreshTrigger }: HealthViewProps) {
    const [wearableData, setWearableData] = useState<any>(null);
    const [liveHeartRate, setLiveHeartRate] = useState<{ time: string; bpm: number }[]>([]);

    const handleWearableUpdate = (data: any) => {
        setWearableData(data);
        if (data.status === 'connected') {
            setLiveHeartRate(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    bpm: data.heartRate
                };
                // Keep last 20 points
                return [...prev.slice(-19), newPoint];
            });
        }
    };

    return (
        <div className="space-y-8">
            {/* Real-time Wearable Section */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <WearableControl onDataUpdate={handleWearableUpdate} />
                </div>
                <div className="md:col-span-2 retro-card p-4 border-2 border-black bg-white flex flex-col justify-center">
                    <h4 className="font-bold uppercase text-xs mb-2 flex justify-between">
                        <span>❤️ Live Heart Rate Monitor</span>
                        {wearableData?.status === 'connected' ? (
                            <span className="text-red-500 animate-pulse">● LIVE</span>
                        ) : (
                            <span className="text-gray-400">OFFLINE</span>
                        )}
                    </h4>
                    <div className="h-[150px] w-full bg-gray-50 border border-gray-200">
                        {wearableData?.status === 'connected' && liveHeartRate.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={liveHeartRate}>
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#000',
                                            border: 'none',
                                            color: '#fff',
                                            fontFamily: 'monospace',
                                            fontSize: '12px'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="bpm"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-xs font-mono">
                                {wearableData?.status === 'connected' ? 'WAITING FOR DATA...' : 'CONNECT DEVICE TO VIEW LIVE STREAM'}
                            </div>
                        )}
                    </div>
                    {wearableData?.status === 'connected' && (
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                            <div className="bg-blue-50 p-2 border border-blue-200">
                                <div className="text-[10px] text-blue-500 uppercase font-bold">Steps</div>
                                <div className="text-lg font-black font-mono">{wearableData.steps}</div>
                            </div>
                            <div className="bg-orange-50 p-2 border border-orange-200">
                                <div className="text-[10px] text-orange-500 uppercase font-bold">Cals</div>
                                <div className="text-lg font-black font-mono">{wearableData.calories}</div>
                            </div>
                            <div className="bg-indigo-50 p-2 border border-indigo-200">
                                <div className="text-[10px] text-indigo-500 uppercase font-bold">Sleep</div>
                                <div className="text-lg font-black font-mono">{wearableData.sleepHours}h</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Historical Trends */}
            <div className="border-2 border-black p-4 bg-white">
                <h3 className="font-bold uppercase mb-4 text-center bg-black text-white py-1">Biomarker Trends (Historical)</h3>
                <TrendChart records={records} />
            </div>

            <div className="border-2 border-black p-4 bg-white">
                <h3 className="font-bold uppercase mb-4 text-center bg-black text-white py-1">Risk Trends</h3>
                <RiskProgressChart patientWallet={address} refreshTrigger={refreshTrigger} />
            </div>

            <div>
                <h3 className="font-bold uppercase tracking-wider mb-4 border-l-4 border-retro-accent-pink pl-3">Health Timeline</h3>
                <HealthTimeline patientWallet={address} refreshTrigger={refreshTrigger} />
            </div>
        </div>
    );
}
