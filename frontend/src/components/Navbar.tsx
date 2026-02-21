'use client';

import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';

export default function Navbar() {
    const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-0 border-b border-[rgba(99,102,241,0.1)]" style={{ borderRadius: 0 }}>
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold gradient-text">MediChain AI</span>
                </Link>

                <div className="flex items-center gap-5">
                    {isConnected ? (
                        <>
                            <Link href="/patient" className="text-sm text-gray-400 hover:text-white transition-colors">Patient</Link>
                            <Link href="/doctor" className="text-sm text-gray-400 hover:text-white transition-colors">Doctor</Link>
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-xl bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-indigo-300 font-mono">
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </span>
                                </div>
                                <button onClick={disconnect} className="text-sm text-gray-500 hover:text-red-400 transition-colors">
                                    Disconnect
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link href="/register" className="btn-primary text-sm !px-5 !py-2.5">
                            Get Started
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
