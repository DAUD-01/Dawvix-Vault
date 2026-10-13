import axios from 'axios';
import { FilesResponse, User, VaultStats, SortBy, SortOrder } from '../types';

export const API_BASE_URL = '/api';

const pendingGetRequests = new Map<string, Promise<unknown>>();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getData = async <T>(
  url: string,
  params?: Record<string, string>
): Promise<T> => {
  const config = { params };
  const key = `${api.getUri({ url, ...config })}:${localStorage.getItem('token') || ''}`;
  let request = pendingGetRequests.get(key) as Promise<T> | undefined;

  if (!request) {
    request = api.get<T>(url, config).then((response) => response.data);
    pendingGetRequests.set(key, request);
  }

  try {
    return await request;
  } finally {
    if (pendingGetRequests.get(key) === request) {
      pendingGetRequests.delete(key);
    }
  }
};

// Intercept requests to attach Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 responses to auto-clear invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionLastActivity');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  getMe: (): Promise<{ user: User }> => getData('/auth/me'),

  recordActivity: async (): Promise<void> => {
    await api.post('/auth/activity');
  },
};

export interface GetFilesOptions {
  folderId?: string;
  all?: boolean;
  search?: string;
  sortBy?: SortBy;
  order?: SortOrder;
  refresh?: boolean;
}

export const driveService = {
  getStats: (): Promise<{ success: boolean; stats: VaultStats }> =>
    getData('/drive/stats'),

  getFiles: async (options?: GetFilesOptions | string): Promise<FilesResponse> => {
    const params: Record<string, string> = {};
    if (typeof options === 'string') {
      if (options) params.folderId = options;
    } else if (options) {
      if (options.folderId) params.folderId = options.folderId;
      if (options.all) params.all = 'true';
      if (options.search) params.search = options.search;
      if (options.sortBy) params.sortBy = options.sortBy;
      if (options.order) params.order = options.order;
      if (options.refresh) params.refresh = 'true';
    }

    return getData('/drive/files', params);
  },

  syncDrive: async (
    folderId?: string
  ): Promise<{ success: boolean; message: string; syncedCount: number; deletedCount?: number; serviceAccountEmail?: string }> => {
    const response = await api.post('/drive/sync', { folderId });
    return response.data;
  },

  getDownloadUrl: (fileId: string): string => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/drive/download/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  getViewUrl: (fileId: string): string => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/drive/view/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  getTextContent: async (fileId: string): Promise<{ name: string; mimeType: string; content: string }> => {
    const response = await api.get(`/drive/content/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: string, filename: string): Promise<void> => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.get(`/drive/download/${fileId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const directUrl = `${API_BASE_URL}/drive/download/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(directUrl, '_blank');
    }
  },

  createFolder: async (name: string, parentId?: string): Promise<any> => {
    const response = await api.post('/drive/folder', { name, parentId });
    return response.data;
  },

  uploadFiles: async (files: File[], parentId?: string): Promise<any> => {
    const formData = new FormData();
    if (parentId) {
      formData.append('parentId', parentId);
    }
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = localStorage.getItem('token');
    
    // We use native fetch here to guarantee that the browser correctly sets
    // the Content-Type: multipart/form-data with the proper boundary, 
    // avoiding any Axios default header interference.
    const response = await fetch(`${API_BASE_URL}/drive/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      throw { response: { data: errorData } };
    }

    return await response.json();
  },

  deleteFile: async (fileId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/drive/file/${fileId}`);
    return response.data;
  },

  batchDeleteFiles: async (fileIds: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const response = await api.post('/drive/batch-delete', { fileIds });
    return response.data;
  },

  renameItem: async (fileId: string, newName: string): Promise<{ success: boolean; message: string; file: any }> => {
    const response = await api.post('/drive/rename', { fileId, newName });
    return response.data;
  },

  moveItems: async (fileIds: string[], targetFolderId: string): Promise<{ success: boolean; message: string; movedCount: number }> => {
    const response = await api.post('/drive/move', { fileIds, targetFolderId });
    return response.data;
  },

  copyItems: async (fileIds: string[], targetFolderId: string): Promise<{ success: boolean; message: string; copiedCount: number }> => {
    const response = await api.post('/drive/copy', { fileIds, targetFolderId });
    return response.data;
  },

  createFile: async (name: string, content: string = '', parentId?: string): Promise<{ success: boolean; message: string; file: any }> => {
    const response = await api.post('/drive/create-file', { name, content, parentId });
    return response.data;
  },
};
