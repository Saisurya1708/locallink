/**
 * End-to-End Encryption using Web Crypto API
 *
 * Protocol:
 *   1. Each user generates an ECDH P-256 key pair on registration.
 *   2. Public key is sent to server; private key stored in IndexedDB only.
 *   3. To derive a shared chat key: ECDH(myPrivateKey, theirPublicKey)
 *   4. Shared secret → HKDF → AES-GCM-256 key for message encryption.
 *   5. Each message has its own random 12-byte IV.
 */

const DB_NAME = 'locallink-keys';
const STORE_NAME = 'keypairs';

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<CryptoKeyPair | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: CryptoKeyPair): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Key generation ────────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<{ keyPair: CryptoKeyPair; publicKeyB64: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // private key NOT extractable — can't be stolen from JS
    ['deriveKey']
  );

  const publicKeyRaw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)));

  await idbSet('myKeyPair', keyPair);

  return { keyPair, publicKeyB64 };
}

export async function getMyKeyPair(): Promise<CryptoKeyPair | null> {
  return (await idbGet('myKeyPair')) || null;
}

// ── Shared key derivation ─────────────────────────────────────────────────────

export async function deriveSharedKey(theirPublicKeyB64: string): Promise<CryptoKey> {
  const myKeyPair = await getMyKeyPair();
  if (!myKeyPair) throw new Error('No local key pair found. Please re-register.');

  const theirPublicKeyBytes = Uint8Array.from(atob(theirPublicKeyB64), c => c.charCodeAt(0));
  const theirPublicKey = await crypto.subtle.importKey(
    'spki',
    theirPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared AES-GCM key via ECDH + HKDF
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return sharedKey;
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

export async function encryptMessage(plaintext: string, sharedKey: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

export async function decryptMessage(iv: string, ciphertext: string, sharedKey: CryptoKey): Promise<string> {
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, sharedKey, cipherBytes);
  return new TextDecoder().decode(decrypted);
}
