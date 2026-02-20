'use client';

interface Stat {
    id: number;
    name: string;
    value: string;
}

interface StatsSectionProps {
    stats: Stat[];
}

export default function StatsSection({ stats }: StatsSectionProps) {
    return (
        <section className="py-16 px-6 border-y border-black bg-retro-accent-yellow/10">
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat) => (
                    <div key={stat.id} className="text-center border-l-2 border-black first:border-l-0 pl-4 md:pl-0">
                        <p className="text-3xl font-black font-mono mb-1 text-black">{stat.value}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{stat.name}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
