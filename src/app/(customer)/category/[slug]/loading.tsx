import { ProductGridSkeleton } from '@/components/shared/Skeletons';

export default function CategoryLoading() {
  return (
    <div className="px-4 py-4">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-100" />
      <ProductGridSkeleton count={6} />
    </div>
  );
}
