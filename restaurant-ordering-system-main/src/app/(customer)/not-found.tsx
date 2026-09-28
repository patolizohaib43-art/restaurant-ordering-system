import { EmptyState } from '@/components/shared/EmptyState';
import { SearchX } from 'lucide-react';

export default function CustomerNotFound() {
  return (
    <div className="px-4">
      <EmptyState
        icon={<SearchX size={40} />}
        title="Page not found"
        message="The page you're looking for doesn't exist or may have moved."
        actionHref="/"
        actionLabel="Go to Home"
      />
    </div>
  );
}
