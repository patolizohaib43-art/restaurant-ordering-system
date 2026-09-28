import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { adminLoginSchema } from '@/validation/schemas';
import { verifyPassword, signAdminSession, ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches default JWT_EXPIRES_IN

// Brute-force protection: 10 attempts per IP per 15 minutes. See
// src/lib/rate-limit.ts for the documented single-instance limitation
// on serverless hosts.
const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = rateLimit(`login:${ip}`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
    if (!limitResult.success) {
      return apiError('Too many login attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid login details.');
    }

    const { email, password } = parsed.data;

    const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Deliberately generic error message — never reveal whether the email
    // exists, to avoid account enumeration.
    if (!admin || !admin.isActive) {
      return apiError('Invalid email or password.', 401);
    }

    const passwordOk = await verifyPassword(password, admin.passwordHash);
    if (!passwordOk) {
      return apiError('Invalid email or password.', 401);
    }

    const token = await signAdminSession({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const res = NextResponse.json({
      success: true,
      data: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });

    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return res;
  } catch (error) {
    console.error('POST /api/admin/auth/login failed:', error);
    return apiError('Could not sign in. Please try again.', 500);
  }
}
