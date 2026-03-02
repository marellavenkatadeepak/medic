import os
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Fetch the master key and convert it from hex string to bytes
raw_key = os.getenv("VAULT_MASTER_KEY", "")
try:
    if raw_key:
        MASTER_KEY = bytes.fromhex(raw_key)
    else:
        MASTER_KEY = None
except ValueError:
    MASTER_KEY = None

def encrypt_secret(plain_text: str) -> dict:
    """Encrypt a plain text string using AES-256-GCM."""
    if not MASTER_KEY:
        raise ValueError("VAULT_MASTER_KEY is not set or invalid in .env")
    
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode(), None)
    
    return {
        "nonce": nonce.hex(),
        "ciphertext": ciphertext.hex()
    }

def decrypt_secret(nonce_hex: str, ciphertext_hex: str) -> str:
    """Decrypt a ciphertext back to plain text string using AES-256-GCM."""
    if not MASTER_KEY:
        raise ValueError("VAULT_MASTER_KEY is not set or invalid in .env")
        
    aesgcm = AESGCM(MASTER_KEY)
    nonce = bytes.fromhex(nonce_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    
    plain_text = aesgcm.decrypt(nonce, ciphertext, None)
    return plain_text.decode()
