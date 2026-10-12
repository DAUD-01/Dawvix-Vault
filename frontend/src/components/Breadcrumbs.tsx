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
    <nav className="flex items-center space-x-1 overflow-x-auto py-2 text-sm text-slate-300">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isDragOver = dragOverIndex === index;

        return (
          <div key={`${item.id}_${index}`} className="flex items-center space-x-1 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mx-1" />
            )}
            <button
              type="button"
              onClick={() => onSelectFolder(item.id, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id, index)}
              disabled={isLast}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                isDragOver
                  ? 'border-2 border-dashed border-teal-400 bg-teal-500/20 text-teal-300 scale-105 shadow-md'
                  : isLast
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
