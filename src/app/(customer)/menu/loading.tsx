import { ProductGridSkeleton } from '@/components/shared/Skeletons';

export default function MenuLoading() {
  return (
    <div className="px-4 py-4">
      <div className="mb-4 h-11 animate-pulse rounded-xl bg-gray-100" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
