export default function DealsLoading() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  );
}
