import React, { useState } from 'react';
import { FileItem } from '../types';
import { formatBytes, getFileBadge, getFileTypeMeta } from '../utils/fileUtils';
import { useTheme } from '../context/ThemeContext';
import {
  Download,
  ChevronRight,
  Loader2,
  Eye,
  Link,
  Check,
  MoreVertical,
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
  parentFolderPath?: string;
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
  onContextMenu,
  onDropOnFolder,
  onToast,
  parentFolderPath,
}) => {
  const { mode } = useTheme();
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

  const typeMeta = getFileTypeMeta(file.mimeType, file.isFolder, mode);

  return (
    <tr
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      aria-selected={isSelected}
      className={`group cursor-pointer border-b border-outline/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary)] ${
        isDragOver
          ? 'bg-primary-container/40 ring-1 ring-inset ring-primary'
          : isSelected
          ? 'bg-primary-container/30 hover:bg-primary-container/40'
          : 'hover:bg-surface-variant'
      } ${isCut ? 'opacity-40 border-dashed border-teal-500/40' : ''}`}
    >
      {/* File/Folder Name + Checkbox */}
      <td className="py-2.5 pl-3 pr-2 text-sm sm:pl-4">
        <div className="flex items-center gap-3">
          {onToggleSelect && (
            <div className="flex min-h-6 min-w-6 items-center justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(file.driveId)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${file.name}`}
                className="h-4 w-4 cursor-pointer rounded border-outline/30 bg-surface-variant text-teal-400 focus:ring-teal-400/30 transition-transform active:scale-95"
              />
            </div>
          )}

          {getFileBadge(file.mimeType, file.isFolder, 'h-4 w-4', 'p-1.5', mode)}

          <div className="flex flex-col min-w-0">
            <button
              type="button"
              aria-label={`${file.isFolder ? 'Open folder' : 'Preview file'} ${file.name}`}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="max-w-full truncate text-left text-sm font-medium text-slate-200 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
            >
              {file.name}
            </button>
            {parentFolderPath && (
              <span className="truncate text-[12px] text-[color:var(--color-text-muted)]">
                {parentFolderPath}
              </span>
            )}
            <span className="text-[11px] text-slate-500 sm:hidden">
              {file.isFolder ? 'Folder' : formatBytes(file.size)} • {formattedDate}
            </span>
          </div>
        </div>
      </td>

      {/* File Size */}
      <td className="hidden px-3 py-2.5 text-xs text-slate-400 sm:table-cell">
        {file.isFolder ? (
          <span className="text-slate-500">—</span>
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

      {/* Action Buttons with strict alignment (LAY-027 to LAY-030) */}
      <td className="py-2.5 pl-2 pr-3 text-right text-sm sm:pr-4">
        <div className="inline-flex items-center gap-1 justify-end">
          {/* Quick Action: Context menu */}
          {!file.isFolder ? (
            <button
              type="button"
              onClick={handleCopyLinkClick}
              aria-label={`Copy link for ${file.name}`}
              className="glass-button flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-teal-400" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          {!file.isFolder ? (
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              aria-label={`Download ${file.name}`}
              className="glass-button flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          {/* Aligned Primary Action: View for files, Open for folders (LAY-027, LAY-028) */}
          {file.isFolder ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              aria-label={`Open folder ${file.name}`}
              className="glass-button flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePreviewClick}
              aria-label={`Preview ${file.name}`}
              className="glass-button flex min-h-9 min-w-9 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onContextMenu?.(event, file);
            }}
            aria-label={`More actions for ${file.name}`}
            className="glass-button flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
};
