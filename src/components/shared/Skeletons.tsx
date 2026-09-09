export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-2.5">
      <div className="aspect-square w-full rounded-xl bg-gray-200" />
      <div className="mt-2.5 h-3.5 w-3/4 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
      <div className="mt-2.5 h-4 w-1/3 rounded bg-gray-200" />
    </div>
  );
}

export function CategoryChipSkeleton() {
  return <div className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-gray-200" />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
