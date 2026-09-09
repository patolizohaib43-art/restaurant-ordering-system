'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <AlertTriangle size={40} className="mb-4 text-red-400" />
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-gray-300 px-6 text-sm font-semibold text-gray-700 active:bg-gray-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
