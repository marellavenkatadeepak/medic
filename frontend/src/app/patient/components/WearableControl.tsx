'use client';

import { useState, useEffect } from 'react';

interface WearableData {
    heartRate: number;
    steps: number;
    calories: number;
    sleepHours: number;
    oxygenLevel: number; // SpO2
    status: 'connected' | 'disconnected' | 'syncing';
    lastSync: Date | null;
}

export default function WearableControl({ onDataUpdate }: { onDataUpdate: (data: WearableData) => void }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [data, setData] = useState<WearableData>({
        heartRate: 0,
        steps: 0,
        calories: 0,
        sleepHours: 0,
        oxygenLevel: 0,
        status: 'disconnected',
        lastSync: null
    });

    // Simulation Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isConnected && isSimulating) {
            interval = setInterval(() => {
                const newData: WearableData = {
                    ...data,
                    // Simulate random fluctuations
                    heartRate: Math.floor(60 + Math.random() * 40), // 60-100 BPM
                    oxygenLevel: Math.floor(95 + Math.random() * 4), // 95-99%
                    steps: (data.steps || 2500) + Math.floor(Math.random() * 10), // Increment steps
                    calories: (data.calories || 150) + Math.floor(Math.random() * 2),
                    sleepHours: 7.5, // Static for now
                    status: 'connected',
                    lastSync: new Date()
                };
                setData(newData);
                onDataUpdate(newData);
            }, 3000); // Update every 3 seconds
        }

        return () => clearInterval(interval);
    }, [isConnected, isSimulating, data.steps]); // Dep on steps to keep incrementing

    const handleConnect = () => {
        setIsConnected(true);
        setIsSimulating(true);
        const initialData = {
            heartRate: 72,
            steps: 2500,
            calories: 150,
            sleepHours: 7.5,
            oxygenLevel: 98,
            status: 'connected' as const,
            lastSync: new Date()
        };
        setData(initialData);
        onDataUpdate(initialData);
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setIsSimulating(false);
        setData(prev => ({ ...prev, status: 'disconnected', heartRate: 0 }));
    };

    const handleSimulateEvent = (type: 'panic' | 'workout') => {
        if (!isConnected) return;
        const eventData = { ...data };
        if (type === 'panic') {
            eventData.heartRate = 145; // Tachycardia
            eventData.oxygenLevel = 88; // Low oxygen
        } else if (type === 'workout') {
            eventData.heartRate = 120;
            eventData.calories += 50;
        }
        setData(eventData);
        onDataUpdate(eventData);
    };

    return (
        <div className="retro-card p-4 border-2 border-dashed border-gray-400 bg-gray-50">
            <h4 className="font-bold text-xs uppercase mb-3 flex items-center justify-between">
                <span>🤖 Wearable Simulator</span>
                {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
            </h4>

            {!isConnected ? (
                <button
                    onClick={handleConnect}
                    className="w-full bg-black text-white py-2 text-xs font-bold uppercase hover:bg-gray-800"
                >
                    Connect Mock Device
                </button>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className="bg-white border border-black p-1">
                            <span className="block text-gray-500 text-[10px]">HR</span>
                            <span className="font-bold text-lg">{data.heartRate}</span> <span className="text-[10px]">bpm</span>
                        </div>
                        <div className="bg-white border border-black p-1">
                            <span className="block text-gray-500 text-[10px]">SpO2</span>
                            <span className="font-bold text-lg">{data.oxygenLevel}</span> <span className="text-[10px]">%</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSimulateEvent('panic')}
                            className="flex-1 bg-red-100 text-red-800 border border-red-300 py-1 text-[10px] font-bold hover:bg-red-200"
                        >
                            Trigger "Panic"
                        </button>
                        <button
                            onClick={() => handleSimulateEvent('workout')}
                            className="flex-1 bg-blue-100 text-blue-800 border border-blue-300 py-1 text-[10px] font-bold hover:bg-blue-200"
                        >
                            Trigger "Workout"
                        </button>
                    </div>

                    <button
                        onClick={handleDisconnect}
                        className="w-full text-gray-500 text-[10px] underline hover:text-red-500"
                    >
                        Disconnect Device
                    </button>
                </div>
            )}
        </div>
    );
}
