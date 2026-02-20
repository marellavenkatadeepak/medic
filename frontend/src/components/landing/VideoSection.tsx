'use client';

import Link from 'next/link';

export default function VideoSection() {
    return (
        <section className="relative py-32 px-6 overflow-hidden border-b border-black">
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-90"
                >
                    <source src="https://cdn.prod.website-files.com/68c8e57d6e512b9573db146f%2F6902ce6861ec08546c002822_Grid%20Animation%20Loop%20Reverse-transcode.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
                <h2 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg">
                    The Future of Health is <span className="text-retro-accent-green">Decentralized</span>
                </h2>
                <p className="text-xl text-gray-200 mb-10 font-bold max-w-2xl mx-auto leading-relaxed">
                    Experience a new era where AI meets Blockchain. Secure, intelligent, and completely in your control.
                </p>
                <Link
                    href="/register"
                    className="inline-block px-8 py-4 bg-retro-accent-yellow border-2 border-black text-black font-bold uppercase text-lg shadow-[6px_6px_0px_0px_white] hover:shadow-[2px_2px_0px_0px_white] hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                    Join the Revolution
                </Link>
            </div>
        </section>
    );
}
