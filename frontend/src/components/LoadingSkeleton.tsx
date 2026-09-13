import React from 'react';

export const LoadingSkeleton: React.FC<{ isGrid?: boolean }> = ({ isGrid = false }) => {
  if (isGrid) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4 h-32"
          >
            <div className="h-8 w-8 rounded-lg bg-slate-800" />
            <div>
              <div className="h-4 w-3/4 rounded bg-slate-800 mb-2" />
              <div className="h-3 w-1/3 rounded bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/60 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 w-1/2">
            <div className="h-6 w-6 rounded bg-slate-800 shrink-0" />
            <div className="h-4 w-3/5 rounded bg-slate-800" />
          </div>
          <div className="h-4 w-16 rounded bg-slate-800/60 hidden sm:block" />
          <div className="h-4 w-24 rounded bg-slate-800/40 hidden md:block" />
          <div className="h-8 w-20 rounded bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
};
