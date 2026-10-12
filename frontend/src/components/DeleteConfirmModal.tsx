import React, { useState } from 'react';
import { FileItem } from '../types';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  items: FileItem[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  items,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const folderCount = items.filter((i) => i.isFolder).length;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch {
      // Handled by parent toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65  animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl border border-rose-500/25 bg-surface/95 p-6 shadow-2xl  ring-1 ring-rose-500/10 animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-outline/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-2 text-[color:var(--color-error)]">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Confirm Deletion</h3>
              <p className="text-xs text-[color:var(--color-error)]">This action permanently deletes items.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-300">
            {items.length === 1 ? (
              <>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-on-surface">"{items[0].name}"</span>
                {items[0].isFolder ? ' and all of its contents' : ''}?
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-on-surface">{items.length} items</span>?
              </>
            )}
          </p>

          {items.length > 1 && (
            <div className="rounded-2xl border border-outline/[0.08] bg-surface-variant p-3 text-xs text-slate-400 max-h-36 overflow-y-auto space-y-1">
              {items.slice(0, 5).map((item) => (
                <div key={item.driveId} className="flex items-center gap-2 truncate">
                  <span className="text-slate-500">•</span>
                  <span className="truncate text-slate-200">{item.name}</span>
                  {item.isFolder && (
                    <span className="text-[10px] text-[color:var(--color-primary)] uppercase">(folder)</span>
                  )}
                </div>
              ))}
              {items.length > 5 && (
                <div className="text-[11px] text-slate-500 pt-1">
                  ...and {items.length - 5} more items
                </div>
              )}
            </div>
          )}

          {folderCount > 0 && (
            <p className="text-[11px] text-[color:var(--color-text-muted)] bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              Warning: Deleting {folderCount === 1 ? 'a folder' : `${folderCount} folders`} will also permanently delete all nested files and subfolders.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline/[0.08] mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-outline/[0.08] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-rose-600 px-4 py-1.5 text-xs font-medium text-[color:var(--color-on-error)] hover:bg-rose-500 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
};
