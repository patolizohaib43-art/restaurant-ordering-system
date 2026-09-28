import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
export const ADMIN_SESSION_COOKIE_NAME =
  process.env.ADMIN_SESSION_COOKIE_NAME ?? 'restaurant_admin_session';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  // Fail loudly in production if the secret is missing rather than
  // silently signing tokens with "undefined".
  throw new Error('JWT_SECRET is not set. Refusing to start in production.');
}

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET || 'insecure-dev-only-secret-do-not-use-in-prod');
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
}

/** Hash a plaintext password before storing it. Never store raw passwords. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 12);
}

/** Compare a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Sign a short-lived admin session JWT. Uses `jose` (not `jsonwebtoken`)
 * because it works identically in the Node.js API routes AND in the Edge
 * runtime used by middleware.ts — a single implementation for both.
 */
export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSecretKey());
}

/** Verify and decode an admin session JWT. Returns null if invalid/expired. */
export async function verifyAdminSession(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.adminId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string' &&
      typeof payload.role === 'string'
    ) {
      return payload as unknown as AdminSessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads the admin session cookie in a Server Component / Route Handler
 * context (Node runtime) and verifies it. Returns null if missing/invalid.
 * Middleware has already blocked unauthenticated requests from reaching
 * this point for anything under /admin or /api/admin — this helper is for
 * routes/pages that additionally need to know WHO is logged in (e.g. to
 * record which admin changed an order's status).
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const { cookies } = await import('next/headers');
  const token = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}
