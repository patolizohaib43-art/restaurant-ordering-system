import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { ReceiptView } from '@/components/admin/receipt/ReceiptView';
import '@/components/admin/receipt/receipt.css';

export const metadata = {
  title: 'Print Receipt',
};

export default async function AdminReceiptPage({ params }: { params: { id: string } }) {
  // Middleware already blocks unauthenticated requests to /admin/*, but
  // this route intentionally skips the (protected) layout (no top bar,
  // no bottom nav) so nothing but the receipt can ever end up on paper.
  // This server-side check keeps that shortcut safe.
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return <ReceiptView orderId={params.id} />;
}
