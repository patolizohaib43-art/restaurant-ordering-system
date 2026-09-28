'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/ErrorState';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="px-4">
      <ErrorState
        title="Something went wrong"
        message="This admin page couldn't load. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
