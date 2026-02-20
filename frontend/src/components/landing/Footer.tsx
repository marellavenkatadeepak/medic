'use client';

export default function Footer() {
    return (
        <footer className="py-12 px-6 border-t border-gray-800/50 bg-[#fdfbf7]">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                    </div>
                    <span className="text-sm font-semibold gradient-text font-mono">MediChain AI</span>
                </div>
                <p className="text-xs text-gray-600 font-medium">© {new Date().getFullYear()} MediChain AI. For educational purposes only. Not medical advice.</p>
            </div>
        </footer>
    );
}
