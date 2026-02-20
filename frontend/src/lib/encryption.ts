/**
 * Client-Side AES-256 Encryption Utility
 * 
 * Zero-Trust Model: Files are encrypted on the client before upload.
 * The encryption key is NEVER stored on the server — only the user controls it.
 */

import CryptoJS from 'crypto-js';

/**
 * Generate a cryptographically random encryption key (256-bit).
 * Returns a hex string.
 */
export function generateEncryptionKey(): string {
    const keySize = 256 / 32; // 8 words = 256 bits
    const key = CryptoJS.lib.WordArray.random(keySize);
    return key.toString(CryptoJS.enc.Hex);
}

/**
 * Encrypt a file's ArrayBuffer with AES-256-CBC.
 * Returns the ciphertext as a base64 string and the IV used.
 */
export function encryptData(data: ArrayBuffer, key: string): { ciphertext: string; iv: string } {
    const wordArray = CryptoJS.lib.WordArray.create(data as any);
    const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

    const encrypted = CryptoJS.AES.encrypt(wordArray, CryptoJS.enc.Hex.parse(key), {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    return {
        ciphertext: encrypted.toString(), // base64 encoded
        iv: iv.toString(CryptoJS.enc.Hex),
    };
}

/**
 * Decrypt a base64 ciphertext back to a UTF-8 string (for text-based files / analysis).
 * Used server-side or when the user wants to view their own file.
 */
export function decryptData(ciphertext: string, key: string, iv: string): string {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Decrypt ciphertext back to raw bytes (Uint8Array) — for binary files.
 */
export function decryptToBytes(ciphertext: string, key: string, iv: string): Uint8Array {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    const words = decrypted.words;
    const sigBytes = decrypted.sigBytes;
    const bytes = new Uint8Array(sigBytes);

    for (let i = 0; i < sigBytes; i++) {
        bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return bytes;
}

/**
 * Hash the encryption key (SHA-256) for verification purposes.
 * This can be stored in the database to verify a key matches without storing the key itself.
 */
export function hashKey(key: string): string {
    return CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypt a File object and return a Blob ready for upload.
 * Prepends the IV to the encrypted data for easy retrieval.
 */
export async function encryptFile(file: File, key: string): Promise<{ encryptedBlob: Blob; iv: string; keyHash: string }> {
    const buffer = await file.arrayBuffer();
    const { ciphertext, iv } = encryptData(buffer, key);

    // Create a blob with the encrypted data
    const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' });

    return {
        encryptedBlob,
        iv,
        keyHash: hashKey(key),
    };
}

/**
 * Fetch a file from IPFS, decrypt it, and return a Blob.
 */
export async function decryptFileFromIPFS(cid: string, key: string, iv: string, mimeType: string = 'application/pdf'): Promise<Blob> {
    // 1. Fetch from IPFS (using public gateway for now, or configured one)
    const gateway = "https://gateway.pinata.cloud/ipfs";
    const response = await fetch(`${gateway}/${cid}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    const ciphertext = await response.text();

    // 2. Decrypt
    const decryptedArgs = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    // 3. Convert to TypedArray
    const words = decryptedArgs.words;
    const sigBytes = decryptedArgs.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    // 4. Create Blob
    return new Blob([u8], { type: mimeType });
}
