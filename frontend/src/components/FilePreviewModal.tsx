import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  ChevronLeft,
  ChevronRight,
  WrapText,
  Link,
  Gauge,
} from 'lucide-react';

interface FilePreviewModalProps {
  file: FileItem | null;
  filesList?: FileItem[];
  onClose: () => void;
  onDownloadFile: (fileId: string, filename: string) => Promise<void>;
  onNavigateFile?: (file: FileItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  filesList = [],
  onClose,
  onDownloadFile,
  onNavigateFile,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Filter only viewable/non-folder files from filesList for prev/next
  const fileItemsOnly = filesList.filter((f) => !f.isFolder);
  const currentIndex = file ? fileItemsOnly.findIndex((f) => f.driveId === file.driveId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fileItemsOnly.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigateFile) {
      onNavigateFile(fileItemsOnly[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigateFile) {
      onNavigateFile(fileItemsOnly[currentIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hasPrev, hasNext, currentIndex]);

  // Load text content if file is text/code/json/csv/markdown
  useEffect(() => {
    if (!file) return;

    setImageScale(1);
    setHasError(false);
    setTextContent(null);
    setPlaybackRate(1);

    const isTextBased =
      file.mimeType.startsWith('text/') ||
      file.mimeType.includes('json') ||
      file.mimeType.includes('javascript') ||
      file.mimeType.includes('typescript') ||
      file.mimeType.includes('csv') ||
      /\.(txt|md|json|ts|tsx|js|jsx|py|html|css|scss|sh|yaml|yml|xml|csv|log|env|sql)$/i.test(
        file.name
      );

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

  // Update media playback rate
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

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
    /\.(mp4|webm|mkv|mov|avi|m4v)$/i.test(name);

  const isAudio =
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name);

  const isMarkdown =
    mime === 'text/markdown' ||
    /\.(md|markdown)$/i.test(name);

  const isTextBased =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('csv') ||
    /\.(txt|json|ts|tsx|js|jsx|py|html|css|scss|sh|yaml|yml|xml|csv|log|env|sql)$/i.test(name);

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

  const handleCopyDirectUrl = () => {
    navigator.clipboard.writeText(window.location.origin + viewUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  // Split text content into numbered lines
  const textLines = textContent ? textContent.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      {/* Click backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex flex-col w-full h-full max-w-6xl max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="shrink-0 p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
              {getFileIcon(file.mimeType, file.isFolder, 'h-5 w-5')}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="truncate max-w-[160px] rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {file.mimeType.replace('application/', '').replace('vnd.google-apps.', 'Google ')}
                </span>
                {fileItemsOnly.length > 1 && (
                  <>
                    <span>•</span>
                    <span className="text-[11px] text-slate-400">
                      {currentIndex + 1} of {fileItemsOnly.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Previous / Next File Buttons */}
            {fileItemsOnly.length > 1 && (
              <div className="hidden sm:flex items-center rounded-xl border border-slate-800 bg-slate-800/80 p-0.5 mr-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="Previous file (Left Arrow)"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="Next file (Right Arrow)"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Copy Stream Link */}
            <button
              type="button"
              onClick={handleCopyDirectUrl}
              title="Copy direct stream link"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-xs font-medium text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-300 transition-colors"
            >
              {isUrlCopied ? <Check className="h-4 w-4 text-teal-400" /> : <Link className="h-4 w-4" />}
              <span className="hidden md:inline">{isUrlCopied ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {/* Pop Out in new tab */}
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open stream in new browser tab"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-xs font-medium text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden md:inline">Pop Out</span>
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
            /* 2. Image View with Zoom */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto">
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-slate-900/90 border border-slate-800 p-1.5 shadow-lg z-20 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setImageScale((s) => Math.max(0.3, s - 0.25))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-300 font-mono px-1">
                  {Math.round(imageScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageScale((s) => Math.min(4, s + 0.25))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageScale(1)}
                  title="Reset Zoom"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1 border-l border-slate-800 pl-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={viewUrl}
                  alt={file.name}
                  style={{ transform: `scale(${imageScale})` }}
                  className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150"
                  onError={() => setHasError(true)}
                />
              </div>
            </div>
          ) : isVideo ? (
            /* 3. Video View with Speed Control */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1.5 z-20 backdrop-blur">
                <Gauge className="h-3.5 w-3.5 text-teal-400 ml-1" />
                <span className="text-xs text-slate-400 mr-1">Speed:</span>
                {[1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handlePlaybackRateChange(speed)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-mono transition-colors ${
                      playbackRate === speed
                        ? 'bg-teal-500/20 text-teal-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <video
                ref={videoRef}
                src={viewUrl}
                controls
                autoPlay={false}
                className="max-h-[78vh] max-w-full rounded-xl shadow-2xl bg-black"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isAudio ? (
            /* 4. Audio View with Speed Control */
            <div className="flex flex-col items-center justify-center p-8 max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-950/40 mb-6">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-base font-semibold text-slate-100 text-center truncate w-full mb-1">
                {file.name}
              </h4>
              <p className="text-xs text-slate-400 mb-6">{formatBytes(file.size)}</p>

              <audio ref={audioRef} src={viewUrl} controls className="w-full mb-4" autoPlay={false}>
                Your browser does not support the audio element.
              </audio>

              <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-1.5 border border-slate-800">
                <Gauge className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs text-slate-400">Speed:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handlePlaybackRateChange(speed)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-mono transition-colors ${
                      playbackRate === speed
                        ? 'bg-teal-500/20 text-teal-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          ) : isMarkdown ? (
            /* 4.5 Markdown Viewer */
            <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
              <div className="flex-1 overflow-auto p-6 md:p-10 bg-slate-900/50">
                {isLoadingContent ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-400 h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                    <p className="text-xs">Streaming file content from gateway...</p>
                  </div>
                ) : hasError ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
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
                  <div className="prose prose-invert prose-teal max-w-3xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ) : isTextBased ? (
            /* 5. Text / Code / JSON / Markdown View with Line Numbers */
            <div className="w-full h-full flex flex-col">
              {/* Code toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span>Text / Source Code</span>
                  {textLines.length > 0 && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 font-mono">
                      {textLines.length} lines
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWordWrap((w) => !w)}
                    title="Toggle Word Wrap"
                    className={`flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 transition-colors ${
                      isWordWrap ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <WrapText className="h-3.5 w-3.5" />
                    <span>Wrap</span>
                  </button>

                  {textContent && (
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
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
              </div>

              {isLoadingContent ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                  <p className="text-xs">Streaming file content from gateway...</p>
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
                <div className="flex-1 overflow-auto flex text-xs font-mono bg-slate-950">
                  {/* Line Numbers Gutter */}
                  <div className="py-4 pl-3 pr-3 select-none text-right text-slate-600 bg-slate-950/60 border-r border-slate-800/80 shrink-0 font-mono">
                    {textLines.map((_, i) => (
                      <div key={i} className="leading-relaxed">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Code Body */}
                  <pre
                    className={`flex-1 p-4 text-slate-200 leading-relaxed font-mono selection:bg-teal-500 selection:text-white ${
                      isWordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
                    }`}
                  >
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
                This file format ({file.name.split('.').pop()?.toUpperCase() || 'Binary'}) cannot be rendered in the browser. You can download and open it securely on your device.
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
