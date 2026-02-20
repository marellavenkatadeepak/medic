'use client';

export default function MedicalDisclaimer() {
    return (
        <div className="glass-card p-4 border-yellow-500/10">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-yellow-400 mb-1">Medical Disclaimer</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        MediChain AI provides AI-powered analysis for informational purposes only. It is <strong className="text-gray-400">not a substitute</strong> for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.
                    </p>
                </div>
            </div>
        </div>
    );
}
