import React, { Fragment, useMemo, useState } from 'react';
import { BreadcrumbItem } from '../types';
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { getDraggedItemIds, isExternalFileDrag } from '../utils/dragAndDrop';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onSelectFolder: (folderId: string, index: number) => void;
  onDropOnFolder?: (targetFolderId: string, itemIds: string[]) => void;
  onUploadToFolder?: (targetFolderId: string, files: File[]) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onSelectFolder,
  onDropOnFolder,
  onUploadToFolder,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const navItems = useMemo(
    () => items.map((item, breadcrumbIndex) => ({ item, breadcrumbIndex })),
    [items],
  );
  const displayItems = useMemo(() => {
    if (navItems.length <= 4) return navItems;
    return [navItems[0], ...navItems.slice(-2)];
  }, [navItems]);

  const overflowItems = useMemo(() => {
    if (navItems.length <= 4) return [];
    return navItems.slice(1, -2);
  }, [navItems]);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (index === navItems[navItems.length - 1].breadcrumbIndex) return;
    const externalFiles = isExternalFileDrag(e.dataTransfer);
    const internalItems = e.dataTransfer.types.includes('application/x-dawvix-vault-items')
      || e.dataTransfer.types.includes('application/json');
    if ((externalFiles && !onUploadToFolder) || (internalItems && !onDropOnFolder)) return;
    if (!externalFiles && !internalItems) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = externalFiles ? 'copy' : 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string, index: number) => {
    if (index === navItems[navItems.length - 1].breadcrumbIndex) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onUploadToFolder) {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);
      onUploadToFolder(folderId, droppedFiles);
      return;
    }
    const itemIds = getDraggedItemIds(e.dataTransfer).filter((itemId) => itemId !== folderId);
    if (itemIds.length > 0 && onDropOnFolder) {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);
      onDropOnFolder(folderId, itemIds);
    }
  };

  if (!navItems.length) return null;

  return (
    <nav aria-label="Folder path" className="flex min-w-0 flex-1 items-center overflow-hidden py-1 text-sm text-slate-300">
      <div className="flex min-w-0 flex-1 items-center">
        {displayItems.map(({ item, breadcrumbIndex }, index) => {
          const isLast = breadcrumbIndex === navItems[navItems.length - 1].breadcrumbIndex;
          const isDragOver = dragOverIndex === breadcrumbIndex;

          return (
            <Fragment key={`${item.id}_${breadcrumbIndex}`}>
              {index > 0 && (
                <ChevronRight className="mx-1 h-3 w-3 shrink-0 text-slate-500/40" aria-hidden="true" />
              )}

              {navItems.length > 4 && index === 1 && overflowItems.length > 0 && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-7 items-center justify-center rounded-md px-2 text-slate-500 hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
                      aria-label="Show hidden breadcrumb items"
                      onClick={() => setShowOverflowMenu((open) => !open)}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      <ChevronDown className="ml-0.5 h-3 w-3" aria-hidden="true" />
                    </button>

                    {showOverflowMenu && (
                      <div className="absolute left-0 top-full z-20 mt-2 min-w-40 rounded-xl border border-[color:var(--color-border)] bg-surface p-1 shadow-2xl">
                        {overflowItems.map(({ item: hiddenItem, breadcrumbIndex: hiddenIndex }) => (
                          <button
                            key={hiddenItem.id}
                            type="button"
                            onClick={() => {
                              setShowOverflowMenu(false);
                              onSelectFolder(hiddenItem.id, hiddenIndex);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs text-slate-300 hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
                          >
                            <span className="max-w-[160px] truncate">{hiddenItem.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="mx-1 h-3 w-3 shrink-0 text-slate-500/40" aria-hidden="true" />
                </>
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="flex max-w-[160px] items-center justify-center truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]"
                >
                  {item.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectFolder(item.id, breadcrumbIndex)}
                  onDragOver={(e) => handleDragOver(e, breadcrumbIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item.id, breadcrumbIndex)}
                  className={`flex h-7 max-w-[160px] items-center rounded-md px-1.5 text-[13px] font-medium transition-colors ${
                    isDragOver
                      ? 'bg-[color:var(--color-hover)] text-[color:var(--color-text-primary)]'
                      : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]'
                  }`}
                  aria-label={`Go to ${item.name}`}
                >
                  <span className="truncate">{item.name}</span>
                </button>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};
