'use client';

export default function LoadingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute inset-[2px] rounded-[14px] bg-[#0a0b14]" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                </div>
                <p className="text-sm text-gray-500 animate-pulse">Loading MediChain AI...</p>
            </div>
        </div>
    );
}
