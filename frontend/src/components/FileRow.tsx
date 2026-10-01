import React, { useState, useEffect } from "react";
import { FileItem } from "../types";
import { getFileIcon, formatBytes } from "../utils/fileUtils";
import {
  Download,
  ChevronRight,
  Loader2,
  Eye,
  Link,
  Check,
} from "lucide-react";
import { driveService } from "../services/api";

const LAYOUT_STORAGE_KEY = "vault_layout_mode";

interface FileRowProps {
  file: FileItem;
  isGrid?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (fileId: string) => void;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onPreviewFile: (file: FileItem) => void;
  onToast?: (message: string, type: "success" | "info" | "error") => void;
}

export const FileRow: React.FC<FileRowProps> = ({
  file,
  isGrid: isGridProp,
  isSelected = false,
  onToggleSelect,
  onOpenFolder,
  onDownloadFile,
  onPreviewFile,
  onToast,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGrid, setIsGrid] = useState<boolean>(isGridProp ?? false);

  // Sync prop or read from localStorage on mount
  useEffect(() => {
    if (isGridProp !== undefined) {
      setIsGrid(isGridProp);
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(isGridProp));
      } catch (e) {
        console.error("Failed to save layout mode", e);
      }
    } else {
      try {
        const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (saved !== null) {
          setIsGrid(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to read layout mode", e);
      }
    }
  }, [isGridProp]);

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
    if (onToast) onToast(`Copied stream link for "${file.name}"`, "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formattedDate = file.lastSyncedAt
    ? new Date(file.lastSyncedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  // =========================================================================
  // GRID VIEW (Rendered inside a grid container)
  // =========================================================================
  if (isGrid) {
    return (
      <div
        onClick={handleClick}
        className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm ${
          isSelected
            ? "border-teal-500/60 bg-teal-950/30 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/30"
            : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:-translate-y-0.5"
        }`}
      >
        {/* Header: Checkbox & Quick Actions */}
        <div className="flex items-center justify-between gap-2 mb-3 z-10">
          {!file.isFolder && onToggleSelect ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/30 cursor-pointer transition-transform active:scale-90"
            />
          ) : (
            <span className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50">
              {file.isFolder ? "Folder" : formatBytes(file.size)}
            </span>
          )}

          {!file.isFolder && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                type="button"
                onClick={handleCopyLinkClick}
                title="Copy stream link"
                className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 text-slate-300 hover:border-teal-500 hover:bg-teal-500/20 hover:text-teal-300 transition-all active:scale-90"
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-teal-400" />
                ) : (
                  <Link className="h-3 w-3" />
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                title="Download"
                className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 text-slate-300 hover:border-teal-500 hover:bg-teal-500/20 hover:text-teal-300 transition-all active:scale-90 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-teal-400" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center my-2 group-hover:scale-105 transition-transform duration-200">
          <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 shadow-inner mb-3 text-teal-400">
            {getFileIcon(file.mimeType, file.isFolder)}
          </div>
          <h3 className="w-full text-sm font-semibold text-slate-200 truncate group-hover:text-teal-300 transition-colors">
            {file.name}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {file.isFolder ? "Directory" : formattedDate}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span className="truncate max-w-[120px] text-[10px] text-slate-500">
            {file.isFolder
              ? "Folder"
              : file.mimeType
                  .replace("application/", "")
                  .replace("vnd.google-apps.", "")}
          </span>

          {file.isFolder ? (
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
          ) : (
            <button
              type="button"
              onClick={handlePreviewClick}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIST VIEW (Rendered inside a <tbody> element)
  // =========================================================================
  return (
    <tr
      onClick={handleClick}
      className={`group border-b border-slate-800/60 transition-all cursor-pointer ${
        isSelected
          ? "bg-teal-950/30 hover:bg-teal-950/40"
          : "hover:bg-slate-800/40"
      }`}
    >
      {/* File/Folder Name */}
      <td className="py-3.5 pl-4 pr-3 sm:pl-6 text-sm">
        <div className="flex items-center gap-3">
          {!file.isFolder && onToggleSelect ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/30 cursor-pointer transition-transform active:scale-90"
            />
          ) : onToggleSelect ? (
            <div className="w-4" />
          ) : null}

          <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
            {getFileIcon(file.mimeType, file.isFolder)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-200 truncate group-hover:text-teal-400 transition-colors">
              {file.name}
            </span>
            <span className="text-xs text-slate-500 sm:hidden">
              {file.isFolder ? "Folder" : formatBytes(file.size)} •{" "}
              {formattedDate}
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
            ? "Folder"
            : file.mimeType
                .replace("application/", "")
                .replace("vnd.google-apps.", "Google ")}
        </span>
      </td>

      {/* Last Synced Date */}
      <td className="hidden px-3 py-3.5 text-sm text-slate-400 lg:table-cell">
        {formattedDate}
      </td>

      {/* Action Column */}
      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm">
        {file.isFolder ? (
          <div className="inline-flex items-center text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all">
            <ChevronRight className="h-5 w-5" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLinkClick}
              title="Copy direct stream link"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 p-1.5 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-300 active:scale-95"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-teal-400" />
              ) : (
                <Link className="h-3.5 w-3.5 text-teal-400" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePreviewClick}
              title="View in window"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-300 active:scale-95"
            >
              <Eye className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">View</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              title="Download file directly"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-500/10 hover:text-teal-300 active:scale-95 disabled:opacity-50"
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
