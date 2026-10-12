import React, { useState } from 'react';
import { FileItem } from '../types';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Item Properties</h3>
              <p className="text-xs text-slate-400">Detailed system metadata</p>
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

        <div className="mt-5 space-y-4 text-xs">
          {/* Header Summary */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="shrink-0 p-2 rounded-lg bg-slate-900">
              {getFileIcon(item.mimeType, item.isFolder, 'h-7 w-7')}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-white truncate text-sm" title={item.name}>
                {item.name}
              </h4>
              <p className="text-slate-400 mt-0.5">
                {item.isFolder ? 'Folder' : formatBytes(item.size)}
              </p>
            </div>
          </div>

          {/* Details list */}
          <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Type
              </span>
              <span className="font-medium text-slate-200 truncate max-w-[200px]" title={item.mimeType}>
                {item.isFolder ? 'Folder' : item.mimeType}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-slate-400">
                <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                Size
              </span>
              <span className="font-medium text-slate-200">
                {item.isFolder ? '—' : `${formatBytes(item.size)} (${item.size.toLocaleString()} bytes)`}
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
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]" title={item.driveId}>
                  {item.driveId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Copy ID"
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
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <input
                  type="text"
                  readOnly
                  value={streamUrl}
                  className="w-full bg-transparent font-mono text-[11px] text-slate-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="shrink-0 p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-teal-400 transition-colors"
                  title="Copy Stream URL"
                >
                  {isCopiedUrl ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-5 border-t border-slate-800 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
