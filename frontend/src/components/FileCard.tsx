import React, { useState } from 'react';
import { FileItem } from '../types';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
import { Download, Loader2, Eye, Link, Check } from 'lucide-react';
import { driveService } from '../services/api';

interface FileCardProps {
  file: FileItem;
  isSelected?: boolean;
  onToggleSelect?: (fileId: string) => void;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onPreviewFile: (file: FileItem) => void;
  onToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected = false,
  onToggleSelect,
  onOpenFolder,
  onDownloadFile,
  onPreviewFile,
  onToast,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleClick = async () => {
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
    if (onToast) onToast(`Copied direct stream link for "${file.name}"`, 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-950/20 cursor-pointer ${
        isSelected
          ? 'border-teal-500 bg-teal-950/20 shadow-md ring-1 ring-teal-500/50'
          : 'border-slate-800/80 bg-slate-900/60 hover:border-teal-500/40 hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {!file.isFolder && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 cursor-pointer"
            />
          )}
          <div className="rounded-lg bg-slate-800/80 p-2.5 transition-transform group-hover:scale-105">
            {getFileIcon(file.mimeType, file.isFolder, 'h-6 w-6')}
          </div>
        </div>

        {!file.isFolder && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopyLinkClick}
              title="Copy direct stream link"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
            >
              {isCopied ? <Check className="h-4 w-4 text-teal-400" /> : <Link className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handlePreviewClick}
              title="View in window"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              title="Download file"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
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
