import React from 'react';

/**
 * Loading placeholders for List and Grid views.
 * Restores animations and layout geometry matching FileRow and FileCard. (LOD-001 - LOD-008)
 */
export const LoadingSkeleton: React.FC<{ isGrid?: boolean }> = ({ isGrid = false }) => {
  if (isGrid) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading files"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 motion-safe:animate-pulse"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-36 flex-col justify-between rounded-lg border border-outline/[0.08] bg-surface-variant/40 p-4"
          >
            {/* Top row: Checkbox, Badge & Action placeholder */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded bg-outline/[0.15]" />
                <div className="h-8 w-8 rounded-lg bg-outline/[0.15]" />
              </div>
              <div className="h-7 w-7 rounded-md bg-outline/[0.12]" />
            </div>

            {/* Bottom row: Name & Metadata */}
            <div className="mt-4">
              <div className="h-4 w-3/4 rounded bg-outline/[0.18] mb-2" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-outline/[0.12]" />
                <div className="h-3.5 w-12 rounded-md bg-outline/[0.14]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading files"
      className="divide-y divide-outline/[0.07] motion-safe:animate-pulse"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 px-4 sm:px-6">
          {/* File Name + Checkbox + Icon */}
          <div className="flex items-center gap-3 w-2/5 min-w-0">
            <div className="h-4 w-4 rounded bg-outline/[0.15] shrink-0" />
            <div className="h-7 w-7 rounded-lg bg-outline/[0.15] shrink-0" />
            <div className="flex flex-col gap-1.5 w-full">
              <div className="h-4 w-4/5 rounded bg-outline/[0.18]" />
              <div className="h-2.5 w-24 rounded bg-outline/[0.1] sm:hidden" />
            </div>
          </div>

          {/* Size */}
          <div className="hidden sm:block w-20">
            <div className="h-3.5 w-14 rounded bg-outline/[0.12]" />
          </div>

          {/* Type Badge */}
          <div className="hidden md:block w-20">
            <div className="h-4 w-14 rounded-md bg-outline/[0.14]" />
          </div>

          {/* Date */}
          <div className="hidden lg:block w-28">
            <div className="h-3.5 w-20 rounded bg-outline/[0.12]" />
          </div>

          {/* Action buttons placeholder */}
          <div className="flex items-center gap-1.5 justify-end w-24">
            <div className="h-7 w-7 rounded-lg bg-outline/[0.12]" />
            <div className="h-7 w-7 rounded-lg bg-outline/[0.14]" />
          </div>
        </div>
      ))}
    </div>
  );
};
