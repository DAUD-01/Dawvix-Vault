import React, { useState, useEffect } from 'react';
import { FileItem } from '../types';
import { driveService } from '../services/api';
import { getFileIcon, formatBytes } from '../utils/fileUtils';
import {
  X,
  Download,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileQuestion,
  FileText,
} from 'lucide-react';

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownloadFile,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load text content if file is text/code/json/csv/markdown
  useEffect(() => {
    if (!file) return;

    setImageScale(1);
    setHasError(false);
    setTextContent(null);

    const isTextBased =
      file.mimeType.startsWith('text/') ||
      file.mimeType.includes('json') ||
      file.mimeType.includes('javascript') ||
      file.mimeType.includes('typescript') ||
      file.mimeType.includes('csv') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.jsx') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.log');

    if (isTextBased) {
      setIsLoadingContent(true);
      driveService
        .getTextContent(file.driveId)
        .then((res) => {
          setTextContent(res.content);
        })
        .catch(() => {
          setHasError(true);
        })
        .finally(() => {
          setIsLoadingContent(false);
        });
    }
  }, [file]);

  if (!file) return null;

  const viewUrl = driveService.getViewUrl(file.driveId);
  const mime = file.mimeType.toLowerCase();
  const name = file.name.toLowerCase();

  const isPdfOrDoc =
    mime.includes('pdf') ||
    mime.startsWith('application/vnd.google-apps.') ||
    name.endsWith('.pdf');

  const isImage =
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name);

  const isVideo =
    mime.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi)$/i.test(name);

  const isAudio =
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name);

  const isTextBased =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('csv') ||
    /\.(txt|md|json|ts|tsx|js|jsx|py|html|css|scss|sh|yaml|yml|xml|csv|log)$/i.test(name);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await onDownloadFile(file.driveId, file.name);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Click backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex flex-col w-full h-full max-w-6xl max-h-[92vh] rounded-2xl border border-slate-800/80 bg-slate-900 shadow-2xl overflow-hidden z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 sm:px-6 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="shrink-0 p-1.5 rounded-lg bg-slate-800/80">
              {getFileIcon(file.mimeType, file.isFolder, 'h-6 w-6')}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="truncate max-w-[180px] rounded bg-slate-800/80 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {file.mimeType.replace('application/', '').replace('vnd.google-apps.', 'Google ')}
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Open in new window / tab */}
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open preview in new tab"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-xs font-medium text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Pop Out</span>
            </a>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download file"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-teal-500 transition-all disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close preview (Esc)"
              className="rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-slate-400 hover:border-slate-700 hover:bg-slate-700/80 hover:text-white transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="relative flex-1 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
          {/* 1. PDF or Google Workspace Document View */}
          {isPdfOrDoc ? (
            <div className="w-full h-full relative">
              <iframe
                src={viewUrl}
                title={file.name}
                className="w-full h-full border-0 bg-slate-900"
              />
            </div>
          ) : isImage ? (
            /* 2. Image View */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto">
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-slate-900/90 border border-slate-800 p-1.5 shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => setImageScale((s) => Math.max(0.4, s - 0.2))}
                  title="Zoom Out"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-300 font-mono px-1">
                  {Math.round(imageScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageScale((s) => Math.min(3, s + 0.2))}
                  title="Zoom In"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageScale(1)}
                  title="Reset Zoom"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 ml-1 border-l border-slate-800 pl-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={viewUrl}
                  alt={file.name}
                  style={{ transform: `scale(${imageScale})` }}
                  className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150"
                  onError={() => setHasError(true)}
                />
              </div>
            </div>
          ) : isVideo ? (
            /* 3. Video View */
            <div className="w-full h-full flex items-center justify-center p-4">
              <video
                src={viewUrl}
                controls
                autoPlay={false}
                className="max-h-[80vh] max-w-full rounded-xl shadow-2xl bg-black"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isAudio ? (
            /* 4. Audio View */
            <div className="flex flex-col items-center justify-center p-8 max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-950/40 mb-6">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-base font-semibold text-slate-100 text-center truncate w-full mb-1">
                {file.name}
              </h4>
              <p className="text-xs text-slate-400 mb-6">{formatBytes(file.size)}</p>
              <audio src={viewUrl} controls className="w-full" autoPlay={false}>
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : isTextBased ? (
            /* 5. Text / Code / JSON / Markdown View */
            <div className="w-full h-full flex flex-col">
              {/* Code toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 py-2 text-xs text-slate-400 shrink-0">
                <span>Text Viewer</span>
                {textContent && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-teal-400" />
                        <span className="text-teal-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {isLoadingContent ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                  <p className="text-xs">Streaming file content...</p>
                </div>
              ) : hasError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileQuestion className="h-10 w-10 text-rose-400" />
                  <p className="text-sm text-slate-300">Could not display file preview</p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500"
                  >
                    Download Instead
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 bg-slate-950">
                  <pre className="whitespace-pre-wrap leading-relaxed selection:bg-teal-500 selection:text-white">
                    {textContent}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* 6. Unsupported / Binary File Fallback */
            <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 mb-4 shadow-xl">
                {getFileIcon(file.mimeType, file.isFolder, 'h-14 w-14')}
              </div>
              <h4 className="text-base font-semibold text-slate-100 mb-1">
                No In-Browser Preview Available
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                This file format ({file.name.split('.').pop()?.toUpperCase() || 'Binary'}) cannot be previewed directly in the browser. You can download and open it on your device.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/50 hover:bg-teal-500 transition-all"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Download {file.name}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
