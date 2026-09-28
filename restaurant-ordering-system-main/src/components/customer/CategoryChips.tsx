'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';

export interface CategoryChipData {
  id: string;
  name: string;
  slug: string;
}

export function CategoryChips({ categories }: { categories: CategoryChipData[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href="/menu"
        className={cn(
          'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
          pathname === '/menu'
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-gray-200 bg-white text-gray-700'
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = pathname === `/category/${category.slug}`;
        return (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
              isActive
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-200 bg-white text-gray-700'
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
