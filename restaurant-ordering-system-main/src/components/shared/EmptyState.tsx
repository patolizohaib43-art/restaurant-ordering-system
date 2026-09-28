import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ icon, title, message, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1.5 max-w-xs text-sm text-gray-500">{message}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white active:bg-brand-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
