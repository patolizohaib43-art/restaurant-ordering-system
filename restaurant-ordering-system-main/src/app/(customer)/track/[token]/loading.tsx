import { Loader2 } from 'lucide-react';

export default function TrackOrderLoading() {
  return (
    <div className="flex h-96 items-center justify-center" role="status" aria-label="Loading order status">
      <Loader2 className="animate-spin text-gray-300" size={28} />
    </div>
  );
}
