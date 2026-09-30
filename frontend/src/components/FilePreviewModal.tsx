import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { FileItem } from "../types";
import { driveService } from "../services/api";
import { getFileIcon, formatBytes } from "../utils/fileUtils";
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
  Terminal,
} from "lucide-react";

// --- NEW: Dedicated Component for Premium Code Blocks ---
const CodeBlock = ({
  language,
  value,
}: {
  language: string;
  value: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-slate-700/60 shadow-2xl group">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-mono font-medium text-slate-300 lowercase tracking-wider">
            {language || "text"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 text-teal-400" />
              <span className="text-teal-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Content */}
      <div className="text-sm">
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// --- MAIN MODAL COMPONENT ---
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

  const fileItemsOnly = filesList.filter((f) => !f.isFolder);
  const currentIndex = file
    ? fileItemsOnly.findIndex((f) => f.driveId === file.driveId)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fileItemsOnly.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigateFile)
      onNavigateFile(fileItemsOnly[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext && onNavigateFile)
      onNavigateFile(fileItemsOnly[currentIndex + 1]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) handlePrev();
      else if (e.key === "ArrowRight" && hasNext) handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hasPrev, hasNext, currentIndex]);

  useEffect(() => {
    if (!file) return;

    setImageScale(1);
    setHasError(false);
    setTextContent(null);
    setPlaybackRate(1);

    const isTextBased =
      file.mimeType.startsWith("text/") ||
      file.mimeType.includes("json") ||
      file.mimeType.includes("javascript") ||
      file.mimeType.includes("typescript") ||
      file.mimeType.includes("csv") ||
      /\.(txt|md|json|ts|tsx|js|jsx|py|html|css|scss|sh|yaml|yml|xml|csv|log|env|sql)$/i.test(
        file.name,
      );

    if (isTextBased) {
      setIsLoadingContent(true);
      driveService
        .getTextContent(file.driveId)
        .then((res) => setTextContent(res.content))
        .catch(() => setHasError(true))
        .finally(() => setIsLoadingContent(false));
    }
  }, [file]);

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
    mime.includes("pdf") ||
    mime.startsWith("application/vnd.google-apps.") ||
    name.endsWith(".pdf");
  const isImage =
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name);
  const isVideo =
    mime.startsWith("video/") || /\.(mp4|webm|mkv|mov|avi|m4v)$/i.test(name);
  const isAudio =
    mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name);
  const isMarkdown = mime === "text/markdown" || /\.(md|markdown)$/i.test(name);
  const isTextBased =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("csv") ||
    /\.(txt|json|ts|tsx|js|jsx|py|html|css|scss|sh|yaml|yml|xml|csv|log|env|sql)$/i.test(
      name,
    );

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

  const textLines = textContent ? textContent.split("\n") : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex flex-col w-full h-full max-w-7xl max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-10">
        {/* Modal Header (Remains the same) */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="shrink-0 p-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
              {getFileIcon(file.mimeType, file.isFolder, "h-5 w-5")}
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-base font-semibold text-slate-100 truncate"
                title={file.name}
              >
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="truncate max-w-[160px] rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {file.mimeType
                    .replace("application/", "")
                    .replace("vnd.google-apps.", "Google ")}
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

          <div className="flex items-center gap-2 shrink-0">
            {fileItemsOnly.length > 1 && (
              <div className="hidden sm:flex items-center rounded-xl border border-slate-800 bg-slate-800/80 p-0.5 mr-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyDirectUrl}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-xs font-medium text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-300 transition-colors"
            >
              {isUrlCopied ? (
                <Check className="h-4 w-4 text-teal-400" />
              ) : (
                <Link className="h-4 w-4" />
              )}
              <span className="hidden md:inline">
                {isUrlCopied ? "Link Copied" : "Copy Link"}
              </span>
            </button>
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-xs font-medium text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden md:inline">Pop Out</span>
            </a>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-teal-500 transition-all disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-800/80 p-2 text-slate-400 hover:border-slate-700 hover:bg-slate-700/80 hover:text-white transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative flex-1 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
          {isPdfOrDoc ? (
            <iframe
              src={viewUrl}
              title={file.name}
              className="w-full h-full border-0 bg-slate-900"
            />
          ) : isImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto">
              {/* Zoom controls remain exactly the same */}
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-slate-900/90 border border-slate-800 p-1.5 shadow-lg z-20 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setImageScale((s) => Math.max(0.3, s - 0.25))}
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageScale(1)}
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
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1.5 z-20 backdrop-blur">
                <Gauge className="h-3.5 w-3.5 text-teal-400 ml-1" />
                <span className="text-xs text-slate-400 mr-1">Speed:</span>
                {[1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handlePlaybackRateChange(speed)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-mono transition-colors ${playbackRate === speed ? "bg-teal-500/20 text-teal-300 font-semibold" : "text-slate-400 hover:text-slate-200"}`}
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
            <div className="flex flex-col items-center justify-center p-8 max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-950/40 mb-6">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h4 className="text-base font-semibold text-slate-100 text-center truncate w-full mb-1">
                {file.name}
              </h4>
              <p className="text-xs text-slate-400 mb-6">
                {formatBytes(file.size)}
              </p>
              <audio
                ref={audioRef}
                src={viewUrl}
                controls
                className="w-full mb-4"
                autoPlay={false}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : isMarkdown ? (
            /* --- WIDE LAYOUT WITH SLATE THEME --- */
            <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
              <div className="flex-1 overflow-auto p-6 md:p-12 bg-slate-900/50">
                {isLoadingContent ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-400 h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                    <p className="text-xs">Compiling Markdown...</p>
                  </div>
                ) : hasError ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
                    <FileQuestion className="h-10 w-10 text-rose-400" />
                    <p className="text-sm text-slate-300">
                      Could not read markdown source
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      w-full max-w-none
                      prose prose-invert prose-teal 
                      prose-headings:font-semibold prose-headings:text-slate-100 
                      prose-h1:text-3xl prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-2
                      prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-slate-200 
                      prose-code:text-teal-300 prose-code:bg-teal-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
                      prose-blockquote:border-l-teal-500 prose-blockquote:bg-teal-950/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-slate-300
                      prose-img:rounded-xl prose-img:shadow-lg
                      prose-th:bg-slate-800/50 prose-th:p-3 prose-th:border prose-th:border-slate-700
                      prose-td:p-3 prose-td:border prose-td:border-slate-700/50
                      break-words
                    "
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          if (!inline && match) {
                            return (
                              <CodeBlock
                                language={match[1]}
                                value={String(children).replace(/\n$/, "")}
                              />
                            );
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {textContent || ""}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ) : isTextBased ? (
            /* 5. Text / Code / JSON View */
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span>Source Code</span>
                  {textLines.length > 0 && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono">
                      {textLines.length} lines
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWordWrap((w) => !w)}
                    className={`flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 transition-colors ${isWordWrap ? "bg-teal-500/20 text-teal-300 border-teal-500/40" : "bg-slate-800 text-slate-400 hover:text-white"}`}
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
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {isLoadingContent ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-auto flex text-xs font-mono bg-slate-950">
                  <div className="py-4 pl-3 pr-3 select-none text-right text-slate-600 bg-slate-950/60 border-r border-slate-800/80 shrink-0 font-mono">
                    {textLines.map((_, i) => (
                      <div key={i} className="leading-relaxed">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <pre
                    className={`flex-1 p-4 text-slate-200 leading-relaxed font-mono selection:bg-teal-500 selection:text-white ${isWordWrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}
                  >
                    {textContent}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* 6. Binary File Fallback */
            <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 mb-4 shadow-xl">
                {getFileIcon(file.mimeType, file.isFolder, "h-14 w-14")}
              </div>
              <h4 className="text-base font-semibold text-slate-100 mb-1">
                No In-Browser Preview
              </h4>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 transition-all"
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
