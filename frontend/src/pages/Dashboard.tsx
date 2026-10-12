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
  const [showEmailBanner, setShowEmailBanner] = useState<boolean>(true);

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
      fetchStats();
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
      fetchStats();
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
      fetchStats();
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
      fetchStats();
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
      fetchStats();
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
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.driveId)));
    }
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

  const handleCopyEmail = () => {
    if (serviceAccountEmail) {
      navigator.clipboard.writeText(serviceAccountEmail);
      setIsEmailCopied(true);
      addToast('Service account email copied to clipboard!', 'success');
      setTimeout(() => setIsEmailCopied(false), 2500);
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
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCopy(selectedItems);
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'x') {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCut(selectedItems);
        }
        return;
      }

      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.items.length > 0) {
          e.preventDefault();
          handlePaste();
        }
        return;
      }

      if (e.key === 'F2') {
        if (selectedItems.length === 1) {
          e.preventDefault();
          setRenameModal({ isOpen: true, item: selectedItems[0] });
        }
        return;
      }

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
      className="vault-bg-mesh min-h-screen bg-[#06090e] text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white"
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'border-teal-500/30 bg-[#071916]/90 text-teal-200'
                : toast.type === 'error'
                ? 'border-rose-500/30 bg-[#1c0b0f]/90 text-rose-200'
                : 'border-white/[0.08] bg-[#0c101a]/90 text-slate-200'
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
              className="p-1 text-slate-400 hover:text-white transition-colors"
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

      <RenameModal
        isOpen={renameModal.isOpen}
        item={renameModal.item}
        onClose={() => setRenameModal({ isOpen: false, item: null })}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        items={deleteModal.items}
        onClose={() => setDeleteModal({ isOpen: false, items: [] })}
        onConfirm={handleConfirmDelete}
      />

      <CreateFileModal
        isOpen={isCreateFileModalOpen}
        onClose={() => setIsCreateFileModalOpen(false)}
        onCreateFile={handleCreateFile}
      />

      <FilePropertiesModal
        isOpen={propertiesModal.isOpen}
        item={propertiesModal.item}
        onClose={() => setPropertiesModal({ isOpen: false, item: null })}
        onToast={addToast}
      />

      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0c101a]/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Create New Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName('');
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
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
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500/80 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
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
                  className="rounded-xl border border-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-md shadow-teal-500/20"
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
        {serviceAccountEmail && showEmailBanner && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-teal-500/20 bg-teal-500/[0.04] p-3 text-xs text-slate-300 backdrop-blur-sm animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <Info className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">
                Sync with Google Drive: Share folders with{' '}
                <code className="text-teal-300 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                  {serviceAccountEmail}
                </code>{' '}
                as <b>Editor</b> or <b>Viewer</b>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 rounded-xl bg-teal-500/15 px-2.5 py-1 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition-colors"
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
              <button
                type="button"
                onClick={() => setShowEmailBanner(false)}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                title="Dismiss hint"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 uppercase tracking-wider font-semibold text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Explorer Header: Path & Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2">
            {breadcrumbs.length > 1 && (
              <button
                type="button"
                onClick={handleNavigateUp}
                title="Go up one folder level"
                className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
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
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:border-teal-500/40 hover:text-teal-300 transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5 text-teal-400" />
              <span>New Folder</span>
            </button>

            {/* New File */}
            <button
              type="button"
              onClick={() => setIsCreateFileModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:border-teal-500/40 hover:text-teal-300 transition-colors"
            >
              <FilePlus className="h-3.5 w-3.5 text-teal-400" />
              <span>New File</span>
            </button>

            {/* Upload File */}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all">
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

            {/* Refresh / Sync icon */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              title="Refresh and reconcile"
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 text-xs text-slate-400 hover:text-teal-400 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search, Scope, Filter & View Controls */}
        <div className="mt-3.5">
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

        {/* Content Explorer Container */}
        <div
          className={`relative mt-4 rounded-3xl border ${
            isDragging ? 'border-teal-400 bg-teal-500/[0.08]' : 'border-white/[0.07] bg-[#0c101a]/60'
          } backdrop-blur-xl overflow-hidden shadow-2xl transition-all min-h-[400px]`}
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
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#06090e]/85 backdrop-blur-md">
              <div className="flex flex-col items-center gap-3 text-teal-400 animate-pulse">
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                  <Inbox className="h-10 w-10" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Drop files here to upload to this folder</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton isGrid={isGrid} />
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              {searchQuery ? (
                <>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-slate-500 shadow-inner">
                    <FileQuestion className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-200">
                    No matching files found
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    No results for &quot;{searchQuery}&quot;{' '}
                    {searchScope === 'folder' ? 'in this folder' : 'across all vault'}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                    className="mt-4 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08]"
                  >
                    Clear Filter
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-slate-500 shadow-inner">
                    <Inbox className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-200">
                    This folder is empty
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Drag and drop files here, right-click, or use the actions below to get started.
                  </p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-teal-500/40 hover:text-teal-300 transition-all"
                    >
                      <FolderPlus className="h-3.5 w-3.5 text-teal-400" />
                      <span>New Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateFileModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-teal-500/40 hover:text-teal-300 transition-all"
                    >
                      <FilePlus className="h-3.5 w-3.5 text-teal-400" />
                      <span>New File</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : isGrid ? (
            /* Grid View */
            <div className="p-5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
              <table className="min-w-full divide-y divide-white/[0.04] text-left">
                <thead>
                  <tr className="bg-white/[0.015] text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 pl-4 pr-3 sm:pl-6 font-medium flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSelectAllInView}
                        title={isAllSelected ? 'Deselect All' : 'Select All'}
                        className="text-slate-500 hover:text-teal-400 transition-colors"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-teal-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <span>Name</span>
                    </th>
                    <th className="hidden px-3 py-3 font-medium sm:table-cell">Size</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">Type</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">Modified</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
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

        {/* Floating Batch Selection Island */}
        {selectedFileIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#0c101a]/95 px-4 py-2 text-xs shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-3 ring-1 ring-white/[0.05]">
            <span className="font-semibold text-teal-300 pr-2 border-r border-white/[0.08]">
              {selectedFileIds.size} selected
            </span>

            <button
              type="button"
              onClick={() => handleCopy(selectedItems)}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={() => handleCut(selectedItems)}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Cut</span>
            </button>

            {selectedItems.some((i) => !i.isFolder) && (
              <>
                <button
                  type="button"
                  onClick={handleBatchDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchCopyLinks}
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Link className="h-3.5 w-3.5" />
                  <span>Links</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setDeleteModal({ isOpen: true, items: selectedItems })}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFileIds(new Set())}
              className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors ml-1"
              title="Clear selection (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Floating Clipboard Dock */}
        {clipboard && clipboard.items.length > 0 && selectedFileIds.size === 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-teal-500/30 bg-[#071916]/95 px-4 py-2 text-xs shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-3 ring-1 ring-teal-500/20 text-teal-200">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1 font-semibold text-slate-950 shadow-md hover:bg-teal-400 transition-colors"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Paste Here</span>
            </button>

            <button
              type="button"
              onClick={() => setClipboard(null)}
              className="p-1 rounded-lg text-teal-400 hover:text-white transition-colors"
              title="Cancel clipboard"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
