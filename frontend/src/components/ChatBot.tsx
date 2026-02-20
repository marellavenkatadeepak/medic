'use client';

import { useState, useRef, useEffect } from 'react';
import { insforge } from '@/lib/insforge';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    warning?: string;
    confidence?: number;
}

interface ChatBotProps {
    patientWallet: string;
}

export default function ChatBot({ patientWallet }: ChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const { data, error } = await insforge.functions.invoke('medical-chatbot', {
                body: { patient_wallet: patientWallet, message: userMsg },
            });

            if (error) throw error;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer || data.message || 'I couldn\'t process that request.',
                warning: data.warning,
                confidence: data.confidence,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                warning: 'Service temporarily unavailable.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-card flex flex-col h-[500px]">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Medical AI Assistant</h3>
                    <p className="text-[10px] text-gray-500">Powered by MediChain AI</p>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                        </div>
                        <p className="text-sm text-gray-400">Ask me about your medical reports,<br />risk scores, or health questions.</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-3 ${msg.role === 'user' ? 'chat-user text-white' : 'chat-assistant text-gray-200'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            {msg.warning && (
                                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="mt-0.5 shrink-0">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    <p className="text-xs text-yellow-300/80">{msg.warning}</p>
                                </div>
                            )}
                            {msg.confidence !== undefined && (
                                <p className="mt-1 text-[10px] text-gray-500">Confidence: {Math.round(msg.confidence * 100)}%</p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="chat-assistant px-4 py-3">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask about your health report..."
                        className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="btn-primary !px-4 !py-3 disabled:opacity-40">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
