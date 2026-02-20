'use client';

import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import VideoSection from '@/components/landing/VideoSection';
import FeatureGrid from '@/components/landing/FeatureGrid';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import Footer from '@/components/landing/Footer';

const stats = [
  { id: 1, name: 'Transactions every 24 hours', value: '44 million' },
  { id: 2, name: 'Assets under management', value: '$119 trillion' },
  { id: 3, name: 'New users annually', value: '46,000' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-grid">
      <HeroSection />
      {/* The StatsSection component would typically consume this array as a prop */}
      <StatsSection stats={stats} />
      <VideoSection />
      <FeatureGrid />
      <HowItWorksSection />
      <Footer />
    </div>
  );
}
