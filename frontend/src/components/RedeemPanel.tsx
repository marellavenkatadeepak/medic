'use client';

import { useState, useEffect } from 'react';
import { Tag, Video, Stethoscope, Award, Loader2 } from 'lucide-react';
import { Contract, parseUnits } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { RESEARCH_TOKEN_ABI, RESEARCH_TOKEN_ADDRESS } from '@/lib/registries';

interface Reward {
    id: string;
    title: string;
    cost: number;
    icon: React.ReactNode;
    color: string;
}

const REWARDS: Reward[] = [
    {
        id: '1',
        title: 'Telehealth Discount (50%)',
        cost: 200,
        icon: <Stethoscope className="w-5 h-5" />,
        color: 'bg-blue-100 text-blue-700'
    },
    {
        id: '2',
        title: 'Deep AI Health Report',
        cost: 50,
        icon: <Award className="w-5 h-5" />,
        color: 'bg-purple-100 text-purple-700'
    },
    {
        id: '3',
        title: 'Tavus Video Explanation',
        cost: 100,
        icon: <Video className="w-5 h-5" />,
        color: 'bg-orange-100 text-orange-700'
    }
];

interface RedeemPanelProps {
    balance: number;
    onRedeemSuccess?: () => void;
}

export default function RedeemPanel({ balance, onRedeemSuccess }: RedeemPanelProps) {
    const { signer } = useWallet();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [unlockedItems, setUnlockedItems] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('medilock_unlocked_rewards');
        if (saved) setUnlockedItems(JSON.parse(saved));
    }, []);

    const handleRedeem = async (reward: Reward) => {
        if (unlockedItems.includes(reward.id)) {
            alert("You already own this reward!");
            return;
        }

        if (balance < reward.cost) {
            alert("Insufficient MEDI balance!");
            return;
        }

        if (!signer) return;

        try {
            setLoadingId(reward.id);
            const contract = new Contract(RESEARCH_TOKEN_ADDRESS, RESEARCH_TOKEN_ABI, signer);

            // Burn tokens to redeem
            // Note: Ensure ResearchToken has a burn function or transfer to 0x0...dead
            // For standard ERC20 without burn, we can transfer to a "Treasury" or 0 address
            // Let's assume we transfer to a burn address for now to simulate "spending"
            const burnAddress = "0x000000000000000000000000000000000000dEaD";
            const amount = parseUnits(reward.cost.toString(), 18);

            const tx = await contract.transfer(burnAddress, amount);
            await tx.wait();

            // Success Updates
            const newUnlocked = [...unlockedItems, reward.id];
            setUnlockedItems(newUnlocked);
            localStorage.setItem('medilock_unlocked_rewards', JSON.stringify(newUnlocked));

            alert(`UNKNOWN_CONTENT_UNLOCKED: ${reward.title}`);
            if (onRedeemSuccess) onRedeemSuccess();
        } catch (error: any) {
            console.error(error);
            alert("Redemption failed: " + (error.reason || error.message));
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Redeem Rewards
            </h2>

            <div className="space-y-3">
                {REWARDS.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${unlockedItems.includes(reward.id) ? 'bg-green-100 text-green-700' : reward.color}`}>
                                {reward.icon}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-sm">{reward.title}</h4>
                                <span className="text-xs text-gray-500">
                                    {unlockedItems.includes(reward.id) ? 'Purchased' : `${reward.cost} MEDI`}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleRedeem(reward)}
                            disabled={balance < reward.cost || loadingId !== null || unlockedItems.includes(reward.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border flex items-center gap-1 ${unlockedItems.includes(reward.id)
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : balance >= reward.cost
                                    ? 'border-gray-300 text-gray-700 hover:bg-gray-200'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {loadingId === reward.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            {unlockedItems.includes(reward.id) ? 'Access' : 'Redeem'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-xs text-indigo-700 text-center">
                    Earn more MEDI by participating in clinical trials!
                </p>
            </div>
        </div>
    );
}
