'use client';

import Link from 'next/link';
import Image from 'next/image';
import Typewriter from '@/components/Typewriter';

export default function HeroSection() {
    return (
        <section className="relative pt-32 pb-24 px-6 overflow-hidden min-h-[85vh] flex items-center justify-center bg-[#fdfbf7]">
            {/* Background Image - Optimized */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image
                    src="https://r2.vidzflow.com/thumbnails/qPWiotOQpN_1762299204.jpg"
                    alt="Medical Background"
                    fill
                    className="object-cover opacity-90"
                    priority
                    sizes="100vw"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fdfbf7]" />
            </div>

            <div className="max-w-5xl mx-auto text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 animate-slide-up bg-white/50 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-medium text-indigo-700">Decentralized Healthcare Intelligence</span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black leading-tight mb-6 animate-slide-up animate-slide-up-delay-1 drop-shadow-sm mix-blend-multiply">
                    <span className="text-black relative inline-block">
                        MediChain AI
                        <span className="absolute -bottom-2 left-0 w-full h-4 bg-retro-accent-pink -z-10 opacity-70 transform -skew-x-12"></span>
                    </span>
                </h1>

                <div className="text-xl md:text-2xl text-gray-800 max-w-3xl mx-auto mb-8 font-bold font-mono animate-slide-up animate-slide-up-delay-2 h-20 flex items-center justify-center">
                    <Typewriter
                        text={[
                            "AI-powered medical analysis secured by blockchain.",
                            "Your health data, fully decentralized.",
                            "Instant AI diagnostics from your reports."
                        ]}
                        speed={40}
                        delay={3000}
                    />
                </div>

                <p className="text-base text-gray-600 max-w-xl mx-auto mb-12 font-medium bg-white/40 p-4 rounded-sm backdrop-blur-sm border border-black/5">
                    Upload medical reports, get instant AI analysis with risk scores, chat with an AI health assistant, and watch personalized video explanations — all with patient-controlled access on-chain.
                </p>

                {/* Who Are You? - Two Doors */}
                <div className="max-w-3xl mx-auto animate-slide-up animate-slide-up-delay-3 mt-12">
                    <h2 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b-2 border-black inline-block pb-1">Select Your Role</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {/* Patient Card */}
                        <Link href="/register?role=patient" className="group retro-card p-8 text-center cursor-pointer relative hover:-translate-y-2 transition-transform bg-white/90 backdrop-blur-sm hover:!bg-[#fff5fb]">
                            <div className="w-20 h-20 border-2 border-black bg-retro-accent-pink mx-auto mb-5 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                                🏥
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-black mb-2">Patient</h3>
                            <p className="text-sm text-gray-800 font-medium leading-relaxed mb-6">
                                Upload reports, get AI analysis, talk to AI doctor, and control who sees your data.
                            </p>
                            <span className="inline-flex items-center gap-2 text-sm text-black font-bold uppercase border-b-2 border-black hover:bg-yellow-200 transition-colors">
                                Get Started <span>→</span>
                            </span>
                        </Link>

                        {/* Doctor Card */}
                        <Link href="/register?role=doctor" className="group retro-card p-8 text-center cursor-pointer relative hover:-translate-y-2 transition-transform bg-white/90 backdrop-blur-sm hover:!bg-[#f0fff4]">
                            <div className="w-20 h-20 border-2 border-black bg-retro-accent-green mx-auto mb-5 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                                🩺
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-black mb-2">Doctor</h3>
                            <p className="text-sm text-gray-800 font-medium leading-relaxed mb-6">
                                View patient records shared with you and review AI-generated analysis.
                            </p>
                            <span className="inline-flex items-center gap-2 text-sm text-black font-bold uppercase border-b-2 border-black hover:bg-yellow-200 transition-colors">
                                Get Started <span>→</span>
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
