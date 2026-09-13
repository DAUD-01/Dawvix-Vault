import React, { useState } from 'react';
import { FileItem } from '../types';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
import { Download, Loader2, Eye } from 'lucide-react';

interface FileCardProps {
  file: FileItem;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onPreviewFile: (file: FileItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onOpenFolder,
  onDownloadFile,
  onPreviewFile,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = async () => {
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

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-teal-500/40 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-teal-950/20 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-lg bg-slate-800/80 p-2.5 transition-transform group-hover:scale-105">
          {getFileIcon(file.mimeType, file.isFolder, 'h-7 w-7')}
        </div>
        {!file.isFolder && (
          <div className="flex items-center gap-1">
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
