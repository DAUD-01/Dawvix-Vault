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

const CODE_FILE_TYPES: Record<string, { label: string; shorthand: string }> = {
  asm: { label: 'Assembly', shorthand: 'ASM' },
  astro: { label: 'Astro', shorthand: 'AST' },
  bash: { label: 'Bash', shorthand: 'SH' },
  c: { label: 'C', shorthand: 'C' },
  cc: { label: 'C++', shorthand: 'C++' },
  class: { label: 'Java Bytecode', shorthand: 'JVM' },
  clj: { label: 'Clojure', shorthand: 'CLJ' },
  cljs: { label: 'ClojureScript', shorthand: 'CLJS' },
  cljc: { label: 'Clojure', shorthand: 'CLJ' },
  coffee: { label: 'CoffeeScript', shorthand: 'COF' },
  cmd: { label: 'Batch Script', shorthand: 'BAT' },
  cpp: { label: 'C++', shorthand: 'C++' },
  cs: { label: 'C#', shorthand: 'C#' },
  css: { label: 'CSS', shorthand: 'CSS' },
  csh: { label: 'C Shell', shorthand: 'CSH' },
  cxx: { label: 'C++', shorthand: 'C++' },
  dart: { label: 'Dart', shorthand: 'DART' },
  diff: { label: 'Diff', shorthand: 'DIFF' },
  dockerignore: { label: 'Docker Ignore', shorthand: 'DOCK' },
  dockerfile: { label: 'Dockerfile', shorthand: 'DOCK' },
  env: { label: 'Environment Config', shorthand: 'ENV' },
  ex: { label: 'Elixir', shorthand: 'EX' },
  exs: { label: 'Elixir', shorthand: 'EX' },
  fish: { label: 'Fish Shell', shorthand: 'FISH' },
  fs: { label: 'F#', shorthand: 'F#' },
  fsi: { label: 'F# Interactive', shorthand: 'FSI' },
  fsx: { label: 'F# Script', shorthand: 'FSX' },
  go: { label: 'Go', shorthand: 'GO' },
  gradle: { label: 'Gradle', shorthand: 'GR' },
  gitignore: { label: 'Git Ignore', shorthand: 'GIT' },
  groovy: { label: 'Groovy', shorthand: 'GRV' },
  h: { label: 'C/C++ Header', shorthand: 'H' },
  haml: { label: 'Haml', shorthand: 'HAML' },
  hh: { label: 'C++ Header', shorthand: 'HH' },
  hpp: { label: 'C++ Header', shorthand: 'HPP' },
  hs: { label: 'Haskell', shorthand: 'HS' },
  html: { label: 'HTML', shorthand: 'HTML' },
  hxx: { label: 'C++ Header', shorthand: 'HXX' },
  ini: { label: 'INI', shorthand: 'INI' },
  ipynb: { label: 'Jupyter Notebook', shorthand: 'NB' },
  java: { label: 'Java', shorthand: 'JAVA' },
  jl: { label: 'Julia', shorthand: 'JL' },
  js: { label: 'JavaScript', shorthand: 'JS' },
  json: { label: 'JSON', shorthand: '{}' },
  json5: { label: 'JSON5', shorthand: 'J5' },
  jsonc: { label: 'JSONC', shorthand: 'JC' },
  jsx: { label: 'React JSX', shorthand: 'JSX' },
  kt: { label: 'Kotlin', shorthand: 'KT' },
  kts: { label: 'Kotlin Script', shorthand: 'KTS' },
  less: { label: 'Less', shorthand: 'LESS' },
  lua: { label: 'Lua', shorthand: 'LUA' },
  m: { label: 'Objective-C', shorthand: 'OC' },
  makefile: { label: 'Makefile', shorthand: 'MK' },
  md: { label: 'Markdown', shorthand: 'MD' },
  markdown: { label: 'Markdown', shorthand: 'MD' },
  mli: { label: 'OCaml Interface', shorthand: 'MLI' },
  ml: { label: 'OCaml', shorthand: 'ML' },
  mm: { label: 'Objective-C++', shorthand: 'OC++' },
  pl: { label: 'Perl', shorthand: 'PL' },
  pm: { label: 'Perl Module', shorthand: 'PM' },
  php: { label: 'PHP', shorthand: 'PHP' },
  phtml: { label: 'PHP', shorthand: 'PHP' },
  psm1: { label: 'PowerShell Module', shorthand: 'PSM' },
  ps1: { label: 'PowerShell', shorthand: 'PS' },
  py: { label: 'Python', shorthand: 'PY' },
  pyi: { label: 'Python Stub', shorthand: 'PYI' },
  r: { label: 'R', shorthand: 'R' },
  rake: { label: 'Ruby Rakefile', shorthand: 'RB' },
  rb: { label: 'Ruby', shorthand: 'RB' },
  rmd: { label: 'R Markdown', shorthand: 'RMD' },
  rs: { label: 'Rust', shorthand: 'RS' },
  sass: { label: 'Sass', shorthand: 'SASS' },
  scala: { label: 'Scala', shorthand: 'SC' },
  sc: { label: 'Scala', shorthand: 'SC' },
  scss: { label: 'SCSS', shorthand: 'SCSS' },
  sh: { label: 'Shell Script', shorthand: 'SH' },
  sql: { label: 'SQL', shorthand: 'SQL' },
  swift: { label: 'Swift', shorthand: 'SW' },
  t: { label: 'Perl Test', shorthand: 'T' },
  ts: { label: 'TypeScript', shorthand: 'TS' },
  tsx: { label: 'React TSX', shorthand: 'TSX' },
  toml: { label: 'TOML', shorthand: 'TOML' },
  vb: { label: 'Visual Basic', shorthand: 'VB' },
  vbs: { label: 'VBScript', shorthand: 'VBS' },
  vue: { label: 'Vue', shorthand: 'VUE' },
  xml: { label: 'XML', shorthand: 'XML' },
  xquery: { label: 'XQuery', shorthand: 'XQ' },
  y: { label: 'Yacc', shorthand: 'Y' },
  yaml: { label: 'YAML', shorthand: 'YML' },
  yml: { label: 'YAML', shorthand: 'YML' },
  zig: { label: 'Zig', shorthand: 'ZIG' },
};

