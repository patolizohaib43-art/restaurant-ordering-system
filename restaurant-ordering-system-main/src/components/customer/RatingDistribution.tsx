interface RatingDistributionProps {
  distribution: { star: number; count: number }[];
  total: number;
}

/** Renders the 5★→1★ breakdown bars shown under the average rating. */
export function RatingDistribution({ distribution, total }: RatingDistributionProps) {
  const max = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-1.5">
      {distribution.map((d) => (
        <div key={d.star} className="flex items-center gap-2 text-xs">
          <span className="w-6 shrink-0 text-gray-500">{d.star}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: total > 0 ? `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%` : '0%' }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-gray-400">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
