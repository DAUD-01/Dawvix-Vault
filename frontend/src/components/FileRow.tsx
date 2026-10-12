import React, { useState } from 'react';
import { FileItem } from '../types';
import { formatBytes, getFileBadge, getFileTypeMeta } from '../utils/fileUtils';
import {
  Download,
  ChevronRight,
  Loader2,
  Eye,
  Link,
  Check,
  Edit3,
  Trash2,
  Copy,
  Scissors,
  Info,
} from 'lucide-react';
import { driveService } from '../services/api';

interface FileRowProps {
  file: FileItem;
  isSelected?: boolean;
  isCut?: boolean;
  selectedFileIds?: Set<string>;
  onToggleSelect?: (fileId: string) => void;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onPreviewFile: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onCopy?: (file: FileItem) => void;
  onCut?: (file: FileItem) => void;
  onProperties?: (file: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItem) => void;
  onDropOnFolder?: (targetFolderId: string, itemIds: string[]) => void;
  onToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const FileRow: React.FC<FileRowProps> = ({
  file,
  isSelected = false,
  isCut = false,
  selectedFileIds,
  onToggleSelect,
  onOpenFolder,
  onDownloadFile,
  onPreviewFile,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onProperties,
  onContextMenu,
  onDropOnFolder,
  onToast,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    if (file.isFolder) {
      onOpenFolder(file.driveId, file.name);
    } else {
      onPreviewFile(file);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(file.driveId);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      await onDownloadFile(file.driveId, file.name);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreviewFile(file);
  };

  const handleCopyLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + driveService.getViewUrl(file.driveId);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    if (onToast) onToast(`Copied stream link for "${file.name}"`, 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, file);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    const itemIds =
      selectedFileIds && selectedFileIds.has(file.driveId)
        ? Array.from(selectedFileIds)
        : [file.driveId];
    e.dataTransfer.setData('application/json', JSON.stringify(itemIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isFolder) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!file.isFolder) return;
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && onDropOnFolder) {
        const itemIds = JSON.parse(dataStr);
        if (Array.isArray(itemIds) && itemIds.length > 0) {
          onDropOnFolder(file.driveId, itemIds);
        }
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  const formattedDate = file.lastSyncedAt
    ? new Date(file.lastSyncedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const typeMeta = getFileTypeMeta(file.mimeType, file.isFolder);

  return (
    <tr
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`group border-b border-white/[0.04] transition-all cursor-pointer ${
        isDragOver
          ? 'bg-teal-500/15 ring-2 ring-teal-400'
          : isSelected
          ? 'bg-teal-500/[0.08] hover:bg-teal-500/[0.12]'
          : 'hover:bg-white/[0.035]'
      } ${isCut ? 'opacity-40 border-dashed border-teal-500/40' : ''}`}
    >
      {/* File/Folder Name + Checkbox */}
      <td className="py-2.5 pl-4 pr-3 sm:pl-6 text-sm">
        <div className="flex items-center gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400/30 cursor-pointer transition-transform active:scale-90"
            />
          )}

          {getFileBadge(file.mimeType, file.isFolder, 'h-4 w-4', 'p-1.5')}

          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-200 truncate group-hover:text-teal-300 transition-colors text-xs sm:text-sm">
              {file.name}
            </span>
            <span className="text-[11px] text-slate-500 sm:hidden">
              {file.isFolder ? 'Folder' : formatBytes(file.size)} • {formattedDate}
            </span>
          </div>
        </div>
      </td>

      {/* File Size */}
      <td className="hidden px-3 py-2.5 text-xs text-slate-400 sm:table-cell">
        {file.isFolder ? (
          <span className="text-slate-600">—</span>
        ) : (
          formatBytes(file.size)
        )}
      </td>

      {/* Type badge */}
      <td className="hidden px-3 py-2.5 text-xs md:table-cell">
        <span
          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide ${typeMeta.border} ${typeMeta.bg} ${typeMeta.color}`}
        >
          {typeMeta.label}
        </span>
      </td>

      {/* Last Synced Date */}
      <td className="hidden px-3 py-2.5 text-xs text-slate-400 lg:table-cell">
        {formattedDate}
      </td>

      {/* Action Buttons */}
      <td className="py-2.5 pl-3 pr-4 sm:pr-6 text-right text-sm">
        <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {/* Quick Action: Copy link */}
          {!file.isFolder && (
            <button
              type="button"
              onClick={handleCopyLinkClick}
              title="Copy link"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-teal-400" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Quick Action: Preview */}
          {!file.isFolder && (
            <button
              type="button"
              onClick={handlePreviewClick}
              title="Preview"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Action: Download */}
          {!file.isFolder && (
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              title="Download"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Quick Action: Copy */}
          {onCopy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(file);
              }}
              title="Copy"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Action: Cut */}
          {onCut && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCut(file);
              }}
              title="Cut (Move)"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Action: Rename */}
          {onRename && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(file);
              }}
              title="Rename"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Action: Properties */}
          {onProperties && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProperties(file);
              }}
              title="Properties"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.08] hover:text-teal-300 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Action: Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file);
              }}
              title="Delete"
              className="rounded-lg p-1 text-rose-400/80 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Folder indicator */}
          {file.isFolder && (
            <div className="pl-1 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
