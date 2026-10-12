import React, { useEffect, useRef } from 'react';
import { FileItem, VaultClipboard } from '../types';
import {
  FolderPlus,
  FilePlus,
  Clipboard,
  Trash2,
  Edit3,
  Copy,
  Scissors,
  Eye,
  Download,
  Info,
  RefreshCw,
  CheckSquare,
  ExternalLink,
  Link,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  targetItem: FileItem | null;
  clipboard: VaultClipboard | null;
  onClose: () => void;
  onOpenItem?: (item: FileItem) => void;
  onPreviewItem?: (item: FileItem) => void;
  onDownloadItem?: (item: FileItem) => void;
  onCopyLink?: (item: FileItem) => void;
  onCopy: (items: FileItem[]) => void;
  onCut: (items: FileItem[]) => void;
  onPaste: () => void;
  onRename: (item: FileItem) => void;
  onDelete: (items: FileItem[]) => void;
  onProperties: (item: FileItem) => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onSelectAll: () => void;
  onRefresh: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  targetItem,
  clipboard,
  onClose,
  onOpenItem,
  onPreviewItem,
  onDownloadItem,
  onCopyLink,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onDelete,
  onProperties,
  onNewFolder,
  onNewFile,
  onSelectAll,
  onRefresh,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const menuWidth = 224;
  const menuHeight = targetItem ? 380 : 230;
  const adjustedX = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));
  const adjustedY = Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12));

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-outline/[0.12] bg-surface/95 p-1.5 shadow-2xl glass-panel text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-white/[0.05]"
      onClick={(e) => e.stopPropagation()}
    >
      {targetItem ? (
        <>
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-outline/[0.08] truncate mb-1">
            {targetItem.name}
          </div>

          {targetItem.isFolder ? (
            <button
              type="button"
              onClick={() => {
                onOpenItem?.(targetItem);
                onClose();
              }}
              className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-teal-400" />
              <span>Open Folder</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onPreviewItem?.(targetItem);
                  onClose();
                }}
                className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-teal-300 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-teal-400" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDownloadItem?.(targetItem);
                  onClose();
                }}
                className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-teal-300 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-teal-400" />
                <span>Download</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-outline/[0.06]" />

          {!targetItem.isFolder && (
            <button
              type="button"
              onClick={() => {
                onCopyLink?.(targetItem);
                onClose();
              }}
              className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
            >
              <Link className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy link</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onCopy([targetItem]);
              onClose();
            }}
            className="flex min-h-9 w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+C</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCut([targetItem]);
              onClose();
            }}
            className="flex min-h-9 w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Scissors className="h-3.5 w-3.5 text-slate-400" />
              <span>Cut</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+X</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRename(targetItem);
              onClose();
            }}
            className="flex min-h-9 w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Edit3 className="h-3.5 w-3.5 text-slate-400" />
              <span>Rename</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">F2</span>
          </button>

          <div className="my-1 border-t border-outline/[0.06]" />

          <button
            type="button"
            onClick={() => {
              onProperties(targetItem);
              onClose();
            }}
            className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Properties</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete([targetItem]);
              onClose();
            }}
            className="flex min-h-9 w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[color:var(--color-error)] hover:bg-rose-500/15 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-3.5 w-3.5 text-[color:var(--color-error)]" />
              <span>Delete</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Del</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              onNewFolder();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-teal-300 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5 text-teal-400" />
            <span>New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNewFile();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-teal-300 transition-colors"
          >
            <FilePlus className="h-3.5 w-3.5 text-teal-400" />
            <span>New File</span>
          </button>

          {clipboard && clipboard.items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onPaste();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-teal-500/20 text-teal-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clipboard className="h-3.5 w-3.5 text-teal-400" />
                <span>Paste ({clipboard.items.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+V</span>
            </button>
          )}

          <div className="my-1 border-t border-outline/[0.06]" />

          <button
            type="button"
            onClick={() => {
              onSelectAll();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>Select All</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+A</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-surface-variant hover:text-on-surface transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </>
      )}
    </div>
  );
};
