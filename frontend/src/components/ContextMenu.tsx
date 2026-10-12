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

  // Close context menu on click outside or escape key
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

  // Adjust coordinates if menu overflows window boundaries
  const menuWidth = 220;
  const menuHeight = targetItem ? 320 : 200;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 16);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(8, adjustedX)}px`, top: `${Math.max(8, adjustedY)}px` }}
      className="fixed z-50 w-56 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {targetItem ? (
        // Context menu for a specific file or folder
        <>
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 truncate mb-1">
            {targetItem.name}
          </div>

          {targetItem.isFolder ? (
            <button
              type="button"
              onClick={() => {
                onOpenItem?.(targetItem);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-teal-400" />
                <span>Download</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-slate-800/80" />

          <button
            type="button"
            onClick={() => {
              onCopy([targetItem]);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy</span>
            </div>
            <span className="text-[10px] text-slate-500">Ctrl+C</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCut([targetItem]);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Scissors className="h-3.5 w-3.5 text-slate-400" />
              <span>Cut</span>
            </div>
            <span className="text-[10px] text-slate-500">Ctrl+X</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRename(targetItem);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Edit3 className="h-3.5 w-3.5 text-slate-400" />
              <span>Rename</span>
            </div>
            <span className="text-[10px] text-slate-500">F2</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          <button
            type="button"
            onClick={() => {
              onProperties(targetItem);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
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
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Delete</span>
            </div>
            <span className="text-[10px] text-rose-400/60">Del</span>
          </button>
        </>
      ) : (
        // Context menu for empty canvas / folder space
        <>
          <button
            type="button"
            onClick={() => {
              onNewFolder();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clipboard className="h-3.5 w-3.5 text-teal-400" />
                <span>Paste ({clipboard.items.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">Ctrl+V</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-800/80" />

          <button
            type="button"
            onClick={() => {
              onSelectAll();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>Select All</span>
            </div>
            <span className="text-[10px] text-slate-500">Ctrl+A</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-800/80 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh View</span>
          </button>
        </>
      )}
    </div>
  );
};
