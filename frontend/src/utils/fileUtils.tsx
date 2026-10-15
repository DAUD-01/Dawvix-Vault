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

export const getFileTypeMeta = (
  mimeType: string,
  isFolder: boolean,
  mode: 'dark' | 'light' = 'dark',
): FileTypeMeta => {
  const colors = mode === 'light'
    ? {
        folder: 'text-amber-800',
        pdf: 'text-rose-800',
        document: 'text-blue-700',
        spreadsheet: 'text-emerald-800',
        presentation: 'text-orange-800',
        image: 'text-purple-700',
        video: 'text-sky-800',
        audio: 'text-pink-800',
        archive: 'text-yellow-800',
        code: 'text-[color:var(--color-primary)]',
        file: 'text-slate-400',
      }
    : {
        folder: 'text-amber-400',
        pdf: 'text-rose-400',
        document: 'text-blue-400',
        spreadsheet: 'text-emerald-400',
        presentation: 'text-orange-400',
        image: 'text-purple-400',
        video: 'text-sky-400',
        audio: 'text-pink-400',
        archive: 'text-yellow-400',
        code: 'text-teal-300',
        file: 'text-slate-400',
      };

  if (isFolder) {
    return {
      color: colors.folder,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      label: 'Folder',
    };
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf')) {
    return {
      color: colors.pdf,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      label: 'PDF',
    };
  }

  if (mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.includes('text')) {
    return {
      color: colors.document,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/25',
      label: 'Document',
    };
  }

  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return {
      color: colors.spreadsheet,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      label: 'Sheet',
    };
  }

  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return {
      color: colors.presentation,
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/25',
      label: 'Slides',
    };
  }

  if (mime.startsWith('image/')) {
    return {
      color: colors.image,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/25',
      label: 'Image',
    };
  }

  if (mime.startsWith('video/')) {
    return {
      color: colors.video,
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/25',
      label: 'Video',
    };
  }

  if (mime.startsWith('audio/')) {
    return {
      color: colors.audio,
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/25',
      label: 'Audio',
    };
  }

  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || mime.includes('archive')) {
    return {
      color: colors.archive,
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
      color: colors.code,
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/25',
      label: 'Code',
    };
  }

  return {
    color: colors.file,
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/25',
    label: 'File',
  };
};

export const getFileIcon = (
  mimeType: string,
  isFolder: boolean,
  sizeClass: string = 'h-4 w-4',
  mode: 'dark' | 'light' = 'dark',
): JSX.Element => {
  const color = getFileTypeMeta(mimeType, isFolder, mode).color;

  if (isFolder) {
    const fillColor = mode === 'light' ? 'fill-amber-800/20' : 'fill-amber-400/20';
    return <Folder className={`${sizeClass} ${color} ${fillColor}`} />;
  }

  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.includes('text')) {
    return <FileText className={`${sizeClass} ${color}`} />;
  }

  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return <FileSpreadsheet className={`${sizeClass} ${color}`} />;
  }

  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return <Presentation className={`${sizeClass} ${color}`} />;
  }

  if (mime.startsWith('image/')) {
    return <ImageIcon className={`${sizeClass} ${color}`} />;
  }

  if (mime.startsWith('video/')) {
    return <VideoIcon className={`${sizeClass} ${color}`} />;
  }

  if (mime.startsWith('audio/')) {
    return <Music className={`${sizeClass} ${color}`} />;
  }

  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || mime.includes('archive')) {
    return <Archive className={`${sizeClass} ${color}`} />;
  }

  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('code')
  ) {
    return <FileCode className={`${sizeClass} ${color}`} />;
  }

  return <File className={`${sizeClass} ${color}`} />;
};

export const getFileBadge = (
  mimeType: string,
  isFolder: boolean,
  iconSize: string = 'h-4 w-4',
  containerClass: string = 'p-2',
  mode: 'dark' | 'light' = 'dark',
): JSX.Element => {
  const meta = getFileTypeMeta(mimeType, isFolder, mode);
  return (
    <div
      className={`rounded-xl border ${meta.border} ${meta.bg} ${containerClass} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}
    >
      {getFileIcon(mimeType, isFolder, iconSize, mode)}
    </div>
  );
};
