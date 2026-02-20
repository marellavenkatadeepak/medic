'use client';

import Image from 'next/image';

export default function NewsletterSection() {
    return (
        <section className="relative py-24 px-6 border-t font-sans overflow-hidden bg-[#fdfbf7]">
            {/* Grid Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <Image
                    src="https://cdn.prod.website-files.com/68c8e57d6e512b9573db146f/68c8e57e6e512b9573db1a4c_newsletter%20grid.svg"
                    alt="Grid Background"
                    fill
                    className="object-cover"
                />
            </div>

            <div className="max-w-4xl mx-auto relative z-10 text-center">
                <div className="retro-card p-12 bg-[#e6e6fa] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-300">
                    <h2 className="text-5xl md:text-6xl font-serif font-bold mb-6 text-black tracking-tighter">
                        Subscribe onto<br />Our Newsletter
                    </h2>

                    <form className="flex flex-col sm:flex-row gap-0 mt-8 max-w-md mx-auto relative">
                        <input
                            type="email"
                            placeholder="ENTER YOUR EMAIL"
                            className="flex-1 bg-white border-2 border-black p-4 font-mono text-sm placeholder:text-gray-500 focus:outline-none uppercase tracking-wider h-14"
                        />
                        <button
                            type="submit"
                            className="bg-[#ff6b6b] hover:bg-[#ff5252] text-black font-bold uppercase px-8 border-2 border-l-0 sm:border-l-0 border-t-0 sm:border-t-2 border-black h-14 tracking-widest text-sm transition-colors"
                            style={{ borderLeftWidth: '0px' }} // Force no left border on desktop
                        >
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>

            {/* Accessibility Icon Bottom Left (Decorative mimic) */}
            <div className="absolute bottom-6 left-6 z-20">
                <div className="w-10 h-10 rounded-full bg-[#ff6b6b] border-2 border-black flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                        <circle cx="12" cy="5" r="3" /> {/* Head */}
                        <path d="M12 8v16" /> {/* Body */}
                        <path d="M5 12h14" /> {/* Arms */}
                    </svg>
                </div>
            </div>
        </section>
    );
}
