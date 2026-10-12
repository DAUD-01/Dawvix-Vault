import React, { useState } from 'react';
import { FileItem } from '../types';
import { formatBytes, getFileBadge, getFileTypeMeta } from '../utils/fileUtils';
import { useTheme } from '../context/ThemeContext';
import { MoreVertical } from 'lucide-react';

interface FileCardProps {
  file: FileItem;
  isSelected?: boolean;
  isCut?: boolean;
  selectedFileIds?: Set<string>;
  onToggleSelect?: (fileId: string) => void;
  onOpenFolder: (folderId: string, folderName: string) => void;
  onPreviewFile: (file: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItem) => void;
  onDropOnFolder?: (targetFolderId: string, itemIds: string[]) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected = false,
  isCut = false,
  selectedFileIds,
  onToggleSelect,
  onOpenFolder,
  onPreviewFile,
  onContextMenu,
  onDropOnFolder,
}) => {
  const { mode } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    if (file.isFolder) {
      onOpenFolder(file.driveId, file.name);
    } else {
      onPreviewFile(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, file);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    const itemIds =
      selectedFileIds && selectedFileIds.has(file.driveId)
        ? Array.from(selectedFileIds)
        : [file.driveId];
    e.dataTransfer.setData('application/json', JSON.stringify(itemIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isFolder) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!file.isFolder) return;
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr && onDropOnFolder) {
        const itemIds = JSON.parse(dataStr);
        if (Array.isArray(itemIds) && itemIds.length > 0) {
          onDropOnFolder(file.driveId, itemIds);
        }
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  const typeMeta = getFileTypeMeta(file.mimeType, file.isFolder, mode);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      data-selected={isSelected}
      data-drag-over={isDragOver}
      className={`group relative h-36 overflow-hidden rounded-lg border p-4 transition-colors duration-150 glass-card ${
        isDragOver
          ? 'border-primary bg-primary-container/40 ring-1 ring-primary'
          : isSelected
          ? 'border-primary/70 bg-primary-container/45 ring-1 ring-primary/50'
          : file.isFolder
          ? 'border-amber-500/25 bg-amber-500/[0.035] hover:border-amber-500/40 hover:bg-amber-500/[0.06]'
          : 'border-outline/[0.06] bg-surface/70 hover:border-outline/[0.12] hover:bg-surface/85'
      } ${isCut ? 'opacity-40 border-dashed border-teal-500/40' : ''}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${file.isFolder ? 'Open folder' : 'Preview file'} ${file.name}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary)]"
      />
      <div className="relative z-10 flex h-full flex-col justify-between pointer-events-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <div className="flex min-h-6 min-w-6 items-center justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(file.driveId)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${file.name}`}
                className="pointer-events-auto h-4 w-4 cursor-pointer rounded border-outline/30 bg-surface-variant text-teal-400 focus:ring-teal-400/30 transition-transform active:scale-95"
              />
            </div>
          )}
          {getFileBadge(file.mimeType, file.isFolder, 'h-5 w-5', 'p-2.5', mode)}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu?.(e, file);
          }}
          aria-label={`More actions for ${file.name}`}
          className="glass-button pointer-events-auto flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] transition-colors"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Card Content & Metadata */}
      <div className="mt-4 min-w-0">
        <h4
          aria-hidden="true"
          className="truncate text-sm font-semibold text-slate-200 transition-colors group-hover:text-teal-300"
        >
          {file.name}
        </h4>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-medium text-slate-400">
            {file.isFolder ? 'Folder' : formatBytes(file.size)}
          </span>
          <span
            className={`rounded-md border px-1.5 py-0.2 text-[9px] font-medium uppercase tracking-wider ${typeMeta.border} ${typeMeta.bg} ${typeMeta.color}`}
          >
            {typeMeta.label}
          </span>
        </div>
      </div>
      </div>
    </div>
  );
};
