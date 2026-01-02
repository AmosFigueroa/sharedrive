
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  downloadUrl: string;
  size: number;
  lastUpdated: string;
  thumbnailUrl?: string;
  isFolder: boolean;
}

export interface FolderContent {
  id: string;
  name: string;
  files: DriveFile[];
  path: { id: string; name: string }[];
}

export interface ShareLink {
  id: string;
  folderId: string;
  label: string;
  created: string;
  clicks: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  token: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Enum for view types
export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST'
}
