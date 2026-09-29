import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Archive,
  Presentation,
  File,
} from 'lucide-react';

export const formatBytes = (bytes: number, decimals: number = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getFileIcon = (mimeType: string, isFolder: boolean, sizeClass: string = 'h-5 w-5'): JSX.Element => {
  if (isFolder) {
    return <Folder className={`${sizeClass} text-amber-400 fill-amber-400/20`} />;
  }

  // Google Workspace Docs, PDF, or Markdown
  if (mimeType.includes('pdf') || mimeType.includes('google-apps.document') || mimeType.includes('markdown')) {
    return <FileText className={`${sizeClass} text-rose-400`} />;
  }

  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('google-apps.spreadsheet')
  ) {
    return <FileSpreadsheet className={`${sizeClass} text-emerald-400`} />;
  }

  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('google-apps.presentation')
  ) {
    return <Presentation className={`${sizeClass} text-amber-400`} />;
  }

  if (mimeType.startsWith('image/')) {
    return <ImageIcon className={`${sizeClass} text-purple-400`} />;
  }

  if (mimeType.startsWith('video/')) {
    return <VideoIcon className={`${sizeClass} text-sky-400`} />;
  }

  if (mimeType.startsWith('audio/')) {
    return <Music className={`${sizeClass} text-pink-400`} />;
  }

  if (
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    mimeType.includes('tar') ||
    mimeType.includes('archive')
  ) {
    return <Archive className={`${sizeClass} text-yellow-400`} />;
  }

  if (
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('html') ||
    mimeType.includes('code')
  ) {
    return <FileCode className={`${sizeClass} text-teal-400`} />;
  }

  return <File className={`${sizeClass} text-slate-400`} />;
};
