import { Loader2 } from 'lucide-react';

// This is the default Suspense fallback for the customer route group —
// it only appears for the home page itself and for any nested route that
// doesn't define its own more specific loading.tsx (menu, deals, category,
// and product already do). Kept generic on purpose so it never shows
// mismatched skeleton content for a page it wasn't designed for.
export default function CustomerSegmentLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="animate-spin text-gray-300" size={28} />
    </div>
  );
}
