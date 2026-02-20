'use client';

import { useState, useEffect } from 'react';
import { Contract, formatUnits } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { fetchClinicalTrials, Study } from '@/lib/clinicalTrials';
import { RESEARCH_TOKEN_ABI, RESEARCH_TOKEN_ADDRESS, STUDY_REGISTRY_ABI, STUDY_REGISTRY_ADDRESS } from '@/lib/registries';
import StudyCard from '@/components/StudyCard';
import StatsPanel from '@/components/StatsPanel';
import RedeemPanel from '@/components/RedeemPanel';
import Navbar from '@/components/Navbar';
import { Loader2, Search } from 'lucide-react';

export default function ResearchPage() {
    const { signer, address, isConnected, connect } = useWallet();
    const [studies, setStudies] = useState<Study[]>([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [contributions, setContributions] = useState(0);
    const [searchQuery, setSearchQuery] = useState("diabetes"); // Default query

    // Fetch Studies
    useEffect(() => {
        const loadStudies = async () => {
            setLoading(true);
            const data = await fetchClinicalTrials(searchQuery);
            setStudies(data);
            setLoading(false);
        };
        loadStudies();
    }, [searchQuery]);

    // Fetch Blockchain Data (Balance & Contributions)
    const refreshBlockchainData = async () => {
        if (!signer || !address) return;

        try {
            // 1. Get Balance
            const tokenContract = new Contract(RESEARCH_TOKEN_ADDRESS, RESEARCH_TOKEN_ABI, signer);
            const bal = await tokenContract.balanceOf(address);
            setBalance(Number(formatUnits(bal, 18))); // Assuming 18 decimals

            // 2. Get Contributions
            const registryContract = new Contract(STUDY_REGISTRY_ADDRESS, STUDY_REGISTRY_ABI, signer);
            const count = await registryContract.getContributionCount(address);
            setContributions(Number(count));
        } catch (error) {
            console.error("Error fetching blockchain data:", error);
        }
    };

    useEffect(() => {
        if (isConnected) {
            refreshBlockchainData();
        }
    }, [isConnected, signer, address]);

    return (
        <main className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">MediMatch Research Hub</h1>
                    <p className="text-gray-600 mt-2">Contribute to medical science and earn rewards for your data.</p>
                </header>

                {/* Stats & Connection */}
                {!isConnected ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center mb-8">
                        <h2 className="text-xl font-semibold text-blue-900 mb-2">Connect to Earn Rewards</h2>
                        <p className="text-blue-700 mb-4">Connect your wallet to track earnings and participate in studies.</p>
                        <button
                            onClick={connect}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <StatsPanel balance={balance} contributionCount={contributions} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content: Studies */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search clinical trials (e.g., 'cancer', 'heart disease')..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        ) : studies.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {studies.map((study) => (
                                    <StudyCard
                                        key={study.protocolSection.identificationModule.nctId}
                                        study={study}
                                        onSuccess={refreshBlockchainData}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No studies found for "{searchQuery}". Try a different term.
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Redeem */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <RedeemPanel balance={balance} onRedeemSuccess={refreshBlockchainData} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
