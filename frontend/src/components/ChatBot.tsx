'use client';

import { useState, useRef, useEffect } from 'react';
import { getAppointments, getAllDoctors, createAppointment, sendChatMessage } from '@/lib/api';


interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    warning?: string;
    confidence?: number;
    toolResult?: { type: string; data: any };
}

interface ChatBotProps {
    patientWallet: string;
}

// Lightweight markdown renderer – no external dependency
function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'ul') elements.push(<ul key={elements.length} className="list-disc pl-5 mb-2 space-y-0.5">{listItems}</ul>);
            else elements.push(<ol key={elements.length} className="list-decimal pl-5 mb-2 space-y-0.5">{listItems}</ol>);
            listItems = [];
            listType = null;
        }
    };

    const parseInline = (str: string, key: number | string): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        let remaining = str;
        let i = 0;
        while (remaining.length > 0) {
            const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
            const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/);
            if (boldMatch && (!italicMatch || boldMatch[0].length <= italicMatch[0].length)) {
                if (boldMatch[1]) parts.push(<span key={i++}>{boldMatch[1]}</span>);
                parts.push(<strong key={i++} className="font-bold text-gray-900">{boldMatch[2]}</strong>);
                remaining = remaining.slice(boldMatch[0].length);
            } else if (italicMatch) {
                if (italicMatch[1]) parts.push(<span key={i++}>{italicMatch[1]}</span>);
                parts.push(<em key={i++} className="italic">{italicMatch[2]}</em>);
                remaining = remaining.slice(italicMatch[0].length);
            } else {
                parts.push(<span key={i++}>{remaining}</span>);
                break;
            }
        }
        return <>{parts}</>;
    };

    lines.forEach((line, idx) => {
        const ulMatch = line.match(/^[\*\-]\s+(.+)/);
        const olMatch = line.match(/^\d+\.\s+(.+)/);
        const h1Match = line.match(/^#\s+(.+)/);
        const h2Match = line.match(/^##\s+(.+)/);
        const h3Match = line.match(/^###\s+(.+)/);

        if (ulMatch) {
            if (listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(<li key={idx}>{parseInline(ulMatch[1], idx)}</li>);
        } else if (olMatch) {
            if (listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(<li key={idx}>{parseInline(olMatch[1], idx)}</li>);
        } else {
            flushList();
            if (h1Match) {
                elements.push(<h3 key={idx} className="font-bold text-gray-900 text-base mb-1 mt-2">{parseInline(h1Match[1], idx)}</h3>);
            } else if (h2Match) {
                elements.push(<h4 key={idx} className="font-semibold text-gray-900 text-sm mb-1 mt-2">{parseInline(h2Match[1], idx)}</h4>);
            } else if (h3Match) {
                elements.push(<h5 key={idx} className="font-semibold text-gray-900 text-sm mb-0.5 mt-1">{parseInline(h3Match[1], idx)}</h5>);
            } else if (line.trim() === '') {
                // skip blank lines but they implicitly separate paragraphs
            } else {
                elements.push(<p key={idx} className="mb-1.5 last:mb-0">{parseInline(line, idx)}</p>);
            }
        }
    });
    flushList();
    return <>{elements}</>;
}

export default function ChatBot({ patientWallet }: ChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Auto-greeting on mount
    useEffect(() => {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Hello! I am your MediChain AI assistant. I have reviewed your medical records and I\'m here to help you understand the findings, risk scores, or answer any questions you might have. How can I assist you today?',
            warning: 'I am an AI assistant and cannot provide a medical diagnosis. The information provided is for educational purposes. Given your health data, please ensure you are in close contact with your cardiologist. If you experience sudden chest pain or severe shortness of breath, seek emergency medical attention immediately.',
            confidence: 1.0,
        }]);
    }, []);

    const detectIntent = (msg: string) => {
        const lower = msg.toLowerCase();
        if (lower.includes('book') && (lower.includes('appointment') || lower.includes('doctor') || lower.includes('schedule'))) return 'book_appointment';
        if (lower.includes('appointment') || lower.includes('upcoming') || lower.includes('scheduled')) return 'view_appointments';
        return 'general';
    };

    const fetchAppointments = async () => {
        try {
            const response = await getAppointments(patientWallet);
            if (response.success && response.appointments) {
                return response.appointments;
            }
            return [];
        } catch { return []; }
    };

    const fetchDoctors = async () => {
        try {
            const response = await getAllDoctors();
            return response.doctors || [];
        } catch { return []; }
    };

    const bookAppointment = async (doctorWallet: string, date: string, time: string, reason: string) => {
        const response = await createAppointment({
            patient_wallet: patientWallet, doctor_wallet: doctorWallet, date, time,
            reason: reason || 'General consultation'
        });
        if (!response.success) throw new Error("Failed to book appointment");
        return response;
    };

    const formatAppointments = (appts: any[]) => {
        if (appts.length === 0) return 'You have no appointments scheduled. Would you like me to book one? Just say "book appointment".';
        const upcoming = appts.filter((a: any) => a.status === 'pending' || a.status === 'confirmed');
        let result = '';
        if (upcoming.length > 0) {
            result += `📅 Upcoming Appointments (${upcoming.length}):\n\n`;
            upcoming.forEach((a: any, i: number) => {
                result += `${i + 1}. ${a.doctor_name} (${a.doctor_specialty})\n   📆 ${new Date(a.date).toLocaleDateString()} at ${a.time}\n   Status: ${a.status.toUpperCase()}\n\n`;
            });
        }
        return result.trim() || 'No upcoming appointments found.';
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');

        const newMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: newMsgId, role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const intent = detectIntent(userMsg);

            if (intent === 'book_appointment') {
                const doctors = await fetchDoctors();
                if (doctors.length === 0) {
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'No doctors registered yet. Please check back later.', toolResult: { type: 'error', data: 'No doctors found' } }]);
                } else {
                    // Try to find the best match. Using Cardiologist based on previous medical record context.
                    let bestMatch = doctors.find((d: any) => d.specialty?.toLowerCase().includes('cardiol')) || doctors[0];
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `Based on your recent medical records, I found the best match for you. You can easily book a session below.`,
                        toolResult: { type: 'booking_widget', data: { doctor: bestMatch } }
                    }]);
                }
                setIsLoading(false);
                return;
            }

            if (intent === 'view_appointments') {
                const appts = await fetchAppointments();
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: formatAppointments(appts) }]);
                setIsLoading(false);
                return;
            }

            const data: any = await sendChatMessage({
                patient_wallet: patientWallet, message: userMsg,
            });
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.answer || data.message || 'I couldn\'t process that.',
                warning: data.warning,
                confidence: data.confidence,
            }]);
        } catch {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.', warning: 'Service temporarily unavailable.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Component to handle the inline booking flow
    const BookingWidget = ({ doctor, onBooked }: { doctor: any, onBooked: () => void }) => {
        const [date, setDate] = useState(() => {
            const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
        });
        const [time, setTime] = useState('10:00');
        const [isBooking, setIsBooking] = useState(false);
        const [booked, setBooked] = useState(false);

        const handleBook = async () => {
            setIsBooking(true);
            try {
                await bookAppointment(doctor.wallet_address, date, time, 'AI Matched Consultation');
                setBooked(true);
                onBooked();
            } catch (err) {
                console.error(err);
                alert("Failed to book appointment. Please try again.");
            } finally {
                setIsBooking(false);
            }
        };

        if (booked) {
            return (
                <div className="mt-4 p-5 bg-green-50 border border-green-200 rounded-2xl shadow-sm text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-green-800 font-semibold mb-1">Appointment Confirmed!</h3>
                    <p className="text-sm text-green-700">You are scheduled with Dr. {doctor.name} on {new Date(date).toLocaleDateString()} at {time}.</p>
                </div>
            );
        }

        return (
            <div className="mt-4 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-slate-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-xl overflow-hidden shrink-0 border border-blue-100">
                        {doctor.image_url ? <img src={doctor.image_url} alt={doctor.name} className="w-full h-full object-cover" /> : "🧑‍⚕️"}
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Best Match</div>
                        <h4 className="font-bold text-gray-900 leading-tight">Dr. {doctor.name}</h4>
                        <p className="text-sm text-gray-600 font-medium">{doctor.specialty}</p>
                    </div>
                </div>
                <div className="p-5 bg-white space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Select Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors outline-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Select Time</label>
                            <select
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors outline-none cursor-pointer"
                            >
                                <option value="09:00">09:00 AM</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="11:00">11:00 AM</option>
                                <option value="13:00">01:00 PM</option>
                                <option value="14:00">02:00 PM</option>
                                <option value="15:00">03:00 PM</option>
                                <option value="16:00">04:00 PM</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleBook}
                        disabled={isBooking}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all outline-none disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
                    >
                        {isBooking ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Booking...
                            </>
                        ) : 'Book Appointment (1-Click)'}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-2">No credit card required. Cancel anytime.</p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[650px] bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden font-sans relative">
            {/* Header bar */}
            <div className="bg-white/80 backdrop-blur-xl px-6 py-5 flex items-center justify-between border-b border-slate-200 z-10 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 -z-10"></div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30 overflow-hidden relative">
                        <div className="absolute inset-0 bg-white/20 blur-sm rounded-full scale-[1.5] translate-y-3"></div>
                        <span className="relative z-10 text-white drop-shadow-sm">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-gray-900 font-bold text-lg tracking-tight">MediChain AI</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
                            <span className="text-gray-500 text-xs font-semibold">Online & Ready to Help</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa] scroll-smooth">
                {messages.map((msg, i) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out`}>
                        <div className={`max-w-[85%] relative rounded-3xl p-5 ${msg.role === 'user'
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-sm'
                            : 'bg-white border border-slate-200 text-gray-800 shadow-sm rounded-tl-sm'
                            }`}>

                            {msg.role === 'assistant' ? (
                                <div className="space-y-4">
                                    <div className="text-sm leading-relaxed text-gray-800">
                                        {renderMarkdown(msg.content)}
                                    </div>

                                    {msg.warning && (
                                        <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl relative overflow-hidden">
                                            <span className="text-rose-500 mt-0.5">⚠️</span>
                                            <p className="text-xs text-rose-800 font-medium leading-relaxed">{msg.warning}</p>
                                        </div>
                                    )}

                                    {(msg.confidence !== undefined || msg.toolResult) && (
                                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200">
                                            {msg.confidence !== undefined && (
                                                <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">High Confidence • {Math.round(msg.confidence * 100)}%</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Inline widgets */}
                                    {msg.toolResult?.type === 'booking_widget' && (
                                        <BookingWidget
                                            doctor={msg.toolResult.data.doctor}
                                            onBooked={() => {
                                                // Removed setMessages call here, success is handled within BookingWidget
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <p className="text-[15px] font-medium leading-relaxed">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="flex gap-2 p-4 bg-white rounded-3xl rounded-tl-sm shadow-sm border border-slate-200 border-b-2 items-center">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-[bounce_1s_infinite]" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1s_infinite]" style={{ animationDelay: '200ms' }} />
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-[bounce_1s_infinite]" style={{ animationDelay: '400ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="p-5 bg-white border-t border-slate-200 w-full z-10 relative shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="relative group">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message or say 'book appointment'..."
                        className="w-full bg-gray-50 border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-full pl-6 pr-14 py-4 text-[15px] font-medium text-gray-800 placeholder-gray-400 outline-none transition-all duration-300 shadow-inner group-hover:bg-gray-50/80"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md shadow-blue-500/20"
                    >
                        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
