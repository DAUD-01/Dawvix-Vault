import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { FileRow } from '../components/FileRow';
import { FileCard } from '../components/FileCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { ContextMenu } from '../components/ContextMenu';
import { RenameModal } from '../components/RenameModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { CreateFileModal } from '../components/CreateFileModal';
import { FilePropertiesModal } from '../components/FilePropertiesModal';
import { useAuth } from '../context/AuthContext';
import { driveService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { formatBytes, isCodeFile } from '../utils/fileUtils';
import {
  FileItem,
  BreadcrumbItem,
  SortBy,
  SortOrder,
  SearchScope,
  ToastMessage,
  VaultClipboard,
  ContextMenuState,
  VaultStats,
} from '../types';
import {
  FolderPlus,
  FilePlus,
  Clipboard,
  Inbox,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  Info,
  Copy,
  Scissors,
  Check,
  Download,
  Link,
  CheckSquare,
  Square,
  X,
  UploadCloud,
  Trash2,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { isExternalFileDrag } from '../utils/dragAndDrop';

const SORT_PREFERENCES_KEY = 'vault_sort_preferences';

const isSortBy = (value: unknown): value is SortBy =>
  value === 'name' || value === 'size' || value === 'lastSyncedAt' || value === 'mimeType';

const readSortPreferences = (): { sortBy: SortBy; sortOrder: SortOrder } => {
  try {
    const saved = localStorage.getItem(SORT_PREFERENCES_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'sortBy' in parsed &&
        'sortOrder' in parsed &&
        isSortBy(parsed.sortBy) &&
        (parsed.sortOrder === 'asc' || parsed.sortOrder === 'desc')
      ) {
        return { sortBy: parsed.sortBy, sortOrder: parsed.sortOrder };
      }
    }
  } catch (error) {
    console.error('Unable to restore file sort preferences.', error);
  }
  return { sortBy: 'name', sortOrder: 'asc' };
};

const matchesFileType = (file: FileItem, filterType: string): boolean => {
  if (filterType === 'all') return true;
  if (filterType === 'folders') return file.isFolder;
  if (file.isFolder) return false;

  const mime = file.mimeType.toLowerCase();
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const hasExtension = (...extensions: string[]) => extensions.includes(extension);

  switch (filterType) {
    case 'pdf':
      return mime.includes('pdf') || hasExtension('pdf');
    case 'documents':
      return (
        mime.includes('document') ||
        mime.includes('word') ||
        mime.includes('markdown') ||
        (mime.startsWith('text/') && !mime.includes('csv') && !hasExtension('csv')) ||
        hasExtension('doc', 'docx', 'odt', 'rtf', 'txt', 'md')
      );
    case 'spreadsheets':
      return (
        mime.includes('spreadsheet') ||
        mime.includes('excel') ||
        mime.includes('csv') ||
        hasExtension('xls', 'xlsx', 'ods', 'csv')
      );
    case 'presentations':
      return (
        mime.includes('presentation') ||
        mime.includes('powerpoint') ||
        hasExtension('ppt', 'pptx', 'odp')
      );
    case 'images':
      return mime.startsWith('image/') || hasExtension('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp');
    case 'media':
      return (
        mime.startsWith('video/') ||
        mime.startsWith('audio/') ||
        hasExtension('mp4', 'mov', 'webm', 'mp3', 'wav', 'ogg')
      );
    case 'archives':
      return (
        mime.includes('zip') ||
        mime.includes('compressed') ||
        mime.includes('tar') ||
        mime.includes('archive') ||
        hasExtension('zip', 'tar', 'gz', 'rar', '7z', 'bz2')
      );
    case 'code':
      return isCodeFile(mime, file.name);
    default:
      return false;
  }
};

const getCanonicalFileKey = (file: FileItem): string =>
  [
    file.isFolder ? 'folder' : 'file',
    file.name.trim().toLocaleLowerCase(),
    file.mimeType.toLocaleLowerCase(),
    String(file.size),
    [...file.parents].sort().join(','),
  ].join('\u0000');

const getNewestFile = (current: FileItem | undefined, candidate: FileItem): FileItem => {
  if (!current) return candidate;
  return new Date(candidate.lastSyncedAt).getTime() > new Date(current.lastSyncedAt).getTime()
    ? candidate
    : current;
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { bgImageUrl, bgImageBlur, mode, surfaceStyle } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFolder = searchParams.get('folder') || 'root';

  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolder);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Vault Root' },
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'pending' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  // Multi-selection state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Clipboard state
  const [clipboard, setClipboard] = useState<VaultClipboard | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetItem: null,
  });

  // Modal states
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; item: FileItem | null }>({
    isOpen: false,
    item: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; items: FileItem[] }>({
    isOpen: false,
    items: [],
  });
  const [propertiesModal, setPropertiesModal] = useState<{ isOpen: boolean; item: FileItem | null }>({
    isOpen: false,
    item: null,
  });
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState<boolean>(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addMenuItemsRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Drag and drop state for desktop file uploads
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{
    percent: number;
    fileCount: number;
  } | null>(null);
  const uploadInProgressRef = useRef(false);

  // Search, scope, filter, sort & display states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<SearchScope>('folder');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortPreferences, setSortPreferences] = useState(readSortPreferences);
  const { sortBy, sortOrder } = sortPreferences;
  const initialSortPreferences = useRef(sortPreferences);
  const [isGrid, setIsGrid] = useState<boolean>(false);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [uploadRetryFiles, setUploadRetryFiles] = useState<File[]>([]);
  const [uploadRetryFolderId, setUploadRetryFolderId] = useState<string>('root');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const latestFilesRequestRef = useRef(0);

  const handleColumnSort = (column: SortBy) => {
    setSortPreferences((previous) => ({
      sortBy: column,
      sortOrder: previous.sortBy === column && previous.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(sortPreferences));
    } catch (error) {
      console.error('Unable to save file sort preferences.', error);
    }
  }, [sortPreferences]);

  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isAddMenuOpen]);

  useEffect(() => {
    if (isAddMenuOpen) {
      addMenuItemsRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }
  }, [isAddMenuOpen]);

  const handleNewMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      addMenuItemsRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsAddMenuOpen(false);
      addButtonRef.current?.focus();
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex <= 0 ? items.length : currentIndex) - 1;
    items[nextIndex].focus();
  };

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUploadFiles = async (
    uploadedFiles: File[],
    targetFolderId: string = currentFolderId,
  ) => {
    if (uploadedFiles.length === 0) return;
    if (uploadInProgressRef.current) {
      addToast('Please wait for the current upload to finish.', 'info');
      return;
    }
    uploadInProgressRef.current = true;
    setUploadRetryFiles([]);
    setUploadProgress({ percent: 0, fileCount: uploadedFiles.length });
    try {
      addToast(`Uploading ${uploadedFiles.length} file(s)...`, 'info');
      await driveService.uploadFiles(
        uploadedFiles,
        targetFolderId === 'root' ? undefined : targetFolderId,
        (percent) => setUploadProgress({ percent, fileCount: uploadedFiles.length }),
      );
      addToast(`Successfully uploaded ${uploadedFiles.length} file(s)!`, 'success');
      if (targetFolderId === currentFolderId) {
        await fetchFiles(currentFolderId, searchScope);
      }
      setUploadRetryFiles([]);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error';
      setUploadRetryFiles(uploadedFiles);
      setUploadRetryFolderId(targetFolderId);
      addToast(`Upload failed: ${msg}`, 'error');
    } finally {
      setUploadProgress(null);
      uploadInProgressRef.current = false;
    }
  };

  // Fetch vault-wide stats for the table card footer (Issue 5)
  const fetchVaultStats = useCallback(async () => {
    try {
      const result = await driveService.getStats();
      if (result.success) {
        setVaultStats(result.stats);
      }
    } catch (err) {
      console.error('Unable to load vault stats.', err);
    }
  }, []);

  // Fetch files whenever folder or global search mode changes
  const fetchFiles = async (folderId: string, scope: SearchScope = searchScope) => {
    const requestId = ++latestFilesRequestRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isGlobal = scope === 'vault';
      const data = await driveService.getFiles({
        folderId: isGlobal ? undefined : folderId,
        all: isGlobal,
        search: isGlobal && searchQuery ? searchQuery : undefined,
        sortBy,
        order: sortOrder,
      });

      // Keep every downstream interaction (selection, preview, batch actions) tied
      // to one canonical item per Drive id, even if an upstream response is stale.
      if (requestId !== latestFilesRequestRef.current) return;

      const uniqueFiles = (data.files || []).reduce<Map<string, FileItem>>((unique, file) => {
        const key = getCanonicalFileKey(file);
        unique.set(key, getNewestFile(unique.get(key), file));
        return unique;
      }, new Map());
      setFiles(Array.from(uniqueFiles.values()));

      if (folderId === 'root' && data.rootFolderId && data.rootFolderId !== 'root') {
        setCurrentFolderId(data.rootFolderId);
        setBreadcrumbs([{ id: data.rootFolderId, name: 'Vault Root' }]);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Unable to load files. Check database connection or network status.';
      if (requestId === latestFilesRequestRef.current) {
        setFiles([]);
        setErrorMessage(msg);
      }
    } finally {
      if (requestId === latestFilesRequestRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Sync folder state with URL parameter
  useEffect(() => {
    const urlFolder = searchParams.get('folder') || 'root';
    if (urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
      setSelectedFileIds(new Set());
    }
  }, [searchParams]);

  // Fetch vault stats on mount
  useEffect(() => {
    void fetchVaultStats();
  }, [fetchVaultStats]);

  useEffect(() => {
    if (searchScope === 'folder') {
      fetchFiles(currentFolderId, searchScope);
    }
  }, [currentFolderId, searchScope, sortBy, sortOrder]);

  useEffect(() => {
    if (searchScope === 'vault') {
      const timer = setTimeout(() => {
        fetchFiles(currentFolderId, searchScope);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchScope, currentFolderId, sortBy, sortOrder]);

  // Folder navigation
  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setSearchParams({ folder: folderId });
    setBreadcrumbs((prev) =>
      searchScope === 'vault'
        ? [...prev.slice(0, 1), { id: folderId, name: folderName }]
        : [...prev, { id: folderId, name: folderName }],
    );
    setSearchQuery('');
    setSearchScope('folder');
    setSelectedFileIds(new Set());
  };

  // Breadcrumb click navigation
  const handleSelectBreadcrumb = (folderId: string, index: number) => {
    setCurrentFolderId(folderId);
    setSearchParams({ folder: folderId });
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
    setSelectedFileIds(new Set());
  };

  // Handle Sync Drive trigger
  const handleSyncDrive = async (folderId?: string) => {
    setSyncStatus('syncing');
    setSyncMessage(null);
    setErrorMessage(null);

    try {
      const data = await driveService.syncDrive(folderId);
      const msg = data.message || `Successfully synced items from Google Drive.`;
      setSyncMessage(msg);
      addToast(msg, 'success');
      setSyncStatus('pending');
      // A completed sync returns the user to the folder they were working in,
      // rather than leaving the explorer in the vault-wide search mode.
      setSearchScope('folder');
      setSearchQuery('');
      await fetchFiles(currentFolderId, 'folder');
      await fetchVaultStats();
      setSyncStatus('idle');
      setTimeout(() => setSyncMessage(null), 8000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Drive synchronization failed. Please check credentials in backend.';
      setErrorMessage(msg);
      setSyncStatus('error');
      addToast(msg, 'error');
    }
  };

  const handleRefresh = async () => {
    await handleSyncDrive(currentFolderId === 'root' ? undefined : currentFolderId);
  };

  // File operations
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await driveService.createFolder(
        newFolderName.trim(),
        currentFolderId === 'root' ? undefined : currentFolderId
      );
      addToast(`Folder "${newFolderName.trim()}" created successfully!`, 'success');
      fetchFiles(currentFolderId, searchScope);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (err: any) {
      addToast(`Failed to create folder: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateFile = async (name: string, content: string) => {
    try {
      const result = await driveService.createFile(
        name,
        content,
        currentFolderId === 'root' ? undefined : currentFolderId
      );
      addToast(result.message || `File "${name}" created successfully!`, 'success');
      fetchFiles(currentFolderId, searchScope);
    } catch (err: any) {
      addToast(`Failed to create file: ${err.response?.data?.message || err.message}`, 'error');
      throw err;
    }
  };

  const handleRename = async (fileId: string, newName: string) => {
    try {
      const result = await driveService.renameItem(fileId, newName);
      addToast(result.message || `Renamed to "${newName}"`, 'success');
      fetchFiles(currentFolderId, searchScope);
    } catch (err: any) {
      addToast(`Rename failed: ${err.response?.data?.message || err.message}`, 'error');
      throw err;
    }
  };

  const handleCopy = (items: FileItem[]) => {
    if (items.length === 0) return;
    setClipboard({ action: 'copy', items });
    addToast(`Copied ${items.length} item${items.length === 1 ? '' : 's'}.`, 'info');
  };

  const handleCut = (items: FileItem[]) => {
    if (items.length === 0) return;
    setClipboard({ action: 'cut', items });
    addToast(`Cut ${items.length} item${items.length === 1 ? '' : 's'} (ready to paste).`, 'info');
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.items.length === 0) return;
    const { action, items } = clipboard;
    const fileIds = items.map((i) => i.driveId);

    try {
      if (action === 'cut') {
        addToast(`Moving ${items.length} item(s)...`, 'info');
        const res = await driveService.moveItems(fileIds, currentFolderId);
        addToast(res.message || `Moved successfully!`, 'success');
        setClipboard(null);
      } else {
        addToast(`Pasting ${items.length} item(s)...`, 'info');
        const res = await driveService.copyItems(fileIds, currentFolderId);
        addToast(res.message || `Pasted successfully!`, 'success');
      }
      fetchFiles(currentFolderId, searchScope);
    } catch (err: any) {
      addToast(`Paste failed: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleDropOnFolder = async (targetFolderId: string, itemIds: string[]) => {
    if (!targetFolderId || itemIds.length === 0) return;
    try {
      addToast(`Moving ${itemIds.length} item(s)...`, 'info');
      const res = await driveService.moveItems(itemIds, targetFolderId);
      addToast(res.message || `Moved successfully!`, 'success');
      setSelectedFileIds(new Set());
      fetchFiles(currentFolderId, searchScope);
    } catch (err: any) {
      addToast(`Move failed: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    const items = deleteModal.items;
    if (items.length === 0) return;

    try {
      if (items.length === 1) {
        await driveService.deleteFile(items[0].driveId);
        addToast(`Deleted "${items[0].name}"`, 'success');
      } else {
        const fileIds = items.map((i) => i.driveId);
        const res = await driveService.batchDeleteFiles(fileIds);
        addToast(res.message || `Deleted ${items.length} items.`, 'success');
      }

      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        items.forEach((i) => next.delete(i.driveId));
        return next;
      });

      fetchFiles(currentFolderId, searchScope);
    } catch (err: any) {
      addToast(`Delete failed: ${err.response?.data?.message || err.message}`, 'error');
      throw err;
    }
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      addToast(`Downloading "${filename}"...`, 'info');
      await driveService.downloadFile(fileId, filename);
      addToast(`Download complete: "${filename}"`, 'success');
    } catch (err: any) {
      addToast(`Download failed: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleSelectAllInView = () => {
    setSelectedFileIds((previous) => {
      const next = new Set(previous);
      const allVisibleSelected =
        filteredFiles.length > 0 && filteredFiles.every((file) => next.has(file.driveId));
      filteredFiles.forEach((file) => {
        if (allVisibleSelected) next.delete(file.driveId);
        else next.add(file.driveId);
      });
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    return files.filter((f) => selectedFileIds.has(f.driveId));
  }, [files, selectedFileIds]);

  const handleBatchDownload = async () => {
    const nonFolders = selectedItems.filter((f) => !f.isFolder);
    if (nonFolders.length === 0) return;

    addToast(`Queuing ${nonFolders.length} file(s) for download...`, 'info');
    for (const file of nonFolders) {
      await handleDownloadFile(file.driveId, file.name);
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  const handleBatchCopyLinks = () => {
    const nonFolders = selectedItems.filter((f) => !f.isFolder);
    if (nonFolders.length === 0) return;

    const urls = nonFolders
      .map((f) => `${f.name}:\n${window.location.origin}${driveService.getViewUrl(f.driveId)}`)
      .join('\n\n');

    navigator.clipboard.writeText(urls);
    addToast(`Copied stream links for ${nonFolders.length} file(s)!`, 'success');
  };

  const handleCopyLink = async (file: FileItem) => {
    try {
      const url = `${window.location.origin}${driveService.getViewUrl(file.driveId)}`;
      await navigator.clipboard.writeText(url);
      addToast(`Copied stream link for "${file.name}"`, 'success');
    } catch {
      addToast('Unable to copy the file link. Check clipboard permissions and try again.', 'error');
    }
  };

  const handleOpenContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: item,
    });
  };

  // Client-side filtering & sorting
  const filteredFiles = useMemo(() => {
    let result = files.filter((file) => {
      if (searchScope === 'folder' && searchQuery) {
        const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/);
        const fileName = file.name.toLowerCase();
        const matchesSearch = queryTerms.every((term) => fileName.includes(term));
        if (!matchesSearch) return false;
      }

      return matchesFileType(file, filterType);
    });

    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let cmp = 0;
      if (sortBy === 'size') {
        cmp = a.size - b.size;
      } else if (sortBy === 'lastSyncedAt') {
        cmp = new Date(a.lastSyncedAt || 0).getTime() - new Date(b.lastSyncedAt || 0).getTime();
      } else if (sortBy === 'mimeType') {
        cmp = a.mimeType.localeCompare(b.mimeType);
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [files, searchQuery, searchScope, filterType, sortBy, sortOrder]);

  const isAllSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((file) => selectedFileIds.has(file.driveId));

  const pageTitle =
    searchScope === 'vault'
      ? 'All Vault'
      : currentFolderId === 'root' || breadcrumbs.length <= 1
        ? 'Vault'
        : breadcrumbs[breadcrumbs.length - 1]?.name || 'Vault';

  const pageItemCount = `${filteredFiles.length.toLocaleString()} ${filteredFiles.length === 1 ? 'item' : 'items'}`;

  // Build a map from folderId → folderName so FileRow can show parent path in All Vault mode
  const folderPaths = useMemo(() => {
    const folderMap = new Map(files.filter((file) => file.isFolder).map((folder) => [folder.driveId, folder]));
    const pathCache = new Map<string, string[]>();
    const rootIds = new Set(['root', breadcrumbs[0]?.id ?? 'root']);

    const getFolderPath = (folderId: string, visiting = new Set<string>()): string[] => {
      const cached = pathCache.get(folderId);
      if (cached) return cached;
      const folder = folderMap.get(folderId);
      if (!folder || visiting.has(folderId)) return [];

      const nextVisiting = new Set(visiting);
      nextVisiting.add(folderId);
      const parentId = folder.parents.find((id) => !rootIds.has(id) && folderMap.has(id));
      const path = [
        ...(parentId ? getFolderPath(parentId, nextVisiting) : []),
        folder.name,
      ];
      pathCache.set(folderId, path);
      return path;
    };

    const paths = new Map<string, string>();
    files.forEach((file) => {
      const parentId = file.parents.find((id) => !rootIds.has(id) && folderMap.has(id));
      if (parentId) paths.set(file.driveId, getFolderPath(parentId).join(' / '));
    });
    return paths;
  }, [files, breadcrumbs]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (contextMenu.visible) {
          setContextMenu((prev) => ({ ...prev, visible: false }));
        } else if (selectedFileIds.size > 0) {
          setSelectedFileIds(new Set());
        }
        return;
      }

      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAllInView();
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (isAdmin && selectedItems.length > 0) {
          e.preventDefault();
          handleCopy(selectedItems);
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'x') {
        if (isAdmin && selectedItems.length > 0) {
          e.preventDefault();
          handleCut(selectedItems);
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (isAdmin && clipboard && clipboard.items.length > 0) {
          e.preventDefault();
          handlePaste();
        }
        return;
      }

      if (e.key === 'F2') {
        if (isAdmin && selectedItems.length === 1) {
          e.preventDefault();
          setRenameModal({ isOpen: true, item: selectedItems[0] });
        }
        return;
      }

      if (e.key === 'Delete') {
        if (isAdmin && selectedItems.length > 0) {
          e.preventDefault();
          setDeleteModal({ isOpen: true, items: selectedItems });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [contextMenu, selectedFileIds, selectedItems, clipboard, currentFolderId, filteredFiles, isAdmin]);

  return (
    <div
      className="min-h-screen bg-canvas text-slate-100 flex flex-col relative"
      onClick={() => {
        if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
      }}
    >
      {/* Background Image Layer (BGI-001 - BGI-018) */}
      {bgImageUrl && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <img
            src={bgImageUrl}
            alt=""
            className="h-full w-full object-cover transition-[filter,transform] duration-200"
            style={{
              filter: bgImageBlur > 0 ? `blur(${bgImageBlur}px)` : 'none',
              transform: bgImageBlur > 0 ? 'scale(1.05)' : undefined,
            }}
          />
          {/* Contrast overlay maintaining readability across light/dark and matte/glass */}
          <div
            className={`absolute inset-0 transition-colors ${
              mode === 'dark'
                ? surfaceStyle === 'glass'
                  ? 'bg-black/60'
                  : 'bg-canvas/85'
                : surfaceStyle === 'glass'
                ? 'bg-white/70'
                : 'bg-canvas/90'
            }`}
          />
        </div>
      )}

      {/* Main Interactive Content Wrapper */}
      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-surface px-4 py-2 text-sm text-on-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to files
        </a>
        {/* Top Navbar */}
        <Navbar
          onSync={() => handleSyncDrive()}
          canSync={isAdmin}
          syncStatus={syncStatus}
          lastSyncedAt={vaultStats?.lastSyncedAt ?? null}
          lastSyncedMessage={syncMessage}
          showBreadcrumbs={searchScope === 'folder'}
          breadcrumbs={breadcrumbs}
          onSelectFolder={handleSelectBreadcrumb}
          onDropOnFolder={isAdmin ? handleDropOnFolder : undefined}
          onUploadToFolder={isAdmin ? (targetFolderId, droppedFiles) => {
            void handleUploadFiles(droppedFiles, targetFolderId);
          } : undefined}
        />

      {uploadProgress && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-4 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-outline/15 bg-surface/95 p-4 text-on-surface shadow-2xl ring-1 ring-black/10 backdrop-blur-xl sm:right-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <UploadCloud className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  Uploading {uploadProgress.fileCount} file{uploadProgress.fileCount === 1 ? '' : 's'}
                </p>
                <p className="mt-0.5 text-[10px] text-[color:var(--color-text-muted)]">
                  {uploadProgress.percent >= 99 ? 'Finishing upload…' : 'Uploading to your vault'}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--color-primary)]">
              {uploadProgress.percent}%
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-variant"
            role="progressbar"
            aria-label="File upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress.percent}
          >
            <div
              className="h-full rounded-full bg-[color:var(--color-accent)] transition-[width] duration-150"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 z-50 flex max-w-sm flex-col gap-2 sm:right-6"
        style={{ bottom: uploadProgress ? '7rem' : '1.5rem' }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xl  animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'border-success/30 bg-success-container text-on-success-container'
                : toast.type === 'error'
                ? 'border-rose-500/30 bg-error-container text-on-error-container'
                : 'border-outline/[0.08] bg-surface/90 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              {toast.type === 'success' ? (
                <Check className="h-4 w-4 text-teal-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-[color:var(--color-error)] shrink-0" />
              ) : (
                <Info className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span>{toast.message}</span>
              {toast.type === 'error' &&
                toast.message.startsWith('Upload failed:') &&
                uploadRetryFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleUploadFiles(uploadRetryFiles, uploadRetryFolderId)}
                    className="min-h-6 rounded px-2 font-semibold text-[color:var(--color-error)] underline underline-offset-2 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    Retry upload
                  </button>
                )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="flex min-h-6 min-w-6 items-center justify-center text-slate-400 hover:text-on-surface transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetItem={contextMenu.targetItem}
          clipboard={clipboard}
          canEdit={isAdmin}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
          onOpenItem={(item) => handleOpenFolder(item.driveId, item.name)}
          onPreviewItem={(item) => setPreviewFile(item)}
          onDownloadItem={(item) => handleDownloadFile(item.driveId, item.name)}
          onCopyLink={handleCopyLink}
          onCopy={(items) => handleCopy(items)}
          onCut={(items) => handleCut(items)}
          onPaste={handlePaste}
          onRename={(item) => setRenameModal({ isOpen: true, item })}
          onDelete={(items) => setDeleteModal({ isOpen: true, items })}
          onProperties={(item) => setPropertiesModal({ isOpen: true, item })}
          onNewFolder={() => setIsCreateFolderModalOpen(true)}
          onNewFile={() => setIsCreateFileModalOpen(true)}
          onSelectAll={handleSelectAllInView}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          filesList={filteredFiles}
          onClose={() => setPreviewFile(null)}
          onDownloadFile={handleDownloadFile}
          onNavigateFile={(nextFile) => setPreviewFile(nextFile)}
        />
      )}

      {isAdmin && (
        <RenameModal
          isOpen={renameModal.isOpen}
          item={renameModal.item}
          onClose={() => setRenameModal({ isOpen: false, item: null })}
          onRename={handleRename}
        />
      )}

      {isAdmin && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          items={deleteModal.items}
          onClose={() => setDeleteModal({ isOpen: false, items: [] })}
          onConfirm={handleConfirmDelete}
        />
      )}

      {isAdmin && (
        <CreateFileModal
          isOpen={isCreateFileModalOpen}
          onClose={() => setIsCreateFileModalOpen(false)}
          onCreateFile={handleCreateFile}
        />
      )}

      <FilePropertiesModal
        isOpen={propertiesModal.isOpen}
        item={propertiesModal.item}
        onClose={() => setPropertiesModal({ isOpen: false, item: null })}
        onToast={addToast}
      />

      {isAdmin && isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-outline/[0.1] bg-surface/95 shadow-2xl  overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline/[0.08] p-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-on-surface">Create New Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName('');
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5">
              <div className="mb-4">
                <label htmlFor="folderName" className="mb-2 block text-xs font-medium text-slate-400">
                  Folder Name
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Coursework, Project Alpha"
                  className="w-full rounded-xl border border-outline/[0.08] bg-surface-variant px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateFolderModalOpen(false);
                    setNewFolderName('');
                  }}
                  className="rounded-xl border border-outline/[0.08] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-1.5 text-xs font-medium text-[color:var(--color-on-primary)] hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-md shadow-teal-500/20"
                >
                  {isCreatingFolder ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Create Folder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-[90rem] flex-1 pb-4"
        style={{ paddingInline: 'var(--gutter)', paddingTop: 'var(--space-6)' }}
        onContextMenu={(e) => handleOpenContextMenu(e, null)}
      >
        {/* Error notification banner */}
        {errorMessage && (
          <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-[color:var(--color-error)] ">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-[color:var(--color-error)]" />
              <span className="flex-1">{errorMessage}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  if (syncStatus === 'error') setSyncStatus('idle');
                }}
                className="min-h-6 px-1 font-semibold text-[color:var(--color-error)] hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex min-h-[var(--control-h)] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
            <h1
              className="max-w-[60%] truncate text-[20px] font-semibold leading-7 text-[color:var(--color-text-primary)]"
            >
              {pageTitle}
            </h1>
            <span className="shrink-0 text-[13px] text-[color:var(--color-text-muted)]">{pageItemCount}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && <div className="relative" ref={addMenuRef}>
              <button
                ref={addButtonRef}
                type="button"
                onClick={() => setIsAddMenuOpen((open) => !open)}
                aria-expanded={isAddMenuOpen}
                aria-controls="create-item-menu"
                aria-haspopup="menu"
                aria-label="Create a new file or folder"
                className="inline-flex h-[var(--control-h)] items-center gap-2 rounded-[var(--control-radius)] border border-[color:var(--color-border-control)] bg-surface-variant px-3 text-[13px] font-medium text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
              >
                <span>New</span>
                <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {isAddMenuOpen && (
                <div
                  ref={addMenuItemsRef}
                  id="create-item-menu"
                  role="menu"
                  aria-label="Create file or folder"
                  onKeyDown={handleNewMenuKeyDown}
                  className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-outline/[0.10] bg-surface p-1 shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsCreateFileModalOpen(true);
                    }}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-on-surface transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  >
                    <FilePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    New File
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsCreateFolderModalOpen(true);
                    }}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-on-surface transition-colors hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  >
                    <FolderPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    New Folder
                  </button>
                </div>
              )}
            </div>}
            {isAdmin && <label className="inline-flex h-[var(--control-h)] cursor-pointer items-center gap-2 rounded-[var(--control-radius)] bg-[color:var(--color-accent)] px-3 text-[13px] font-medium text-[color:var(--color-on-primary)] transition-colors hover:brightness-110 focus-within:ring-2 focus-within:ring-[color:var(--color-accent)]">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              <span>Upload</span>
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="sr-only"
                aria-label="Choose files to upload"
                onChange={(event) => {
                  void handleUploadFiles(Array.from(event.target.files || []));
                  event.target.value = '';
                }}
              />
            </label>}
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <SearchBar
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchScope={searchScope}
            onScopeChange={setSearchScope}
            filterType={filterType}
            onFilterChange={setFilterType}
            sortBy={sortBy}
            sortOrder={sortOrder}
            isDefaultSort={
              sortBy === initialSortPreferences.current.sortBy &&
              sortOrder === initialSortPreferences.current.sortOrder
            }
            onSortChange={(by, order) => {
              setSortPreferences({ sortBy: by, sortOrder: order });
            }}
            isGrid={isGrid}
            onToggleGrid={setIsGrid}
            totalCount={files.length}
            filteredCount={filteredFiles.length}
          />
        </div>

        {/* Content Explorer Container (LAY-001, LAY-002, TST-001) */}
        <div
          style={{ marginTop: 'var(--space-4)' }}
          className={`glass-explorer relative min-h-[400px] rounded-2xl border glass-panel transition-colors ${
            isDragging ? 'border-teal-400 bg-teal-500/[0.08]' : 'border-outline/[0.05] bg-surface/60'
          }`}
          onDragOver={(e) => {
            if (!isAdmin || !isExternalFileDrag(e.dataTransfer)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDragging) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
            setIsDragging(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (!isAdmin) return;
            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length > 0) await handleUploadFiles(droppedFiles);
          }}
        >
          {isAdmin && isDragging && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-canvas/90">
              <div className="flex flex-col items-center gap-3 text-teal-300">
                <div className="border border-teal-500/30 bg-teal-500/10 p-4">
                  <Inbox className="h-10 w-10" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Drop files here to upload to this folder</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-3 sm:p-4">
              <LoadingSkeleton isGrid={isGrid} />
            </div>
          ) : errorMessage && files.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-4 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-[color:var(--color-error)]" />
              <h3 className="mt-4 text-sm font-semibold text-slate-200">Files could not be loaded</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Check your connection, then retry to load this folder.
              </p>
              <button
                type="button"
                onClick={() => fetchFiles(currentFolderId, searchScope)}
                className="mt-4 min-h-9 rounded-md border border-outline/[0.12] bg-surface-variant px-4 text-xs font-semibold text-slate-200 hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
              >
                Retry loading
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              {searchQuery || filterType !== 'all' ? (
                <>
                  <div className="border border-outline/[0.1] bg-surface-variant p-4 text-slate-500">
                    <FileQuestion className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-200">
                    {searchQuery ? 'No matching files found' : 'No files match this type'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    {searchQuery
                      ? `No results for "${searchQuery}" ${
                          searchScope === 'folder' ? 'in this folder' : 'across all vault'
                        }.`
                      : 'Try another file type or clear the current filters.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                    className="mt-4 rounded-xl border border-outline/[0.1] bg-surface-variant px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-variant"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <div className="border border-outline/[0.1] bg-surface-variant p-4 text-slate-500">
                    <Inbox className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-200">
                    This folder is empty
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    {isAdmin
                      ? 'Drag and drop files here, or use the actions above to get started.'
                      : 'There are no files in this folder.'}
                  </p>
                  {isAdmin && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[color:var(--color-border-control)] bg-surface-variant px-3.5 text-sm font-semibold text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Upload files</span>
                    </button>
                  </div>}
                </>
              )}
            </div>
          ) : isGrid ? (
            /* Grid View */
            <div className="p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id || file.driveId}
                    file={file}
                    canEdit={isAdmin}
                    isSelected={selectedFileIds.has(file.driveId)}
                    isCut={
                      clipboard?.action === 'cut' &&
                      clipboard.items.some((i) => i.driveId === file.driveId)
                    }
                    selectedFileIds={selectedFileIds}
                    onToggleSelect={handleToggleSelect}
                    onOpenFolder={handleOpenFolder}
                    onPreviewFile={(f) => setPreviewFile(f)}
                    onContextMenu={handleOpenContextMenu}
                    onDropOnFolder={isAdmin ? handleDropOnFolder : undefined}
                    onUploadToFolder={isAdmin ? (targetFolderId, droppedFiles) => {
                      void handleUploadFiles(droppedFiles, targetFolderId);
                    } : undefined}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Table / List View */
            <div className="overflow-hidden">
              <table className="w-full min-w-full table-fixed divide-y divide-white/[0.04] text-left sm:table-auto">
                <thead>
                  <tr className="glass-table-header h-10 bg-surface-variant text-[12px] font-medium text-[color:var(--color-text-muted)]">
                    <th
                      aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="w-1/2 pl-4 pr-3 sm:w-auto sm:pl-6"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSelectAllInView}
                          aria-label={isAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
                          aria-pressed={isAllSelected}
                          className="flex min-h-6 min-w-6 items-center justify-center text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleColumnSort('name')}
                          className="inline-flex min-h-8 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                        >
                          Name
                          {sortBy === 'name' &&
                            (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      </div>
                    </th>
                    <th
                      aria-sort={sortBy === 'size' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="hidden px-3 sm:table-cell"
                    >
                      <button
                        type="button"
                        onClick={() => handleColumnSort('size')}
                        className="inline-flex min-h-8 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                      >
                        Size
                        {sortBy === 'size' &&
                          (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                    <th
                      aria-sort={sortBy === 'mimeType' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="hidden px-3 md:table-cell"
                    >
                      <button
                        type="button"
                        onClick={() => handleColumnSort('mimeType')}
                        className="inline-flex min-h-8 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                      >
                        Type
                        {sortBy === 'mimeType' &&
                          (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                    <th
                      aria-sort={sortBy === 'lastSyncedAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="hidden px-3 lg:table-cell"
                    >
                      <button
                        type="button"
                        onClick={() => handleColumnSort('lastSyncedAt')}
                        className="inline-flex min-h-8 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                      >
                        Modified
                        {sortBy === 'lastSyncedAt' &&
                          (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                    <th className="w-1/2 pl-3 pr-4 text-right sm:w-auto sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredFiles.map((file) => (
                    <FileRow
                      key={file.id || file.driveId}
                      file={file}
                      canEdit={isAdmin}
                      isSelected={selectedFileIds.has(file.driveId)}
                      isCut={
                        clipboard?.action === 'cut' &&
                        clipboard.items.some((i) => i.driveId === file.driveId)
                      }
                      selectedFileIds={selectedFileIds}
                      onToggleSelect={handleToggleSelect}
                      onOpenFolder={handleOpenFolder}
                      onDownloadFile={handleDownloadFile}
                      onPreviewFile={(f) => setPreviewFile(f)}
                      onRename={isAdmin ? (f) => setRenameModal({ isOpen: true, item: f }) : undefined}
                      onDelete={isAdmin ? (f) => setDeleteModal({ isOpen: true, items: [f] }) : undefined}
                      onCopy={isAdmin ? (f) => handleCopy([f]) : undefined}
                      onCut={isAdmin ? (f) => handleCut([f]) : undefined}
                      onProperties={(f) => setPropertiesModal({ isOpen: true, item: f })}
                      onContextMenu={handleOpenContextMenu}
                      onDropOnFolder={isAdmin ? handleDropOnFolder : undefined}
                      onUploadToFolder={isAdmin ? (targetFolderId, droppedFiles) => {
                        void handleUploadFiles(droppedFiles, targetFolderId);
                      } : undefined}
                      onToast={addToast}
                      parentFolderPath={searchScope === 'vault' ? folderPaths.get(file.driveId) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vault Stats Footer (Issue 5) */}
          {vaultStats && (
            <div
              className="flex h-9 items-center border-t border-outline/[0.04] px-4 text-[12px] text-[color:var(--color-text-muted)]"
              aria-label="Vault totals"
            >
              Vault total: {vaultStats.totalFiles.toLocaleString()} {vaultStats.totalFiles === 1 ? 'file' : 'files'} · {vaultStats.totalFolders.toLocaleString()} {vaultStats.totalFolders === 1 ? 'folder' : 'folders'} · {formatBytes(vaultStats.totalBytes)}
            </div>
          )}
        </div>

        {/* Floating Batch Selection Island */}
        {selectedFileIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-outline/[0.12] bg-surface/95 px-4 py-2 text-xs shadow-2xl  animate-in slide-in-from-bottom-3 ring-1 ring-white/[0.05]">
            <span className="font-semibold text-teal-300 pr-2 border-r border-outline/[0.08]">
              {selectedFileIds.size} selected
            </span>

            {isAdmin && <button
              type="button"
              onClick={() => handleCopy(selectedItems)}
              className="inline-flex min-h-6 items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-surface-variant hover:text-on-surface transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </button>}

            {isAdmin && <button
              type="button"
              onClick={() => handleCut(selectedItems)}
              className="inline-flex min-h-6 items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-surface-variant hover:text-on-surface transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Cut</span>
            </button>}

            {selectedItems.some((i) => !i.isFolder) && (
              <>
                <button
                  type="button"
                  onClick={handleBatchDownload}
                  className="inline-flex min-h-6 items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-surface-variant hover:text-on-surface transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchCopyLinks}
                  className="inline-flex min-h-6 items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-surface-variant hover:text-on-surface transition-colors"
                >
                  <Link className="h-3.5 w-3.5" />
                  <span>Links</span>
                </button>
              </>
            )}

            {isAdmin && <button
              type="button"
              onClick={() => setDeleteModal({ isOpen: true, items: selectedItems })}
              className="inline-flex min-h-6 items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-[color:var(--color-error)] hover:bg-rose-500/15 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>}

            <button
              type="button"
              onClick={() => setSelectedFileIds(new Set())}
              className="flex min-h-6 min-w-6 items-center justify-center rounded-lg text-slate-500 hover:text-on-surface transition-colors ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Floating Clipboard Dock */}
        {isAdmin && clipboard && clipboard.items.length > 0 && selectedFileIds.size === 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-success/30 bg-success-container px-4 py-2 text-xs shadow-2xl animate-in slide-in-from-bottom-3 ring-1 ring-success/20 text-on-success-container">
            <div className="flex items-center gap-2">
              {clipboard.action === 'cut' ? (
                <Scissors className="h-4 w-4 text-teal-400" />
              ) : (
                <Copy className="h-4 w-4 text-teal-400" />
              )}
              <span>
                <b>{clipboard.items.length} item(s)</b> {clipboard.action === 'cut' ? 'ready to move' : 'copied'}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex min-h-6 items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1 font-semibold text-[color:var(--color-on-primary)] shadow-md hover:bg-teal-400 transition-colors"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Paste Here</span>
            </button>

            <button
              type="button"
              onClick={() => setClipboard(null)}
              className="flex min-h-6 min-w-6 items-center justify-center rounded-lg text-teal-400 hover:text-on-surface transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>
      </div>
    </div>
  );
};
