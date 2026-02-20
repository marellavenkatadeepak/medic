import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/hooks/useWallet';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'MediChain AI — Decentralized Healthcare Intelligence',
  description: 'AI-powered blockchain-secured medical record platform with intelligent analysis, chatbot, and AI doctor avatar.',
  keywords: ['medical records', 'blockchain', 'AI analysis', 'healthcare', 'decentralized', 'Web3'],
  openGraph: {
    title: 'MediChain AI — Decentralized Healthcare Intelligence',
    description: 'Upload medical reports, get AI analysis, and secure records on blockchain.',
    type: 'website',
  },
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh" aria-hidden="true" />
        <WalletProvider>
          <Navbar />
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
