/**
 * IPFS Upload Service
 * 
 * Uses Pinata's public pinning API (free tier) for decentralized file storage.
 * Files are uploaded as encrypted blobs — the gateway just serves raw bytes.
 */

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BackendIpfsResponse {
    success: boolean;
    cid: string;
    url: string;
    size: number;
}

/**
 * Upload an encrypted blob to IPFS via the local API Backend proxy.
 * Ensures secret API keys are never exposed to the frontend browser.
 */
export async function uploadToIPFS(
    blob: Blob,
    fileName: string,
    metadata?: Record<string, string>
): Promise<{ cid: string; url: string; size: number }> {
    const formData = new FormData();
    formData.append('file', blob, `${fileName}.encrypted`);

    // Pinata metadata (optional for the proxy, but backend accepts it)
    const pinataMetadata = JSON.stringify({
        name: `medilock-${fileName}`,
        keyvalues: {
            app: 'medilock',
            encrypted: 'true',
            ...metadata,
        },
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
        cidVersion: 1,
    });
    formData.append('pinataOptions', pinataOptions);

    // Call the local backend securely
    const response = await fetch(`${API_URL}/api/ipfs/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend IPFS proxy failed: ${response.status} — ${errorText}`);
    }

    const result: BackendIpfsResponse = await response.json();

    if (!result.success || !result.cid) {
        throw new Error(`Backend IPFS proxy invalid response`);
    }

    return {
        cid: result.cid,
        url: `${PINATA_GATEWAY}/${result.cid}`, // Construct public URL using gateway
        size: result.size,
    };
}

/**
 * Fetch encrypted data from IPFS using a CID.
 * Returns the raw text (base64-encoded ciphertext).
 */
export async function fetchFromIPFS(cid: string): Promise<string> {
    const url = `${PINATA_GATEWAY}/${cid}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`IPFS fetch failed: ${response.status}`);
    }

    return response.text();
}

/**
 * Get the public IPFS URL for a CID.
 */
export function getIPFSUrl(cid: string): string {
    return `${PINATA_GATEWAY}/${cid}`;
}

/**
 * Check if IPFS upload is supported.
 * Since credentials are now securely managed on the backend, this is assumed true
 * assuming the backend is running.
 */
export function isIPFSConfigured(): boolean {
    return true;
}
