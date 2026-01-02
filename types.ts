
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
  // Added for persistent branding
  shareLabel?: string;
  shareLogo?: string;
}

export interface ShareLink {
  id: string;
  folderId: string;
  label: string;
  logoUrl?: string; // New field
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

// --- UI CONTEXT TYPES ---
export type ToastType = 'success' | 'error' | 'info';
export type Theme = 'dark' | 'light';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  startDownload: () => void;
  theme: Theme;
  toggleTheme: () => void;
}
