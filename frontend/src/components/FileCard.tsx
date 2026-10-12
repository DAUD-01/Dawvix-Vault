import React, { useState } from 'react';
import { FileItem } from '../types';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-950/20 cursor-pointer ${
        isDragOver
          ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-400'
          : isSelected
          ? 'border-teal-500 bg-teal-950/25 shadow-md ring-1 ring-teal-500/50'
          : 'border-slate-800/80 bg-slate-900/60 hover:border-teal-500/40 hover:bg-slate-800/60'
      } ${isCut ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 cursor-pointer transition-transform active:scale-90"
            />
          )}
          <div className="rounded-lg bg-slate-800/80 p-2.5 transition-transform group-hover:scale-105">
            {getFileIcon(file.mimeType, file.isFolder, 'h-6 w-6')}
          </div>
        </div>

        {/* Hover action toolbar */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {!file.isFolder && (
            <>
              <button
                type="button"
                onClick={handleCopyLinkClick}
                title="Copy stream link"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Link className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handlePreviewClick}
                title="Preview"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors disabled:opacity-50"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
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
              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4
          className="text-sm font-medium text-slate-200 truncate group-hover:text-teal-400 transition-colors"
          title={file.name}
        >
          {file.name}
        </h4>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{file.isFolder ? 'Folder' : formatBytes(file.size)}</span>
          {file.lastSyncedAt && (
            <span>{new Date(file.lastSyncedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};
