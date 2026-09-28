import { cookies } from 'next/headers';
import { apiSuccess, apiError } from '@/lib/api-response';
import { verifyAdminSession, ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const token = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return apiError('Not authenticated.', 401);

  const session = await verifyAdminSession(token);
  if (!session) return apiError('Session expired.', 401);

  return apiSuccess({
    id: session.adminId,
    name: session.name,
    email: session.email,
    role: session.role,
  });
}
