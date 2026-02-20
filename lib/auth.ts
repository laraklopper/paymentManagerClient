// lib/auth.ts
// Handles JWT creation and verification using the `jose` library.
// These functions are called server-side only (login route and middleware).

import { SignJWT, jwtVerify } from 'jose'

// Reads JWT_SECRET from the environment and encodes it as bytes for `jose`.
// Throws at call-time (not module load time) so the error surface is clear.
const getSecret = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET env var is not set')
  // jose requires the secret as a Uint8Array, not a plain string
  return new TextEncoder().encode(s)
}

// Creates a signed JWT containing the user's email and role.
// The token is signed with HMAC-SHA256 (HS256) and expires after 8 hours,
// which aligns with a standard working day so sessions don't linger overnight.
export async function signToken(payload: { email: string; role: 'admin' | 'loader' }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' }) // Signing algorithm declared in the JWT header
    .setExpirationTime('8h')               // Token becomes invalid 8 hours after issuance
    .sign(getSecret())
}

// Verifies a JWT string and returns the decoded payload.
// Throws if the token is invalid, tampered with, or expired —
// the middleware's catch block handles that case by clearing the session cookie.
export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret())
  // Cast to the known payload shape; jwtVerify already confirmed the signature
  return payload as { email: string; role: 'admin' | 'loader' }
}
