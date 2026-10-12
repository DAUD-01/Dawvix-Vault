import React, { useState } from 'react';
import { BreadcrumbItem } from '../types';
import { ChevronRight, Home, Folder } from 'lucide-react';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onSelectFolder: (folderId: string, index: number) => void;
  onDropOnFolder?: (targetFolderId: string, itemIds: string[]) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onSelectFolder,
  onDropOnFolder,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (index === items.length - 1) return; // Can't drop on current folder
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string, index: number) => {
    if (index === items.length - 1) return;
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && onDropOnFolder) {
        const parsed = JSON.parse(dataStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onDropOnFolder(folderId, parsed);
        }
      }
    } catch (err) {
      console.warn('Drop parse error:', err);
    }
  };

  return (
    <nav className="flex items-center space-x-1 overflow-x-auto py-1 text-xs text-slate-300">
      <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-0.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isDragOver = dragOverIndex === index;

          return (
            <div key={`${item.id}_${index}`} className="flex items-center shrink-0">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-slate-600 shrink-0 mx-0.5" />
              )}
              <button
                type="button"
                onClick={() => onSelectFolder(item.id, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id, index)}
                disabled={isLast}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all ${
                  isDragOver
                    ? 'border border-dashed border-teal-400 bg-teal-500/25 text-teal-300 scale-105 shadow-md'
                    : isLast
                    ? 'font-semibold text-teal-300 bg-teal-500/10 cursor-default shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] cursor-pointer'
                }`}
              >
                {index === 0 ? (
                  <Home className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
                )}
                <span className="truncate max-w-[140px] font-medium">{item.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
