'use client';

import { useState } from 'react';
import { Contract, BrowserProvider, ethers } from 'ethers';
import { Study } from '@/lib/clinicalTrials';
import { useWallet } from '@/hooks/useWallet';
import { STUDY_REGISTRY_ABI, STUDY_REGISTRY_ADDRESS } from '@/lib/registries';
import { CheckCircle, Activity, ExternalLink, Loader2 } from 'lucide-react';

interface StudyCardProps {
    study: Study;
    onSuccess: () => void;
}

export default function StudyCard({ study, onSuccess }: StudyCardProps) {
    const { signer, isConnected, connect } = useWallet();
    const [loading, setLoading] = useState(false);
    const [participated, setParticipated] = useState(false);

    const protocol = study.protocolSection;
    const title = protocol.identificationModule.briefTitle;
    const status = protocol.statusModule.overallStatus;
    const nctId = protocol.identificationModule.nctId;
    const summary = protocol.descriptionModule.briefSummary;

    const handleParticipate = async () => {
        if (!isConnected) {
            await connect();
            return;
        }

        if (!signer) return;

        try {
            setLoading(true);

            // 1. Create Contract Instance
            const contract = new Contract(STUDY_REGISTRY_ADDRESS, STUDY_REGISTRY_ABI, signer);

            // 2. Generate Privacy-Preserving Hash (Simulated "Zero-Knowledge" Proof)
            // In a real app, this would hash selected medical records locally.
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`contribution-${nctId}-${Date.now()}`));

            // 3. Send Transaction
            const tx = await contract.contribute(nctId, dataHash);
            await tx.wait();

            setParticipated(true);
            onSuccess();
            alert(`Successfully participated! You earned 50 MEDI.\nTransaction Hash: ${tx.hash}`);
        } catch (error: any) {
            console.error(error);
            alert(error.reason || error.message || "Transaction failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${status === 'RECRUITING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {status}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
                </div>
                {participated && <CheckCircle className="text-green-500 w-6 h-6 flex-shrink-0" />}
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {summary}
            </p>

            <div className="flex items-center justify-between mt-auto">
                <a
                    href={`https://clinicaltrials.gov/study/${nctId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    View Details <ExternalLink className="w-3 h-3" />
                </a>

                <button
                    onClick={handleParticipate}
                    disabled={loading || participated}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${participated
                        ? 'bg-green-50 text-green-700 cursor-default'
                        : 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                        </>
                    ) : participated ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Joined
                        </>
                    ) : (
                        <>
                            <Activity className="w-4 h-4" />
                            Join (+50 MEDI)
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
