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

    // Suppress non-fatal RPC polling errors from ethers.js and Web3-related errors
    useEffect(() => {
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const msg = typeof args[0] === 'string' ? args[0] : '';
            const isErrorObject = args[0] instanceof Error;
            
            // Suppress known non-fatal Web3 errors
            const errMsg = isErrorObject ? args[0].message : msg;
            const suppression = [
                'could not coalesce error',
                'RPC endpoint returned too many errors',
                'LavaMoat',
                'Unexpected token',
                'SES_UNCAUGHT_EXCEPTION',
                'Failed to load resource',
                'ChunkLoadError',
                'atomFamily is deprecated'
            ];
            
            if (suppression.some(s => errMsg.includes(s))) {
                return; // Suppress known non-fatal errors
            }
            originalConsoleError.apply(console, args);
        };
        
        // Add global window error listener for non-fatal errors
        const handleError = (event: ErrorEvent) => {
            const err = event.message;
            if (err.includes('ChunkLoadError') || err.includes('Failed to load') || err.includes('undefined') && err.includes('Sketchfab')) {
                event.preventDefault(); // Prevent default error handling
            }
        };
        
        window.addEventListener('error', handleError);
        
        return () => {
            console.error = originalConsoleError;
            window.removeEventListener('error', handleError);
        };
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
