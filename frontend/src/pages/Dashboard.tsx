import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Breadcrumbs } from '../components/Breadcrumbs';
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
import { driveService } from '../services/api';
import {
  FileItem,
  BreadcrumbItem,
  VaultStats,
  SortBy,
  SortOrder,
  SearchScope,
  ToastMessage,
  VaultClipboard,
  ContextMenuState,
} from '../types';
import {
  FolderUp,
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
  Sparkles,
  UploadCloud,
  Trash2,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFolder = searchParams.get('folder') || 'root';

  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolder);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Vault Root' },
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(
    'daud-734@dawvix-vault.iam.gserviceaccount.com'
  );
  const [isEmailCopied, setIsEmailCopied] = useState<boolean>(false);

  // Multi-selection state (supports both files and folders)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Clipboard state for real copy/cut/paste
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

  // Drag and drop state for desktop file uploads
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Search, scope, filter, sort & display states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<SearchScope>('folder');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isGrid, setIsGrid] = useState<boolean>(false);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch live stats
  const fetchStats = async () => {
    try {
      const data = await driveService.getStats();
      if (data.success) {
        setVaultStats(data.stats);
        if (data.stats.serviceAccountEmail) {
          setServiceAccountEmail(data.stats.serviceAccountEmail);
        }
      }
    } catch {
      // Ignore background stats load failure
    }
  };

  // Fetch files whenever folder or global search mode changes
  const fetchFiles = async (folderId: string, scope: SearchScope = searchScope) => {
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

      setFiles(data.files || []);
      if (data.serviceAccountEmail) {
        setServiceAccountEmail(data.serviceAccountEmail);
      }

      // If backend returns a resolved rootFolderId and we were on 'root', sync the breadcrumb
      if (folderId === 'root' && data.rootFolderId && data.rootFolderId !== 'root') {
        setCurrentFolderId(data.rootFolderId);
        setBreadcrumbs([{ id: data.rootFolderId, name: 'Vault Root' }]);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Unable to load files. Check database connection or network status.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Sync folder state with URL parameter
  useEffect(() => {
    const urlFolder = searchParams.get('folder') || 'root';
    if (urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
      setSelectedFileIds(new Set());
    }
  }, [searchParams]);

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
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
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

  // Navigate up one folder level
  const handleNavigateUp = () => {
    if (breadcrumbs.length > 1) {
      const parentIndex = breadcrumbs.length - 2;
      handleSelectBreadcrumb(breadcrumbs[parentIndex].id, parentIndex);
    }
  };

  // Handle Sync Drive trigger
  const handleSyncDrive = async (folderId?: string) => {
    setIsSyncing(true);
    setSyncMessage(null);
    setErrorMessage(null);

    try {
      const data = await driveService.syncDrive(folderId);
      const msg = data.message || `Successfully synced items from Google Drive.`;
      setSyncMessage(msg);
      addToast(msg, 'success');
      if (data.serviceAccountEmail) {
        setServiceAccountEmail(data.serviceAccountEmail);
      }
      await fetchFiles(currentFolderId, searchScope);
      await fetchStats();
      setTimeout(() => setSyncMessage(null), 8000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Drive synchronization failed. Please check credentials in backend.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    await handleSyncDrive(currentFolderId === 'root' ? undefined : currentFolderId);
  };

  // =========================================================================
  // FILE SYSTEM OPERATIONS
  // =========================================================================

  // Create folder action
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
      fetchStats();
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (err: any) {
      addToast(`Failed to create folder: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Create new blank or templated file
  const handleCreateFile = async (name: string, content: string) => {
    try {
      const result = await driveService.createFile(
        name,
        content,
        currentFolderId === 'root' ? undefined : currentFolderId
      );
      addToast(result.message || `File "${name}" created successfully!`, 'success');
      fetchFiles(currentFolderId, searchScope);
      fetchStats();
    } catch (err: any) {
      addToast(`Failed to create file: ${err.response?.data?.message || err.message}`, 'error');
      throw err;
    }
  };

  // Rename item
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

  // Copy items to clipboard
  const handleCopy = (items: FileItem[]) => {
    if (items.length === 0) return;
    setClipboard({ action: 'copy', items });
    addToast(`Copied ${items.length} item${items.length === 1 ? '' : 's'} to clipboard.`, 'info');
  };

  // Cut items to clipboard (Move preparation)
  const handleCut = (items: FileItem[]) => {
    if (items.length === 0) return;
    setClipboard({ action: 'cut', items });
    addToast(`Cut ${items.length} item${items.length === 1 ? '' : 's'} (ready to paste).`, 'info');
  };

  // Paste clipboard items into current folder
  const handlePaste = async () => {
    if (!clipboard || clipboard.items.length === 0) return;
    const { action, items } = clipboard;
    const fileIds = items.map((i) => i.driveId);

    try {
      if (action === 'cut') {
        addToast(`Moving ${items.length} item${items.length === 1 ? '' : 's'}...`, 'info');
        const res = await driveService.moveItems(fileIds, currentFolderId);
        addToast(res.message || `Moved ${items.length} item${items.length === 1 ? '' : 's'} successfully!`, 'success');
        setClipboard(null);
      } else {
        addToast(`Pasting ${items.length} item${items.length === 1 ? '' : 's'}...`, 'info');
        const res = await driveService.copyItems(fileIds, currentFolderId);
        addToast(res.message || `Pasted ${items.length} item${items.length === 1 ? '' : 's'} successfully!`, 'success');
      }
      fetchFiles(currentFolderId, searchScope);
      fetchStats();
    } catch (err: any) {
      addToast(`Paste failed: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  // Drop on folder (drag-and-drop moving into a folder)
  const handleDropOnFolder = async (targetFolderId: string, itemIds: string[]) => {
    if (!targetFolderId || itemIds.length === 0) return;
    try {
      addToast(`Moving ${itemIds.length} item${itemIds.length === 1 ? '' : 's'}...`, 'info');
      const res = await driveService.moveItems(itemIds, targetFolderId);
      addToast(res.message || `Moved ${itemIds.length} item${itemIds.length === 1 ? '' : 's'} successfully!`, 'success');
      setSelectedFileIds(new Set());
      fetchFiles(currentFolderId, searchScope);
      fetchStats();
    } catch (err: any) {
      addToast(`Move failed: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  // Confirm delete (single or batch)
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

      // Remove from selected items
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        items.forEach((i) => next.delete(i.driveId));
        return next;
      });

      fetchFiles(currentFolderId, searchScope);
      fetchStats();
    } catch (err: any) {
      addToast(`Delete failed: ${err.response?.data?.message || err.message}`, 'error');
      throw err;
    }
  };

  // File download action
  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      addToast(`Starting download: "${filename}"...`, 'info');
      await driveService.downloadFile(fileId, filename);
      addToast(`Download complete: "${filename}"`, 'success');
    } catch (err: any) {
      addToast(`Download failed: ${err.message || 'Error'}`, 'error');
    }
  };

  // Toggle multi-select
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

  // Select / Deselect all in view
  const handleSelectAllInView = () => {
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.driveId)));
    }
  };

  // Selected items array
  const selectedItems = useMemo(() => {
    return files.filter((f) => selectedFileIds.has(f.driveId));
  }, [files, selectedFileIds]);

  // Batch download selected files
  const handleBatchDownload = async () => {
    const nonFolders = selectedItems.filter((f) => !f.isFolder);
    if (nonFolders.length === 0) return;

    addToast(`Queuing ${nonFolders.length} file(s) for download...`, 'info');
    for (const file of nonFolders) {
      await handleDownloadFile(file.driveId, file.name);
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  // Batch copy stream links
  const handleBatchCopyLinks = () => {
    const nonFolders = selectedItems.filter((f) => !f.isFolder);
    if (nonFolders.length === 0) return;

    const urls = nonFolders
      .map((f) => `${f.name}:\n${window.location.origin}${driveService.getViewUrl(f.driveId)}`)
      .join('\n\n');

    navigator.clipboard.writeText(urls);
    addToast(`Copied direct stream URLs for ${nonFolders.length} file(s)!`, 'success');
  };

  // Copy service account email helper
  const handleCopyEmail = () => {
    if (serviceAccountEmail) {
      navigator.clipboard.writeText(serviceAccountEmail);
      setIsEmailCopied(true);
      addToast('Service account email copied to clipboard!', 'success');
      setTimeout(() => setIsEmailCopied(false), 2500);
    }
  };

  // Context menu opening helper
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
      // 1. Text search match (if local search)
      if (searchScope === 'folder' && searchQuery) {
        const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/);
        const fileName = file.name.toLowerCase();
        const matchesSearch = queryTerms.every((term) => fileName.includes(term));
        if (!matchesSearch) return false;
      }

      // 2. Category filter
      if (filterType === 'all') return true;
      if (filterType === 'folders') return file.isFolder;
      if (filterType === 'documents') {
        return (
          !file.isFolder &&
          (file.mimeType.includes('pdf') ||
            file.mimeType.includes('document') ||
            file.mimeType.includes('word') ||
            file.mimeType.includes('presentation') ||
            file.mimeType.includes('spreadsheet') ||
            file.mimeType.includes('excel') ||
            file.mimeType.includes('text'))
        );
      }
      if (filterType === 'media') {
        return (
          !file.isFolder &&
          (file.mimeType.startsWith('image/') ||
            file.mimeType.startsWith('video/') ||
            file.mimeType.startsWith('audio/'))
        );
      }
      if (filterType === 'archives') {
        return (
          !file.isFolder &&
          (file.mimeType.includes('zip') ||
            file.mimeType.includes('tar') ||
            file.mimeType.includes('rar') ||
            file.mimeType.includes('code') ||
            file.mimeType.includes('json') ||
            /\.(zip|tar|gz|rar|7z|js|ts|py|json|html|css|cpp|c|java)$/i.test(file.name))
        );
      }
      return true;
    });

    // Sort order
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
    filteredFiles.length > 0 && selectedFileIds.size === filteredFiles.length;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Quick slash for search focus
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Close context menu on Escape
      if (e.key === 'Escape') {
        if (contextMenu.visible) {
          setContextMenu((prev) => ({ ...prev, visible: false }));
        } else if (selectedFileIds.size > 0) {
          setSelectedFileIds(new Set());
        }
        return;
      }

      // If typing in input fields, skip file operations
      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Select All: Ctrl+A
      if (isCtrlOrCmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAllInView();
        return;
      }

      // Copy: Ctrl+C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCopy(selectedItems);
        }
        return;
      }

      // Cut: Ctrl+X
      if (isCtrlOrCmd && e.key.toLowerCase() === 'x') {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCut(selectedItems);
        }
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.items.length > 0) {
          e.preventDefault();
          handlePaste();
        }
        return;
      }

      // Rename: F2
      if (e.key === 'F2') {
        if (selectedItems.length === 1) {
          e.preventDefault();
          setRenameModal({ isOpen: true, item: selectedItems[0] });
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete') {
        if (selectedItems.length > 0) {
          e.preventDefault();
          setDeleteModal({ isOpen: true, items: selectedItems });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [contextMenu, selectedFileIds, selectedItems, clipboard, currentFolderId, filteredFiles]);

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white"
      onClick={() => {
        if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
      }}
    >
      {/* Top Navbar */}
      <Navbar
        onSync={() => handleSyncDrive()}
        isSyncing={isSyncing}
        lastSyncedMessage={syncMessage}
        stats={vaultStats}
      />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md animate-slideIn ${
              toast.type === 'success'
                ? 'border-teal-500/40 bg-teal-950/90 text-teal-200'
                : toast.type === 'error'
                ? 'border-rose-500/40 bg-rose-950/90 text-rose-200'
                : 'border-slate-800 bg-slate-900/90 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              {toast.type === 'success' ? (
                <Check className="h-4 w-4 text-teal-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 text-teal-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white"
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
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
          onOpenItem={(item) => handleOpenFolder(item.driveId, item.name)}
          onPreviewItem={(item) => setPreviewFile(item)}
          onDownloadItem={(item) => handleDownloadFile(item.driveId, item.name)}
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

      {/* In-Window File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          filesList={filteredFiles}
          onClose={() => setPreviewFile(null)}
          onDownloadFile={handleDownloadFile}
          onNavigateFile={(nextFile) => setPreviewFile(nextFile)}
        />
      )}

      {/* Rename Modal */}
      <RenameModal
        isOpen={renameModal.isOpen}
        item={renameModal.item}
        onClose={() => setRenameModal({ isOpen: false, item: null })}
        onRename={handleRename}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        items={deleteModal.items}
        onClose={() => setDeleteModal({ isOpen: false, items: [] })}
        onConfirm={handleConfirmDelete}
      />

      {/* Create File Modal */}
      <CreateFileModal
        isOpen={isCreateFileModalOpen}
        onClose={() => setIsCreateFileModalOpen(false)}
        onCreateFile={handleCreateFile}
      />

      {/* File & Folder Properties Modal */}
      <FilePropertiesModal
        isOpen={propertiesModal.isOpen}
        item={propertiesModal.item}
        onClose={() => setPropertiesModal({ isOpen: false, item: null })}
        onToast={addToast}
      />

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-teal-400" />
                <h3 className="text-base font-semibold text-white">Create New Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName('');
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5">
              <div className="mb-4">
                <label htmlFor="folderName" className="mb-2 block text-xs font-medium text-slate-300">
                  Folder Name
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Documents, Archive, Coursework"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-500/20"
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
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        onContextMenu={(e) => handleOpenContextMenu(e, null)}
      >
        {/* Service Account integration helper hint */}
        {serviceAccountEmail && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-teal-500/20 bg-teal-950/30 p-3.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="h-4 w-4 text-teal-400 shrink-0" />
              <span className="truncate">
                Google Drive Connected: Share any folder with{' '}
                <code className="text-teal-300 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-teal-500/30">
                  {serviceAccountEmail}
                </code>{' '}
                as <b>Editor</b> or <b>Viewer</b>!
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-teal-600/20 px-2.5 py-1 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 transition-colors"
            >
              {isEmailCopied ? (
                <>
                  <Check className="h-3 w-3 text-teal-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Email</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs uppercase tracking-wider font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Floating Clipboard Notification / Ready to paste status bar */}
        {clipboard && clipboard.items.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-teal-950/70 p-3 text-xs text-teal-200 shadow-xl backdrop-blur-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              {clipboard.action === 'cut' ? (
                <Scissors className="h-4 w-4 text-teal-400 shrink-0" />
              ) : (
                <Copy className="h-4 w-4 text-teal-400 shrink-0" />
              )}
              <span>
                <b>{clipboard.items.length} item{clipboard.items.length === 1 ? '' : 's'}</b>{' '}
                {clipboard.action === 'cut' ? 'cut' : 'copied'} to clipboard. Navigate to any folder and paste!
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 font-medium text-slate-950 shadow-md hover:bg-teal-400 transition-colors"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Paste Here</span>
              </button>
              <button
                type="button"
                onClick={() => setClipboard(null)}
                className="rounded-lg p-1 text-teal-400 hover:text-white"
                title="Cancel clipboard"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Explorer Header: Breadcrumbs & Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            {breadcrumbs.length > 1 && (
              <button
                type="button"
                onClick={handleNavigateUp}
                title="Go up to parent folder"
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <FolderUp className="h-3.5 w-3.5 text-teal-400" />
                <span>Up</span>
              </button>
            )}
            <Breadcrumbs
              items={breadcrumbs}
              onSelectFolder={handleSelectBreadcrumb}
              onDropOnFolder={handleDropOnFolder}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* New Folder */}
            <button
              type="button"
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/40 hover:border-teal-400 transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5 text-teal-400" />
              <span>New Folder</span>
            </button>

            {/* New File */}
            <button
              type="button"
              onClick={() => setIsCreateFileModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/40 hover:border-teal-400 transition-colors"
            >
              <FilePlus className="h-3.5 w-3.5 text-teal-400" />
              <span>New File</span>
            </button>

            {/* Paste Button if clipboard has items */}
            {clipboard && clipboard.items.length > 0 && (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-teal-400 shadow-md transition-colors"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Paste ({clipboard.items.length})</span>
              </button>
            )}

            {/* Upload File */}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-teal-500 transition-colors">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const uploadFileList = e.target.files;
                  if (uploadFileList && uploadFileList.length > 0) {
                    try {
                      addToast(`Uploading ${uploadFileList.length} file(s)...`, 'info');
                      await driveService.uploadFiles(
                        Array.from(uploadFileList),
                        currentFolderId === 'root' ? undefined : currentFolderId
                      );
                      addToast(`Successfully uploaded ${uploadFileList.length} file(s)!`, 'success');
                      fetchFiles(currentFolderId, searchScope);
                      fetchStats();
                    } catch (err: any) {
                      const msg =
                        err.response?.data?.error ||
                        err.response?.data?.message ||
                        err.message ||
                        'Error';
                      addToast(`Upload failed: ${msg}`, 'error');
                    }
                  }
                }}
              />
            </label>

            {/* Refresh / Sync */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              title="Reconcile with Google Drive and refresh"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors disabled:opacity-50 p-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Search, Scope, Filter & View Controls */}
        <div className="mt-4">
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
            onSortChange={(by, order) => {
              setSortBy(by);
              setSortOrder(order);
            }}
            isGrid={isGrid}
            onToggleGrid={setIsGrid}
            totalCount={files.length}
            filteredCount={filteredFiles.length}
          />
        </div>

        {/* Multi-Selection Batch Action Floating Toolbar */}
        {selectedFileIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/40 bg-teal-950/60 p-3 text-xs text-teal-200 backdrop-blur animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-teal-300">
                {selectedFileIds.size} item{selectedFileIds.size > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(selectedItems)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-900/60 px-2.5 py-1.5 font-medium text-teal-200 hover:bg-teal-800/60 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </button>

              <button
                type="button"
                onClick={() => handleCut(selectedItems)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-900/60 px-2.5 py-1.5 font-medium text-teal-200 hover:bg-teal-800/60 transition-colors"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Cut</span>
              </button>

              {selectedItems.some((i) => !i.isFolder) && (
                <>
                  <button
                    type="button"
                    onClick={handleBatchDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 font-medium text-white shadow hover:bg-teal-500 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchCopyLinks}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-900/60 px-2.5 py-1.5 font-medium text-teal-200 hover:bg-teal-800/60 transition-colors"
                  >
                    <Link className="h-3.5 w-3.5" />
                    <span>Copy URLs</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: true, items: selectedItems })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 font-medium text-white shadow hover:bg-rose-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileIds(new Set())}
                className="rounded-lg p-1.5 text-teal-400 hover:text-white"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Explorer Section */}
        <div
          className={`relative mt-4 rounded-2xl border ${
            isDragging ? 'border-teal-500 bg-teal-900/20' : 'border-slate-800/80 bg-slate-900/40'
          } backdrop-blur-md overflow-hidden shadow-xl transition-colors min-h-[350px]`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDragging) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles && droppedFiles.length > 0) {
              try {
                addToast(`Uploading ${droppedFiles.length} file(s)...`, 'info');
                await driveService.uploadFiles(
                  Array.from(droppedFiles),
                  currentFolderId === 'root' ? undefined : currentFolderId
                );
                addToast(`Successfully uploaded ${droppedFiles.length} file(s)!`, 'success');
                fetchFiles(currentFolderId, searchScope);
                fetchStats();
              } catch (err: any) {
                const msg =
                  err.response?.data?.error ||
                  err.response?.data?.message ||
                  err.message ||
                  'Error';
                addToast(`Upload failed: ${msg}`, 'error');
              }
            }
          }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-teal-400">
                <Inbox className="h-12 w-12 animate-bounce" />
                <span className="text-lg font-semibold">Drop files here to upload to this folder</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton isGrid={isGrid} />
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              {searchQuery ? (
                <>
                  <div className="rounded-full bg-slate-800/60 p-3.5 text-slate-500">
                    <FileQuestion className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-200">
                    No matching files found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm">
                    No files or folders matched &quot;{searchQuery}&quot;{' '}
                    {searchScope === 'folder' ? 'in this folder' : 'in the vault'}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                    className="mt-4 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Clear Filter
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-slate-800/60 p-3.5 text-slate-500">
                    <Inbox className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-200">
                    This folder is empty
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm">
                    Right-click anywhere or use the buttons above to create folders, files, or upload documents!
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition-all"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>New Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateFileModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-950/40 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/40 transition-all"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                      <span>New File</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : isGrid ? (
            /* Grid View */
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id || file.driveId}
                    file={file}
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
                    onRename={(f) => setRenameModal({ isOpen: true, item: f })}
                    onDelete={(f) => setDeleteModal({ isOpen: true, items: [f] })}
                    onCopy={(f) => handleCopy([f])}
                    onCut={(f) => handleCut([f])}
                    onProperties={(f) => setPropertiesModal({ isOpen: true, item: f })}
                    onContextMenu={handleOpenContextMenu}
                    onDropOnFolder={handleDropOnFolder}
                    onToast={addToast}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Table / List View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/60 text-left">
                <thead>
                  <tr className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 pl-4 pr-3 sm:pl-6 font-semibold flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSelectAllInView}
                        title={isAllSelected ? 'Deselect All' : 'Select All'}
                        className="text-slate-400 hover:text-teal-400"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-4 w-4 text-teal-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <span>Name</span>
                    </th>
                    <th className="hidden px-3 py-3.5 font-semibold sm:table-cell">Size</th>
                    <th className="hidden px-3 py-3.5 font-semibold md:table-cell">Type</th>
                    <th className="hidden px-3 py-3.5 font-semibold lg:table-cell">Last Synced</th>
                    <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredFiles.map((file) => (
                    <FileRow
                      key={file.id || file.driveId}
                      file={file}
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
                      onRename={(f) => setRenameModal({ isOpen: true, item: f })}
                      onDelete={(f) => setDeleteModal({ isOpen: true, items: [f] })}
                      onCopy={(f) => handleCopy([f])}
                      onCut={(f) => handleCut([f])}
                      onProperties={(f) => setPropertiesModal({ isOpen: true, item: f })}
                      onContextMenu={handleOpenContextMenu}
                      onDropOnFolder={handleDropOnFolder}
                      onToast={addToast}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
