import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { getOrderByTrackingToken } from '@/lib/queries';
import { getPublicSettings } from '@/lib/settings';
import { CopyTrackingLink } from '@/components/customer/CopyTrackingLink';
import { RecentOrderRecorder } from '@/components/customer/RecentOrderRecorder';
import { formatCurrency } from '@/utils';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage({ params }: { params: { token: string } }) {
  const [order, settings] = await Promise.all([
    getOrderByTrackingToken(params.token),
    getPublicSettings(),
  ]);

  if (!order) notFound();

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/track/${params.token}`;

  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <RecentOrderRecorder token={params.token} orderNumber={order.orderNumber} />
      <CheckCircle2 size={64} className="text-green-500" />
      <h1 className="mt-4 text-xl font-bold text-gray-900">Order Placed!</h1>
      <p className="mt-1.5 text-sm text-gray-500">
        Thank you, {order.customerName}. Your order has been received.
      </p>

      <div className="mt-6 w-full rounded-2xl border border-gray-100 bg-white p-5 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-400">Order Number</span>
          <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-400">Total</span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(order.totalAmount, settings.currency)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-400">Payment</span>
          <span className="text-sm font-medium text-gray-700">
            {order.orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Cash on Pickup'}
          </span>
        </div>
      </div>

      <p className="mt-5 text-sm text-gray-500">
        Save your tracking link to follow your order&apos;s progress:
      </p>
      <div className="mt-2 w-full break-all rounded-xl bg-gray-100 px-3.5 py-2.5 text-xs text-gray-600">
        /track/{params.token}
      </div>

      <div className="mt-4 flex w-full gap-3">
        <CopyTrackingLink url={trackingUrl} />
        <Link
          href={`/track/${params.token}`}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white active:bg-brand-700"
        >
          Track Order
        </Link>
      </div>

      <Link href="/menu" className="mt-6 text-sm font-medium text-gray-500 underline">
        Continue browsing the menu
      </Link>
    </div>
  );
}
