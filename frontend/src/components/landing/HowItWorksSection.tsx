'use client';

import Image from 'next/image';

export default function HowItWorksSection() {
    return (
        <section className="relative py-24 px-6 bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent overflow-hidden">
            {/* Texture Background */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-multiply">
                <Image
                    src="https://cdn.prod.website-files.com/68c8e57d6e512b9573db146f/68e7b2dcdd75a7584b6cc8fa_sl-bg.png"
                    alt="Texture Background"
                    fill
                    className="object-cover"
                />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <h2 className="text-3xl font-bold text-center mb-16">
                    How <span className="gradient-text">MediChain AI</span> Works
                </h2>
                <div className="space-y-8">
                    {[
                        { step: '01', title: 'Choose Your Role', desc: 'Are you a patient or a doctor? Pick your role to get started.' },
                        { step: '02', title: 'Connect Wallet', desc: 'Link your MetaMask wallet — your wallet is your secure identity.' },
                        { step: '03', title: 'Upload Report', desc: 'Patients drag and drop medical reports (PDF, images).' },
                        { step: '04', title: 'AI Analysis', desc: 'AI extracts text, analyzes conditions, generates risk score and specialist recommendations.' },
                        { step: '05', title: 'Explore Results', desc: 'Chat with AI assistant, talk to AI doctor, and manage who can access your records.' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-6 retro-card p-6 bg-white/90 backdrop-blur-sm">
                            <div className="w-12 h-12 border-2 border-black bg-retro-accent-yellow flex items-center justify-center text-black font-black text-lg shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {item.step}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-black mb-1 uppercase">{item.title}</h3>
                                <p className="text-sm text-gray-800 font-medium">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
