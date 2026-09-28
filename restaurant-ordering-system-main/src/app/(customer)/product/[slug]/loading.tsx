export default function ProductLoading() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] w-full bg-gray-200" />
      <div className="px-4 py-4">
        <div className="h-5 w-2/3 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-1/3 rounded bg-gray-200" />
        <div className="mt-4 h-16 w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}
