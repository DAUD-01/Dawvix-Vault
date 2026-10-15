import React, { useState } from 'react';
import { FileItem } from '../types';
import { formatBytes, getFileBadge, getFileTypeMeta } from '../utils/fileUtils';
import {
  Download,
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

interface FileCardProps {
  file: FileItem;
  canEdit?: boolean;
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

export const FileCard: React.FC<FileCardProps> = ({
  file,
  canEdit = true,
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
    if (!canEdit) return;
    const itemIds =
      selectedFileIds && selectedFileIds.has(file.driveId)
        ? Array.from(selectedFileIds)
        : [file.driveId];
    e.dataTransfer.setData('application/json', JSON.stringify(itemIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (canEdit && file.isFolder) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canEdit || !file.isFolder) return;
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

  const typeMeta = getFileTypeMeta(file.mimeType, file.isFolder);

  return (
    <div
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
        isDragOver
          ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-400'
          : isSelected
          ? 'border-teal-500/60 bg-teal-500/[0.08] shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/40'
          : 'border-white/[0.06] bg-[#0d121f]/70 hover:border-teal-500/30 hover:bg-[#12192b]/80 hover:shadow-xl hover:-translate-y-1'
      } ${isCut ? 'opacity-40 border-dashed border-teal-500/40' : ''}`}
    >
      {/* Card Header: Checkbox & Quick Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-teal-400 focus:ring-teal-400/30 cursor-pointer transition-transform active:scale-90"
            />
          )}
          {getFileBadge(file.mimeType, file.isFolder, 'h-5 w-5', 'p-2.5')}
        </div>

        {/* Hover action toolbar */}
        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {!file.isFolder && (
            <>
              <button
                type="button"
                onClick={handleCopyLinkClick}
                title="Copy stream link"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Link className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handlePreviewClick}
                title="Preview"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download"
                className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}

          {onCopy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(file);
              }}
              title="Copy"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}

          {onCut && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCut(file);
              }}
              title="Cut"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
            </button>
          )}

          {onRename && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(file);
              }}
              title="Rename"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}

          {onProperties && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProperties(file);
              }}
              title="Properties"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.1] hover:text-teal-300 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}

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
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="mt-4">
        <h4
          className="text-xs font-semibold text-slate-200 truncate group-hover:text-teal-300 transition-colors"
          title={file.name}
        >
          {file.name}
        </h4>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-medium text-slate-400">
            {file.isFolder ? 'Folder' : formatBytes(file.size)}
          </span>
          <span
            className={`rounded-md border px-1.5 py-0.2 text-[9px] font-medium uppercase tracking-wider ${typeMeta.border} ${typeMeta.bg} ${typeMeta.color}`}
          >
            {typeMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
};
