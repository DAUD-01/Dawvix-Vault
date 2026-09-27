import axios from 'axios';
import { FilesResponse, User, VaultStats, SortBy, SortOrder } from '../types';

export const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export interface GetFilesOptions {
  folderId?: string;
  all?: boolean;
  search?: string;
  sortBy?: SortBy;
  order?: SortOrder;
}

export const driveService = {
  getStats: async (): Promise<{ success: boolean; stats: VaultStats }> => {
    const response = await api.get('/drive/stats');
    return response.data;
  },

  getFiles: async (options?: GetFilesOptions | string): Promise<FilesResponse> => {
    let params: any = {};
    if (typeof options === 'string') {
      params = options ? { folderId: options } : {};
    } else if (options) {
      if (options.folderId) params.folderId = options.folderId;
      if (options.all) params.all = 'true';
      if (options.search) params.search = options.search;
      if (options.sortBy) params.sortBy = options.sortBy;
      if (options.order) params.order = options.order;
    }

    const response = await api.get('/drive/files', { params });
    return response.data;
  },

  syncDrive: async (
    folderId?: string
  ): Promise<{ success: boolean; message: string; syncedCount: number; serviceAccountEmail?: string }> => {
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
};
