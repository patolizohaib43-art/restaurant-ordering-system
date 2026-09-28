import { OrderDetailClient } from '@/components/admin/OrderDetailClient';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailClient orderId={params.id} />;
}
