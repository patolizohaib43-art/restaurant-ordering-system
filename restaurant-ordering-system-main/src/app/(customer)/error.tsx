'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/ErrorState';

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Customer app error:', error);
  }, [error]);

  return (
    <div className="px-4">
      <ErrorState
        title="Something went wrong"
        message="We couldn't load this page. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
