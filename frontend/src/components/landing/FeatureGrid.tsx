'use client';

// Icons removed to use emojis as per original design and avoid extra dependencies


const features = [
    {
        icon: '🔗',
        title: 'Blockchain Secured',
        desc: 'Every medical record is hashed and stored on-chain with tamper-proof verification.',
        gradient: 'from-indigo-500/20 to-purple-500/20',
    },
    {
        icon: '🤖',
        title: 'AI Medical Analysis',
        desc: 'Advanced AI extracts data from reports and generates risk assessments instantly.',
        gradient: 'from-cyan-500/20 to-blue-500/20',
    },
    {
        icon: '💬',
        title: 'AI Health Assistant',
        desc: 'Context-aware chatbot answers questions about your reports and health.',
        gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    {
        icon: '🎥',
        title: 'AI Doctor Avatar',
        desc: 'Tavus-powered video explanations from a virtual doctor for your reports.',
        gradient: 'from-orange-500/20 to-amber-500/20',
    },
    {
        icon: '🛡️',
        title: 'Patient-Controlled Access',
        desc: 'Grant and revoke doctor access to your records through smart contracts.',
        gradient: 'from-rose-500/20 to-pink-500/20',
    },
    {
        icon: '📊',
        title: 'Risk Intelligence',
        desc: 'Visual risk scores, condition detection, and specialist recommendations.',
        gradient: 'from-violet-500/20 to-fuchsia-500/20',
    },
];

export default function FeatureGrid() {
    return (
        <section id="features" className="py-24 px-6 bg-[#fdfbf7]">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">
                        <span className="gradient-text">Intelligent Healthcare</span> Platform
                    </h2>
                    <p className="text-gray-500 max-w-lg mx-auto font-medium">End-to-end medical intelligence combining AI, blockchain, and decentralized access control.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="retro-card p-8 group bg-white hover:bg-yellow-50 transition-colors">
                            <div className="w-14 h-14 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl mb-6 group-hover:-translate-y-1 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold text-black uppercase mb-3 font-mono tracking-tight">{f.title}</h3>
                            <p className="text-sm text-gray-800 leading-relaxed font-medium">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
