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
      // Error handled by parent toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-rose-900/40 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Confirm Deletion</h3>
              <p className="text-xs text-rose-300/80">This action cannot be undone.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-300">
            {items.length === 1 ? (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-white">"{items[0].name}"</span>
                {items[0].isFolder ? ' and all of its contents' : ''}?
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-white">{items.length} items</span>?
              </>
            )}
          </p>

          {items.length > 1 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 max-h-36 overflow-y-auto space-y-1">
              {items.slice(0, 5).map((item) => (
                <div key={item.driveId} className="flex items-center gap-2 truncate">
                  <span className="text-slate-500">•</span>
                  <span className="truncate text-slate-200">{item.name}</span>
                  {item.isFolder && (
                    <span className="text-[10px] text-teal-400 uppercase">(folder)</span>
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
            <p className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/50 rounded-xl p-2.5">
              Warning: Deleting {folderCount === 1 ? 'a folder' : `${folderCount} folders`} will also delete all files and subfolders contained inside it.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-5 border-t border-slate-800 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30 disabled:opacity-50"
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
