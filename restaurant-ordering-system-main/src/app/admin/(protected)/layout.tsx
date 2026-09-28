import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { AdminSessionProvider } from '@/components/admin/AdminSessionProvider';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';
import { Footer } from '@/components/shared/Footer';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  // Middleware already blocks unauthenticated requests from reaching here,
  // but this is a deliberate second layer of defense: if middleware were
  // ever misconfigured or bypassed, this server-side check still holds.
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <AdminSessionProvider
      session={{ id: session.adminId, name: session.name, email: session.email, role: session.role }}
    >
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AdminTopBar />
        <main className="flex-1 pb-24">{children}</main>
        <Footer variant="admin" />
        <AdminBottomNav />
      </div>
    </AdminSessionProvider>
  );
}
