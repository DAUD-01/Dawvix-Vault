import React, { useState } from 'react';
import { FileItem } from '../types';
import { formatBytes, getFileBadge, getFileTypeMeta } from '../utils/fileUtils';
import { driveService } from '../services/api';
import { X, Copy, Check, Info, Calendar, HardDrive, Hash, Layers } from 'lucide-react';

interface FilePropertiesModalProps {
  isOpen: boolean;
  item: FileItem | null;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({
  isOpen,
  item,
  onClose,
  onToast,
}) => {
  const [isCopiedId, setIsCopiedId] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);

  if (!isOpen || !item) return null;

  const streamUrl = !item.isFolder
    ? window.location.origin + driveService.getViewUrl(item.driveId)
    : null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(item.driveId);
    setIsCopiedId(true);
    if (onToast) onToast('Item ID copied to clipboard!', 'success');
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const handleCopyUrl = () => {
    if (streamUrl) {
      navigator.clipboard.writeText(streamUrl);
      setIsCopiedUrl(true);
      if (onToast) onToast('Stream URL copied to clipboard!', 'success');
      setTimeout(() => setIsCopiedUrl(false), 2000);
    }
  };

  const formattedDate = item.lastSyncedAt
    ? new Date(item.lastSyncedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown';

  const typeMeta = getFileTypeMeta(item.mimeType, item.isFolder, 'dark', item.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65  animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl border border-outline/[0.1] bg-surface/95 p-6 shadow-2xl  ring-1 ring-white/[0.05] animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-outline/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-2 text-teal-400">
              <Info className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Item Properties</h3>
              <p className="text-xs text-slate-400">Detailed system metadata</p>
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

        <div className="mt-4 space-y-3.5 text-xs">
          {/* Header Summary */}
          <div className="flex items-center gap-3 rounded-2xl border border-outline/[0.08] bg-surface-variant p-3.5">
            {getFileBadge(item.mimeType, item.isFolder, 'h-6 w-6', 'p-2.5', 'dark', item.name)}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-on-surface truncate text-xs sm:text-sm">
                {item.name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-400">
                  {item.isFolder ? 'Folder' : formatBytes(item.size)}
                </span>
                <span
                  className={`rounded-md border px-1.5 py-0.2 text-[9px] font-medium uppercase tracking-wider ${typeMeta.border} ${typeMeta.bg} ${typeMeta.color}`}
                >
                  {typeMeta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="divide-y divide-white/[0.05] rounded-2xl border border-outline/[0.08] bg-surface-variant">
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                MIME Type
              </span>
              <span className="font-mono text-[11px] text-slate-300 truncate max-w-[200px]">
                {item.isFolder ? 'folder' : item.mimeType}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                Size
              </span>
              <span className="font-medium text-slate-200">
                {item.isFolder ? '—' : `${formatBytes(item.size)} (${item.size.toLocaleString()} B)`}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Last Synced
              </span>
              <span className="font-medium text-slate-200">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <Hash className="h-3.5 w-3.5 text-slate-500" />
                Vault ID
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]">
                  {item.driveId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded hover:bg-surface-variant text-slate-400 hover:text-on-surface"
                >
                  {isCopiedId ? <Check className="h-3 w-3 text-teal-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Stream Link if file */}
          {streamUrl && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Direct Stream URL
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-outline/[0.08] bg-surface-variant px-3 py-2">
                <input
                  type="text"
                  readOnly
                  value={streamUrl}
                  className="w-full bg-transparent font-mono text-[11px] text-slate-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="shrink-0 p-1 rounded-lg text-slate-400 hover:bg-surface-variant hover:text-teal-400 transition-colors"
                >
                  {isCopiedUrl ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-outline/[0.08] mt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline/[0.08] px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-variant transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
