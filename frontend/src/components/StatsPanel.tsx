'use client';

import { Coins, FileText, TrendingUp } from 'lucide-react';

interface StatsPanelProps {
    balance: number;
    contributionCount: number;
}

export default function StatsPanel({ balance, contributionCount }: StatsPanelProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium opacity-90">Total Earnings</h3>
                    <Coins className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold">{balance} MEDI</div>
                <div className="text-xs opacity-75 mt-1">≈ ${balance * 0.10} USD value</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-500">Contributions</h3>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{contributionCount}</div>
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +1 this month
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-500">Research Impact</h3>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">Top 10%</div>
                <div className="text-xs text-gray-500 mt-1">
                    Based on data quality
                </div>
            </div>
        </div>
    );
}
