'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected, connect, disconnect, isConnecting, error: walletError } = useWallet();
    const { registerUser, getUserRole } = useContract();

    // Read role from URL (?role=patient or ?role=doctor)
    const urlRole = searchParams.get('role');
    const [selectedRole, setSelectedRole] = useState<1 | 2 | null>(
        urlRole === 'patient' ? 1 : urlRole === 'doctor' ? 2 : null
    );
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [checkingRole, setCheckingRole] = useState(false);

    // When wallet connects, check if already registered
    useEffect(() => {
        if (isConnected) {
            checkExistingRole();
        }
    }, [isConnected]);

    const checkExistingRole = async () => {
        setCheckingRole(true);
        try {
            const role = await getUserRole();
            if (role === 1) { router.push('/patient'); return; }
            if (role === 2) { router.push('/doctor'); return; }
        } catch {
            // Not registered yet or RPC issue
        }
        setCheckingRole(false);
    };

    const handleRegister = async () => {
        if (!selectedRole) return;
        setIsRegistering(true);
        setError('');
        try {
            await registerUser(selectedRole);
            router.push(selectedRole === 1 ? '/patient' : '/doctor');
        } catch (err: any) {
            setError(
                err.message?.includes('user rejected')
                    ? 'You rejected the transaction in MetaMask.'
                    : 'Registration failed. Make sure the smart contract is deployed and you are on the correct network.'
            );
        } finally {
            setIsRegistering(false);
        }
    };

    const roleLabel = selectedRole === 1 ? 'Patient' : selectedRole === 2 ? 'Doctor' : null;
    const roleEmoji = selectedRole === 1 ? '🏥' : '🩺';
    const roleColor = selectedRole === 1 ? 'indigo' : 'cyan';

    return (
        <div className="min-h-screen flex items-center justify-center px-6 pt-20">
            <div className="w-full max-w-md">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center mx-auto mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">
                        {roleLabel ? `Join as ${roleLabel}` : 'Join MediChain AI'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {roleLabel ? `You're registering as a ${roleLabel.toLowerCase()}` : 'Select your role to begin'}
                    </p>
                </div>

                {/* No role selected — show role picker */}
                {!selectedRole && (
                    <div className="space-y-4 animate-slide-up">
                        <p className="text-center text-sm text-gray-400 mb-2">I am a...</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedRole(1)}
                                className="glass-card p-6 text-center hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer"
                            >
                                <div className="text-4xl mb-3">🏥</div>
                                <h3 className="text-lg font-semibold text-black">Patient</h3>
                                <p className="text-xs text-black/60 mt-1">Upload & analyze reports</p>
                            </button>
                            <button
                                onClick={() => setSelectedRole(2)}
                                className="glass-card p-6 text-center hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-300 cursor-pointer"
                            >
                                <div className="text-4xl mb-3">🩺</div>
                                <h3 className="text-lg font-semibold text-black">Doctor</h3>
                                <p className="text-xs text-black/60 mt-1">Review patient records</p>
                            </button>
                        </div>
                        <Link href="/" className="block text-center text-xs text-gray-600 hover:text-gray-400 mt-4">← Back to Home</Link>
                    </div>
                )}

                {/* Role selected but NOT connected — Connect Wallet */}
                {selectedRole && !isConnected && (
                    <div className="space-y-4 animate-slide-up">
                        {/* Role badge */}
                        <div className={`glass-card p-3 flex items-center gap-3 border-${roleColor}-500/20`}>
                            <span className="text-2xl">{roleEmoji}</span>
                            <div className="flex-1">
                                <p className={`text-xs text-${roleColor}-600 font-medium`}>Registering as {roleLabel}</p>
                            </div>
                            <button onClick={() => setSelectedRole(null)} className="text-xs text-gray-500 hover:text-gray-300">Change</button>
                        </div>

                        {/* Connect prompt */}
                        <div className="glass-card p-8 text-center space-y-5">
                            <div className={`w-20 h-20 rounded-full bg-${roleColor}-500/10 border border-${roleColor}-500/20 flex items-center justify-center mx-auto`}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-2">Connect Your Wallet</h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Click below to open MetaMask. Your wallet address is your secure identity on MediChain AI — no passwords needed.
                                </p>
                            </div>

                            <button onClick={connect} disabled={isConnecting} className="btn-primary !py-4 !px-8 text-base w-full">
                                {isConnecting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Opening MetaMask...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">🦊 Connect MetaMask</span>
                                )}
                            </button>

                            {walletError && (
                                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 text-center">
                                    {walletError}
                                </div>
                            )}

                            <div className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-gray-600 text-left space-y-1">
                                <p className="font-medium text-blue-600 mb-1">💡 Don&apos;t have MetaMask?</p>
                                <p>MetaMask is a free browser extension that acts as your digital wallet.</p>
                                <p><a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Download MetaMask here →</a></p>
                            </div>
                        </div>

                        <Link href="/" className="block text-center text-xs text-gray-600 hover:text-gray-400">← Back to Home</Link>
                    </div>
                )}

                {/* Connected — Confirm registration */}
                {selectedRole && isConnected && (
                    <div className="space-y-4 animate-slide-up">
                        {/* Wallet connected badge */}
                        <div className="glass-card p-4 flex items-center gap-3 border-green-500/20">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-green-600 font-medium">Wallet Connected</p>
                                <p className="text-[11px] text-gray-600 font-mono truncate">{address}</p>
                            </div>
                            <button onClick={disconnect} className="text-xs text-gray-500 hover:text-red-400">Disconnect</button>
                        </div>

                        {/* Role reminder */}
                        <div className={`glass-card p-4 flex items-center gap-3 border-${roleColor}-500/20`}>
                            <span className="text-2xl">{roleEmoji}</span>
                            <div className="flex-1">
                                <p className="text-sm text-black font-medium">Registering as {roleLabel}</p>
                                <p className="text-xs text-gray-600">
                                    {selectedRole === 1
                                        ? 'You can upload reports, get AI analysis, and control data access.'
                                        : 'You can view records that patients share with you.'}
                                </p>
                            </div>
                        </div>

                        {/* Register button */}
                        {checkingRole ? (
                            <div className="glass-card p-6 text-center">
                                <svg className="animate-spin h-6 w-6 text-indigo-400 mx-auto mb-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                <p className="text-sm text-gray-400">Checking if you&apos;re already registered...</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleRegister}
                                disabled={isRegistering}
                                className="w-full btn-primary !py-4 text-base"
                            >
                                {isRegistering ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                                        Confirm in MetaMask...
                                    </span>
                                ) : (
                                    `Register as ${roleLabel} on Blockchain`
                                )}
                            </button>
                        )}

                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        <p className="text-[10px] text-gray-600 text-center">
                            This will create a blockchain transaction to register your role. Gas fees may apply.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
