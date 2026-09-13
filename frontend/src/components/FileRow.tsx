import React, { useState } from 'react';
import { FileItem } from '../types';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
import { Download, ChevronRight, Loader2, Eye } from 'lucide-react';

interface FileRowProps {
  file: FileItem;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onPreviewFile: (file: FileItem) => void;
}

export const FileRow: React.FC<FileRowProps> = ({
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
      // Clicking file row opens in-window preview!
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

  const formattedDate = file.lastSyncedAt
    ? new Date(file.lastSyncedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <tr
      onClick={handleClick}
      className="group border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 cursor-pointer"
    >
      {/* File / Folder Name and Icon */}
      <td className="py-3.5 pl-4 pr-3 sm:pl-6 text-sm">
        <div className="flex items-center gap-3">
          <div className="shrink-0 transition-transform group-hover:scale-110">
            {getFileIcon(file.mimeType, file.isFolder)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-200 truncate group-hover:text-teal-400 transition-colors">
              {file.name}
            </span>
            <span className="text-xs text-slate-500 sm:hidden">
              {file.isFolder ? 'Folder' : formatBytes(file.size)} • {formattedDate}
            </span>
          </div>
        </div>
      </td>

      {/* File Size */}
      <td className="hidden px-3 py-3.5 text-sm text-slate-400 sm:table-cell">
        {file.isFolder ? (
          <span className="text-slate-600">—</span>
        ) : (
          formatBytes(file.size)
        )}
      </td>

      {/* MIME / Type label */}
      <td className="hidden px-3 py-3.5 text-xs text-slate-400 md:table-cell">
        <span className="inline-block max-w-[150px] truncate rounded bg-slate-800 px-2 py-0.5 text-slate-300">
          {file.isFolder
            ? 'Folder'
            : file.mimeType.replace('application/', '').replace('vnd.google-apps.', 'Google ')}
        </span>
      </td>

      {/* Last Synced Date */}
      <td className="hidden px-3 py-3.5 text-sm text-slate-400 lg:table-cell">
        {formattedDate}
      </td>

      {/* Action column */}
      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm">
        {file.isFolder ? (
          <div className="inline-flex items-center text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all">
            <ChevronRight className="h-5 w-5" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5">
            {/* View / Preview button */}
            <button
              type="button"
              onClick={handlePreviewClick}
              title="View in window"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-300"
            >
              <Eye className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">View</span>
            </button>

            {/* Direct Download button */}
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              title="Download file directly"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-300 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
              ) : (
                <Download className="h-3.5 w-3.5 text-teal-400" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};
