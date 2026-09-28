export default function TrackLoading() {
  return (
    <div className="animate-pulse px-4 py-5">
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="mt-2 h-3.5 w-64 max-w-full rounded bg-gray-200" />
      <div className="mt-4 space-y-2">
        <div className="h-16 rounded-2xl bg-gray-100" />
        <div className="h-16 rounded-2xl bg-gray-100" />
      </div>
      <div className="mt-6 h-48 rounded-2xl bg-gray-100" />
    </div>
  );
}
