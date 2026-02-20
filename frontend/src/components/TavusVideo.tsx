'use client';

import { useState } from 'react';
import { CVIProvider } from './cvi/components/cvi-provider';
import { Conversation } from './cvi/components/conversation';

interface TavusVideoProps {
    summary: string;
    riskScore: number;
    conditions: string[];
    specialist: string;
    urgency: string;
}

export default function TavusVideo({ summary, riskScore, conditions, specialist, urgency }: TavusVideoProps) {
    const [conversationUrl, setConversationUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const createConversation = async () => {
        setStatus('connecting');
        setErrorMsg('');
        try {
            const apiKey = process.env.NEXT_PUBLIC_TAVUS_API_KEY;
            if (!apiKey) throw new Error('Tavus API key not configured');

            // Build context for the AI doctor conversation
            const conversationContext = `You are a friendly AI medical assistant explaining a patient's report results. 
Here is the analysis:
- Summary: ${summary}
- Risk Score: ${riskScore}/100
- Conditions Found: ${conditions.join(', ')}
- Recommended Specialist: ${specialist}
- Urgency Level: ${urgency}

Explain these results clearly and compassionately. Reassure the patient while being honest. 
Suggest next steps and when they should see the ${specialist}.
Do NOT diagnose. You are not replacing a doctor.`;

            const response = await fetch('https://tavusapi.com/v2/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    replica_id: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID || 'rfe12d8b9597',
                    conversation_name: `Medical Report Review - ${new Date().toLocaleDateString()}`,
                    custom_greeting: `Hi there! I've reviewed your medical report. Let me walk you through the findings. ${summary}`,
                    properties: {
                        max_call_duration: 600, // 10 minutes
                    },
                    conversational_context: conversationContext,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Tavus API error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.conversation_url) {
                throw new Error('No conversation URL returned');
            }

            setConversationUrl(data.conversation_url);
            setStatus('active');
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to start conversation');
            console.error('Tavus CVI Error:', err);
        }
    };

    const handleLeave = () => {
        setConversationUrl(null);
        setStatus('idle');
    };

    // Idle state - show start button
    if (status === 'idle') {
        return (
            <button onClick={createConversation} className="w-full glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-cyan-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                </div>
                <div className="text-left">
                    <p className="text-sm font-semibold text-white">Talk to AI Doctor</p>
                    <p className="text-xs text-gray-500">Start a live video conversation about your report</p>
                </div>
            </button>
        );
    }

    // Connecting state
    if (status === 'connecting') {
        return (
            <div className="glass-card p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center pulse-glow">
                    <svg className="animate-spin h-8 w-8 text-cyan-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-white">Connecting to AI Doctor...</p>
                    <p className="text-xs text-gray-500 mt-1">Setting up your video consultation</p>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="glass-card p-5 border-red-500/20">
                <p className="text-sm text-red-400 text-center">{errorMsg}</p>
                <button onClick={createConversation} className="btn-secondary text-sm mt-3 mx-auto block">Try Again</button>
            </div>
        );
    }

    // Active conversation state
    return (
        <CVIProvider>
            <div className="glass-card overflow-hidden">
                <div className="aspect-video bg-black rounded-t-2xl relative">
                    <Conversation
                        conversationUrl={conversationUrl!}
                        onLeave={handleLeave}
                    />
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <div>
                            <p className="text-xs font-semibold text-white">Live AI Doctor Consultation</p>
                            <p className="text-[10px] text-gray-500">Discussing your medical report</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLeave}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                        End Call
                    </button>
                </div>
            </div>
        </CVIProvider>
    );
}
