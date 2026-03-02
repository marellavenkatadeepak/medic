'use client';

import { useState, useEffect } from 'react';
import { getAllDoctors } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';

interface Doctor {
    id: string;
    wallet_address: string;
    name: string;
    specialty: string;
    bio: string;
    created_at: string;
}

export default function DoctorsPage() {
    const { address, isConnected } = useWallet();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All');

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        setIsLoading(true);
        try {
            const { doctors: data } = await getAllDoctors();
            if (data) setDoctors(data as Doctor[]);
        } catch (err) {
            console.error('Failed to load doctors:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const specialties = ['All', ...new Set(doctors.map(d => d.specialty))];

    const filteredDoctors = doctors.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
        const matchesSpecialty = selectedSpecialty === 'All' || d.specialty === selectedSpecialty;
        return matchesSearch && matchesSpecialty;
    });

    const specialtyColors: Record<string, string> = {
        'Cardiology': 'from-red-500/20 to-pink-500/20 text-red-400 border-red-500/20',
        'Neurology': 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/20',
        'Dermatology': 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/20',
        'Orthopedics': 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/20',
        'Endocrinology': 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/20',
        'General Practice': 'from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/20',
    };

    const specialtyIcons: Record<string, string> = {
        'Cardiology': '❤️',
        'Neurology': '🧠',
        'Dermatology': '🧴',
        'Orthopedics': '🦴',
        'Endocrinology': '🧬',
        'General Practice': '🩺',
        'Oncology': '🎗️',
        'Pediatrics': '👶',
        'Psychiatry': '🧠',
        'Radiology': '📡',
        'Surgery': '🔬',
        'Pulmonology': '🫁',
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Find a Doctor</h1>
                    <p className="text-sm text-gray-500 max-w-lg mx-auto">
                        Browse registered doctors on MediChain AI. Grant them access to your medical records for consultation.
                    </p>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="flex-1 relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or specialty..."
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {specialties.map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedSpecialty(s)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${selectedSpecialty === s
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results count */}
                <p className="text-xs text-gray-600 mb-4">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found</p>

                {/* Doctor Cards */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-6 animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4" />
                                <div className="h-4 bg-gray-800 rounded w-2/3 mx-auto mb-2" />
                                <div className="h-3 bg-gray-800 rounded w-1/2 mx-auto mb-4" />
                                <div className="h-12 bg-gray-800 rounded" />
                            </div>
                        ))}
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 text-2xl">🔍</div>
                        <p className="text-sm text-gray-400">No doctors found matching your search.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDoctors.map(doc => {
                            const colors = specialtyColors[doc.specialty] || 'from-gray-500/20 to-gray-600/20 text-gray-400 border-gray-500/20';
                            const icon = specialtyIcons[doc.specialty] || '🩺';
                            return (
                                <div key={doc.id} className="glass-card p-6 hover:border-indigo-500/30 transition-all duration-300 group">
                                    {/* Avatar */}
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors.split(' ')[0]} ${colors.split(' ')[1]} flex items-center justify-center mx-auto mb-4 text-2xl group-hover:scale-110 transition-transform`}>
                                        {icon}
                                    </div>

                                    {/* Name & Specialty */}
                                    <h3 className="text-lg font-semibold text-black text-center mb-1">{doc.name}</h3>
                                    <div className="flex justify-center mb-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-medium border bg-gradient-to-r ${colors}`}>
                                            {doc.specialty}
                                        </span>
                                    </div>

                                    {/* Bio */}
                                    <p className="text-xs text-gray-600 text-center leading-relaxed mb-4 line-clamp-3">
                                        {doc.bio || 'No bio provided.'}
                                    </p>

                                    {/* Wallet */}
                                    <div className="bg-gray-800/5 rounded-lg p-2.5 mb-4 border border-gray-200">
                                        <p className="text-[10px] text-gray-600 text-center font-mono">
                                            {doc.wallet_address.slice(0, 10)}...{doc.wallet_address.slice(-8)}
                                        </p>
                                    </div>

                                    {/* Copy Address Button */}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(doc.wallet_address);
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-xs font-medium hover:bg-indigo-500/20 transition-all"
                                    >
                                        📋 Copy Wallet Address
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* How it works */}
                <div className="mt-16 glass-card p-8">
                    <h2 className="text-lg font-semibold text-black mb-4 text-center">How Doctor Access Works</h2>
                    <div className="grid sm:grid-cols-3 gap-6">
                        {[
                            { step: '1', title: 'Find a doctor', desc: 'Browse the directory and copy their wallet address.', icon: '🔍' },
                            { step: '2', title: 'Grant access', desc: 'Go to your Patient dashboard, select a report, and paste the doctor\'s wallet address in Access Control.', icon: '🔐' },
                            { step: '3', title: 'Doctor reviews', desc: 'The doctor can now see your AI analysis, risk scores, and conditions in their dashboard.', icon: '📊' },
                        ].map(s => (
                            <div key={s.step} className="text-center">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
                                    {s.step}
                                </div>
                                <h3 className="text-sm font-semibold text-black mb-1">{s.title}</h3>
                                <p className="text-xs text-gray-600">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
