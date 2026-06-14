// ─────────────────────────────────────────────────────────────────────────────
// Access-code verification.
//
// The plaintext code is NEVER shipped in the bundle — only a salted
// PBKDF2-SHA256 digest of it. Inspecting the JS in devtools reveals this hash,
// not the code, and the hash can't be reversed by reading it.
//
// Honest caveat: this is a *soft* gate, not real authentication. There is no
// server, so all verification happens client-side; a determined attacker could
// still brute-force a 4-digit code offline. PBKDF2 with a high iteration count
// makes that slow, and the code itself is never exposed.
// ─────────────────────────────────────────────────────────────────────────────

const SALT = 'cuesheet::cutting-room::v1';
const ITERATIONS = 250000;
// PBKDF2-SHA256(code, SALT, 250k, 32 bytes), hex. Computed offline.
const EXPECTED = '3f8028b085e8f4823a5b98ba99c03d89775e08abe475e691e8a20f81a4ab8aca';

/** Length of the access code (not the code itself). */
export const CODE_LEN = 4;

async function pbkdf2Hex(code: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return [...new Uint8Array(bits)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** True when `code` hashes to the expected digest. */
export async function verifyCode(code: string): Promise<boolean> {
  try {
    const hex = await pbkdf2Hex(code);
    if (hex.length !== EXPECTED.length) return false;
    // Length-constant comparison (both are fixed 64-char hex here).
    let diff = 0;
    for (let i = 0; i < hex.length; i++) {
      diff |= hex.charCodeAt(i) ^ EXPECTED.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
