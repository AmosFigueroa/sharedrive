
import { ApiResponse, FolderContent, ShareLink } from '../types';
import { GAS_WEB_APP_URL, MOCK_DATA } from '../constants';

const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiCall = async (payload: any) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse:", text);
      return { success: false, error: "Invalid response" };
    }
  } catch (error) {
    return { success: false, error: "Connection failed" };
  }
};

export const sendOtp = async (email: string): Promise<ApiResponse<string>> => {
  if (MOCK_DATA) return { success: true, data: "OTP Sent" };
  return apiCall({ action: 'sendOtp', email });
};

export const verifyOtp = async (email: string, otp: string): Promise<ApiResponse<{ token: string }>> => {
  if (MOCK_DATA) return { success: true, data: { token: "mock_token" } };
  return apiCall({ action: 'verifyOtp', email, otp });
};

export const getFolderContents = async (folderId: string, token: string | null, shareId?: string): Promise<ApiResponse<FolderContent>> => {
  if (MOCK_DATA) {
     return { success: false, error: "Mock data not fully implemented for shares" };
  }
  return apiCall({ action: 'getFiles', folderId, token, shareId });
};

// --- Share Management APIs ---

export const getShares = async (token: string): Promise<ApiResponse<ShareLink[]>> => {
  if (MOCK_DATA) return { success: true, data: [] };
  return apiCall({ action: 'getShares', token });
};

export const createShare = async (token: string, folderId: string, label: string, customPath?: string, logoUrl?: string): Promise<ApiResponse<ShareLink>> => {
  if (MOCK_DATA) return { success: true, data: { id: customPath || '123', folderId, label, created: new Date().toISOString(), clicks: 0 } };
  return apiCall({ action: 'createShare', token, folderId, label, customPath, logoUrl });
};

export const deleteShare = async (token: string, shareId: string): Promise<ApiResponse<string>> => {
  if (MOCK_DATA) return { success: true, data: "Deleted" };
  return apiCall({ action: 'deleteShare', token, shareId });
};
