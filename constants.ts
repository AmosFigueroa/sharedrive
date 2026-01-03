
// REPLACE THIS URL WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
export const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz8DX35NIleMuMPAOPWYQn5Q8YHYrv45_-xwafYStLpZ2v3lX0_MWJyjQFimuHWFmw/exec";

// Initial Root Folder ID (Can be overridden by URL param ?folderId=...)
export const DEFAULT_ROOT_FOLDER_ID = "root"; // Or specific ID: "1xSj..."

export const MOCK_DATA = false; // Set to true to test UI without backend

// Using reliable GitHub raw content for 3D illustration to prevent broken links
export const EMPTY_STATE_IMAGE = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Open%20File%20Folder.png";

export const FILE_ICONS: Record<string, string> = {
  'application/pdf': 'text-red-400',
  'application/vnd.google-apps.folder': 'text-blue-400',
  'image/jpeg': 'text-purple-400',
  'image/png': 'text-purple-400',
  'video/mp4': 'text-pink-400',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text-blue-500',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'text-green-500',
};