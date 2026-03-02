'use client';

import { useState, useRef, useEffect } from 'react';
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
            } catch (err: any) {
                console.error("Error attempting to enable fullscreen:", err);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    };


    const createConversation = async () => {
        setStatus('connecting');
        setErrorMsg('');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const response = await fetch(`${apiUrl}/api/tavus-conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summary,
                    risk_score: riskScore,
                    conditions,
                    specialist,
                    urgency
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 402) {
                    throw new Error('Tavus API Quota Exceeded (402 Payment Required). Please check your API billing or upgrade your plan.');
                }
                throw new Error(errData.detail || `Backend API error: ${response.status}`);
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

    // Idle state
    if (status === 'idle') {
        return (
            <div className="relative flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden text-slate-800 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/40">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Consultation</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-100 to-purple-50 flex items-center justify-center mb-8 shadow-inner border border-white">
                        <span className="text-5xl drop-shadow-sm">⚕️</span>
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">Specialist Review</h3>
                    <p className="text-slate-500 max-w-sm mb-10 text-lg font-medium leading-relaxed">
                        Connect with our AI medical specialist for a detailed walkthrough of your results.
                    </p>
                    <button
                        onClick={createConversation}
                        className="group relative inline-flex items-center justify-center w-full max-w-sm px-8 py-4 font-semibold text-white transition-all duration-300 ease-in-out bg-slate-900 rounded-2xl hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98]"
                    >
                        <span>Initiate Video Call</span>
                        <svg className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            </div>
        );
    }

    // Connecting state
    if (status === 'connecting') {
        return (
            <div className="relative flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden text-slate-800 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/40">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connecting</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10 relative z-10">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-indigo-100 blur-xl opacity-60 animate-pulse"></div>
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg border border-indigo-50/50 relative z-10 animate-spin" style={{ animationDuration: '3s' }}>
                            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-slate-700 text-lg mb-3">Establishing Secure Link</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="relative flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-red-100 overflow-hidden text-slate-800 transition-all duration-300">
                <div className="absolute inset-0 bg-red-50/30 pointer-events-none"></div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-white/60">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    </div>
                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Connection Failed</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-2">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div className="text-center max-w-sm">
                        <p className="text-slate-600 mb-6">{errorMsg || "Unable to establish a connection with the specialist. Let's try that again."}</p>
                    </div>
                    <button
                        onClick={createConversation}
                        className="px-8 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors w-full max-w-sm"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Active conversation
    return (
        <CVIProvider>
            <div ref={containerRef} className={`flex flex-col bg-slate-950 ring-1 ring-slate-800 transition-all duration-300 ${isFullscreen
                ? 'w-full h-full rounded-none'
                : 'relative h-full rounded-3xl shadow-2xl overflow-hidden'
                }`}>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none z-0"></div>

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
                    <div className="flex items-center gap-3 backdrop-blur-md bg-black/40 border border-slate-700 px-4 py-2.5 rounded-full pointer-events-auto shadow-lg shadow-black/20">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                        <span className="text-xs font-semibold text-white tracking-widest uppercase">Live</span>
                        <span className="mx-2 w-px h-3 bg-white/20"></span>
                        <span className="text-xs font-medium text-slate-300">00:00</span>
                    </div>
                </div>

                <div className="flex-1 relative z-10 w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>
                    <div className="w-full h-full [&>div]:w-full [&>div]:h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full">
                        <Conversation
                            conversationUrl={conversationUrl!}
                            onLeave={handleLeave}
                        />
                    </div>
                </div>

                {/* Floating Controls Overlay */}
                <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-6 pointer-events-none">
                    <div className="flex items-center justify-between w-full backdrop-blur-xl bg-slate-900/80 border border-slate-700 p-4 rounded-2xl shadow-2xl pointer-events-auto relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-4 relative">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                <span className="text-xl">👩‍⚕️</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white leading-tight">AI Specialist</span>
                                <span className="text-xs text-indigo-300 font-medium">{specialist}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleFullscreen}
                                className="bg-slate-800 hover:bg-slate-700 text-white p-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center group border border-slate-700 hover:scale-105 active:scale-95"
                                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullscreen ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={handleLeave}
                                className="bg-red-500 hover:bg-red-600 text-white p-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center group border border-red-400/50 hover:scale-105 active:scale-95"
                                aria-label="End Call"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l-8 8m0-8l8 8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </CVIProvider>
    );
}