const getFileExtension = (fileName: string): string =>
  fileName.toLowerCase().split('.').pop() || '';

export const getCodeFileType = (fileName: string) =>
  CODE_FILE_TYPES[getFileExtension(fileName)];

export const isCodeFile = (mimeType: string, fileName: string): boolean => {
  const mime = mimeType.toLowerCase();
  return (
    Boolean(getCodeFileType(fileName)) ||
    mime.includes('code') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('x-python') ||
    mime.includes('x-java') ||
    mime.includes('x-c') ||
    mime.includes('x-go') ||
    mime.includes('x-rust') ||
    mime.includes('x-shellscript') ||
    mime.startsWith('text/x-')
  );
};

export const getFileTypeMeta = (
  mimeType: string,
  isFolder: boolean,
  mode: 'dark' | 'light' = 'dark',
  fileName: string = '',
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

  if (isCodeFile(mime, fileName)) {
    const codeType = getCodeFileType(fileName);
    return {
      color: colors.code,
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/25',
      label: codeType?.label || 'Code',
    };
  }

  if (mime.includes('pdf')) {
    return {
      color: colors.pdf,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      label: 'PDF',
    };
  }

  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'odp'].includes(getFileExtension(fileName))
  ) {
    return {
      color: colors.presentation,
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/25',
      label: 'Slides',
    };
  }

  if (mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.startsWith('text/')) {
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
  fileName: string = '',
): JSX.Element => {
  const color = getFileTypeMeta(mimeType, isFolder, mode, fileName).color;

  if (isFolder) {
    const fillColor = mode === 'light' ? 'fill-amber-800/20' : 'fill-amber-400/20';
    return <Folder className={`${sizeClass} ${color} ${fillColor}`} />;
  }

  const mime = mimeType.toLowerCase();

  if (isCodeFile(mime, fileName)) {
    const codeType = getCodeFileType(fileName);
    if (codeType) {
      return (
        <span
          aria-hidden="true"
          className={`${sizeClass} inline-flex items-center justify-center overflow-hidden font-mono text-[0.55em] font-bold leading-none tracking-tight ${color}`}
        >
          {codeType.shorthand}
        </span>
      );
    }
    return <FileCode className={`${sizeClass} ${color}`} />;
  }

  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'odp'].includes(getFileExtension(fileName))
  ) {
    return <Presentation className={`${sizeClass} ${color}`} />;
  }

  if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('markdown') || mime.startsWith('text/')) {
    return <FileText className={`${sizeClass} ${color}`} />;
  }

  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return <FileSpreadsheet className={`${sizeClass} ${color}`} />;
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

  return <File className={`${sizeClass} ${color}`} />;
};

export const getFileBadge = (
  mimeType: string,
  isFolder: boolean,
  iconSize: string = 'h-4 w-4',
  containerClass: string = 'p-2',
  mode: 'dark' | 'light' = 'dark',
  fileName: string = '',
): JSX.Element => {
  const meta = getFileTypeMeta(mimeType, isFolder, mode, fileName);
  return (
    <div
      className={`rounded-xl border ${meta.border} ${meta.bg} ${containerClass} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}
    >
      {getFileIcon(mimeType, isFolder, iconSize, mode, fileName)}
    </div>
  );
};
