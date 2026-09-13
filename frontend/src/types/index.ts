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
  currentFolder: {
    id: string;
    name: string;
    parents?: string[];
  } | null;
  count: number;
  files: FileItem[];
}
