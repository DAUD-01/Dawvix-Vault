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

export interface FileTypeMeta {
  color: string;
  bg: string;
  border: string;
  label: string;
}

export const getFileTypeMeta = (mimeType: string, isFolder: boolean): FileTypeMeta => {
  if (isFolder) {
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      label: 'Folder',
    };
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf')) {
    return {
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      label: 'PDF',
    };
  }

  if (mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.includes('text')) {
    return {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/25',
      label: 'Document',
    };
  }

  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      label: 'Sheet',
    };
  }

  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return {
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/25',
      label: 'Slides',
    };
  }

  if (mime.startsWith('image/')) {
    return {
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/25',
      label: 'Image',
    };
  }

  if (mime.startsWith('video/')) {
    return {
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/25',
      label: 'Video',
    };
  }

  if (mime.startsWith('audio/')) {
    return {
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/25',
      label: 'Audio',
    };
  }

  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || mime.includes('archive')) {
    return {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/25',
      label: 'Archive',
    };
  }

  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('code')
  ) {
    return {
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/25',
      label: 'Code',
    };
  }

  return {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/25',
    label: 'File',
  };
};

export const getFileIcon = (
  mimeType: string,
  isFolder: boolean,
  sizeClass: string = 'h-4 w-4'
): JSX.Element => {
  if (isFolder) {
    return <Folder className={`${sizeClass} text-amber-400 fill-amber-400/20`} />;
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.includes('text')) {
    return <FileText className={`${sizeClass} text-blue-400`} />;
  }

  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return <FileSpreadsheet className={`${sizeClass} text-emerald-400`} />;
  }

  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return <Presentation className={`${sizeClass} text-orange-400`} />;
  }

  if (mime.startsWith('image/')) {
    return <ImageIcon className={`${sizeClass} text-purple-400`} />;
  }

  if (mime.startsWith('video/')) {
    return <VideoIcon className={`${sizeClass} text-sky-400`} />;
  }

  if (mime.startsWith('audio/')) {
    return <Music className={`${sizeClass} text-pink-400`} />;
  }

  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || mime.includes('archive')) {
    return <Archive className={`${sizeClass} text-yellow-400`} />;
  }

  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('code')
  ) {
    return <FileCode className={`${sizeClass} text-teal-400`} />;
  }

  return <File className={`${sizeClass} text-slate-400`} />;
};

export const getFileBadge = (
  mimeType: string,
  isFolder: boolean,
  iconSize: string = 'h-4 w-4',
  containerClass: string = 'p-2'
): JSX.Element => {
  const meta = getFileTypeMeta(mimeType, isFolder);
  return (
    <div
      className={`rounded-xl border ${meta.border} ${meta.bg} ${containerClass} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}
    >
      {getFileIcon(mimeType, isFolder, iconSize)}
    </div>
  );
};
