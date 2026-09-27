export interface FileItem {
  id: string;
  driveId: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  isFolder: boolean;
  lastSyncedAt: string;
}

export interface User {
  id: string;
  username: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FilesResponse {
  success: boolean;
  rootFolderId: string;
  currentFolderId: string;
  isGlobalSearch?: boolean;
  currentFolder: {
    id: string;
    name: string;
    parents?: string[];
  } | null;
  serviceAccountEmail?: string | null;
  count: number;
  files: FileItem[];
}

export interface VaultStats {
  totalFiles: number;
  totalFolders: number;
  totalBytes: number;
  lastSyncedAt: string | null;
  serviceAccountEmail: string | null;
  gdriveConfigured?: boolean;
}

export type SortBy = 'name' | 'size' | 'lastSyncedAt' | 'mimeType';
export type SortOrder = 'asc' | 'desc';
export type SearchScope = 'folder' | 'vault';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
