/**
 * IPFS Upload Service
 * 
 * Uses Pinata's public pinning API (free tier) for decentralized file storage.
 * Files are uploaded as encrypted blobs — the gateway just serves raw bytes.
 */

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

/**
 * Upload an encrypted blob to IPFS via Pinata.
 * Returns the IPFS CID (Content Identifier).
 */
export async function uploadToIPFS(
    blob: Blob,
    fileName: string,
    metadata?: Record<string, string>
): Promise<{ cid: string; url: string; size: number }> {
    const formData = new FormData();
    formData.append('file', blob, `${fileName}.encrypted`);

    // Pinata metadata
    const pinataMetadata = JSON.stringify({
        name: `medilock-${fileName}`,
        keyvalues: {
            app: 'medilock',
            encrypted: 'true',
            ...metadata,
        },
    });
    formData.append('pinataMetadata', pinataMetadata);

    // Pin options
    const pinataOptions = JSON.stringify({
        cidVersion: 1,
    });
    formData.append('pinataOptions', pinataOptions);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IPFS upload failed: ${response.status} — ${errorText}`);
    }

    const result: PinataResponse = await response.json();

    return {
        cid: result.IpfsHash,
        url: `${PINATA_GATEWAY}/${result.IpfsHash}`,
        size: result.PinSize,
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
 * Check if Pinata is configured.
 */
export function isIPFSConfigured(): boolean {
    return !!(PINATA_API_KEY && PINATA_SECRET_KEY && !PINATA_API_KEY.includes('your_pinata'));
}
