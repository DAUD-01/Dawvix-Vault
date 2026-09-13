import React from 'react';
import { BreadcrumbItem } from '../types';
import { ChevronRight, Home, Folder } from 'lucide-react';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onSelectFolder: (folderId: string, index: number) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onSelectFolder }) => {
  return (
    <nav className="flex items-center space-x-1 overflow-x-auto py-2 text-sm text-slate-300">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="flex items-center space-x-1 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mx-1" />
            )}
            <button
              type="button"
              onClick={() => onSelectFolder(item.id, index)}
              disabled={isLast}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                isLast
                  ? 'font-semibold text-teal-400 bg-teal-500/10 cursor-default'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 cursor-pointer'
              }`}
            >
              {index === 0 ? (
                <Home className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              <span className="truncate max-w-[160px]">{item.name}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
};
