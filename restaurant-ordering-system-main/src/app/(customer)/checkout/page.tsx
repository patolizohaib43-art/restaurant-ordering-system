import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CheckoutForm } from '@/components/customer/CheckoutForm';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
