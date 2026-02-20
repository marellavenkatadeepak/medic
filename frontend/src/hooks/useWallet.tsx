'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

interface WalletContextType {
    address: string | null;
    signer: JsonRpcSigner | null;
    provider: BrowserProvider | null;
    isConnecting: boolean;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    error: string | null;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    signer: null,
    provider: null,
    isConnecting: false,
    isConnected: false,
    connect: async () => { },
    disconnect: () => { },
    error: null,
});

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Suppress non-fatal RPC polling errors from ethers.js
    useEffect(() => {
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const msg = typeof args[0] === 'string' ? args[0] : '';
            if (msg.includes('could not coalesce error') || msg.includes('RPC endpoint returned too many errors')) {
                return; // Suppress noisy RPC polling errors
            }
            originalConsoleError.apply(console, args);
        };
        return () => { console.error = originalConsoleError; };
    }, []);

    const connect = useCallback(async () => {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            setError('MetaMask is not installed. Please install it to continue.');
            return;
        }

        try {
            setIsConnecting(true);
            setError(null);
            const browserProvider = new BrowserProvider((window as any).ethereum);
            await browserProvider.send('eth_requestAccounts', []);
            const walletSigner = await browserProvider.getSigner();
            const walletAddress = await walletSigner.getAddress();

            setProvider(browserProvider);
            setSigner(walletSigner);
            setAddress(walletAddress);
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setAddress(null);
        setSigner(null);
        setProvider(null);
    }, []);

    // Listen for account/network changes only
    useEffect(() => {
        if (typeof window === 'undefined' || !(window as any).ethereum) return;

        const eth = (window as any).ethereum;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnect();
            } else {
                setAddress(accounts[0]);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        eth.on('accountsChanged', handleAccountsChanged);
        eth.on('chainChanged', handleChainChanged);

        return () => {
            eth.removeListener('accountsChanged', handleAccountsChanged);
            eth.removeListener('chainChanged', handleChainChanged);
        };
    }, [disconnect]);

    return (
        <WalletContext.Provider
            value={{ address, signer, provider, isConnecting, isConnected: !!address, connect, disconnect, error }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => useContext(WalletContext);
