import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SearchBar } from '../components/SearchBar';
import { FileRow } from '../components/FileRow';
import { FileCard } from '../components/FileCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { driveService } from '../services/api';
import { FileItem, BreadcrumbItem } from '../types';
import {
  FolderUp,
  Inbox,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  Info,
  Copy,
  Check,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Vault Root' },
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(
    'daud-734@dawvix-vault.iam.gserviceaccount.com'
  );
  const [isEmailCopied, setIsEmailCopied] = useState<boolean>(false);

  // In-window file preview state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Search, filter & display states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isGrid, setIsGrid] = useState<boolean>(false);

  // Fetch files whenever currentFolderId changes
  const fetchFiles = async (folderId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await driveService.getFiles(folderId);
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

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId]);

  // Handle Sync Drive trigger
  const handleSyncDrive = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setErrorMessage(null);

    try {
      const data = await driveService.syncDrive();
      setSyncMessage(data.message || `Successfully synced items from Google Drive.`);
      if (data.serviceAccountEmail) {
        setServiceAccountEmail(data.serviceAccountEmail);
      }
      // Refresh current folder view
      await fetchFiles(currentFolderId);
      // Auto-hide success message after 8 seconds
      setTimeout(() => setSyncMessage(null), 8000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Drive synchronization failed. Please check credentials in backend.';
      setErrorMessage(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Folder navigation
  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
  };

  // Breadcrumb click navigation
  const handleSelectBreadcrumb = (folderId: string, index: number) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  // Navigate up one folder level
  const handleNavigateUp = () => {
    if (breadcrumbs.length > 1) {
      const parentIndex = breadcrumbs.length - 2;
      handleSelectBreadcrumb(breadcrumbs[parentIndex].id, parentIndex);
    }
  };

  // File download action
  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      await driveService.downloadFile(fileId, filename);
    } catch (err: any) {
      alert(`Download error: ${err.message || 'Failed to download file'}`);
    }
  };

  // Copy service account email helper
  const handleCopyEmail = () => {
    if (serviceAccountEmail) {
      navigator.clipboard.writeText(serviceAccountEmail);
      setIsEmailCopied(true);
      setTimeout(() => setIsEmailCopied(false), 2500);
    }
  };

  // Client-side filtering & search
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // 1. Text search match
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

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
            file.mimeType.includes('excel'))
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
            file.mimeType.includes('json'))
        );
      }
      return true;
    });
  }, [files, searchQuery, filterType]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onSync={handleSyncDrive}
        isSyncing={isSyncing}
        lastSyncedMessage={syncMessage}
      />

      {/* In-Window File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownloadFile={handleDownloadFile}
        />
      )}

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
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
                as <b>Viewer</b>, then click <b>Sync Drive</b>!
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

        {/* Explorer Header: Breadcrumbs & Up Button */}
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
            />
          </div>

          <button
            type="button"
            onClick={() => fetchFiles(currentFolderId)}
            title="Refresh current folder"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search, Filter & View Controls */}
        <div className="mt-4">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterType={filterType}
            onFilterChange={setFilterType}
            isGrid={isGrid}
            onToggleGrid={setIsGrid}
            totalCount={files.length}
            filteredCount={filteredFiles.length}
          />
        </div>

        {/* Content Explorer Section */}
        <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton isGrid={isGrid} />
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              {searchQuery ? (
                <>
                  <div className="rounded-full bg-slate-800/60 p-3.5 text-slate-500">
                    <FileQuestion className="h-8 w-8 text-teal-400/80" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-200">
                    No matching files found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm">
                    No files or folders matched &quot;{searchQuery}&quot;. Try clearing your search or changing filters.
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
                    This folder is currently empty
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-sm">
                    Share any Google Drive folder with{' '}
                    <code className="text-teal-400 font-mono text-xs">{serviceAccountEmail}</code>{' '}
                    and click Sync Drive below!
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncDrive}
                    disabled={isSyncing}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-teal-500 transition-all disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
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
                    onOpenFolder={handleOpenFolder}
                    onDownloadFile={handleDownloadFile}
                    onPreviewFile={(f) => setPreviewFile(f)}
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
                    <th className="py-3.5 pl-4 pr-3 sm:pl-6 font-semibold">Name</th>
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
                      onOpenFolder={handleOpenFolder}
                      onDownloadFile={handleDownloadFile}
                      onPreviewFile={(f) => setPreviewFile(f)}
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
