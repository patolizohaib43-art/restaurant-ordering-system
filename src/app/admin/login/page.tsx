import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { LoginForm } from '@/components/admin/LoginForm';

export default async function AdminLoginPage() {
  // Already logged in? Skip straight to the dashboard.
  const session = await getAdminSession();
  if (session) redirect('/admin');

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
