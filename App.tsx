
import * as React from 'react';
import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import { AuthState } from './types';
import { GAS_WEB_APP_URL } from './constants';
import { UIProvider } from './contexts/UIContext';

const AppContent: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    email: null,
  });
  const [isConfigured, setIsConfigured] = useState(true);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if this is a Client Share Link
    const queryParams = new URLSearchParams(window.location.search);
    const shareParam = queryParams.get('share');
    if (shareParam) {
      setShareId(shareParam);
      return; // Stop here, render Client View
    }

    // 2. Otherwise, check for Admin Session
    const storedToken = sessionStorage.getItem('drive_share_token');
    const storedEmail = sessionStorage.getItem('drive_share_email');
    if (storedToken && storedEmail) {
      setAuthState({ isAuthenticated: true, token: storedToken, email: storedEmail });
    }

    if (GAS_WEB_APP_URL.includes("PLACEHOLDER")) {
      setIsConfigured(false);
    }
  }, []);

  const handleLoginSuccess = (token: string, email: string) => {
    sessionStorage.setItem('drive_share_token', token);
    sessionStorage.setItem('drive_share_email', email);
    setAuthState({ isAuthenticated: true, token, email });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('drive_share_token');
    sessionStorage.removeItem('drive_share_email');
    setAuthState({ isAuthenticated: false, token: null, email: null });
  };

  // --- RENDER LOGIC ---

  // 1. Setup Check
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-xl p-8 border border-red-500/50 bg-red-900/20 rounded-2xl">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Setup Required</h1>
          <p className="text-slate-300 mb-4">
            You need to deploy the Google Apps Script backend and update the URL in <code>src/constants.ts</code>.
          </p>
        </div>
      </div>
    );
  }

  // 2. Client View (Public Link)
  if (shareId) {
    return <ClientDashboard shareId={shareId} />;
  }

  // 3. Admin View (Authenticated)
  return (
    <>
      {authState.isAuthenticated && authState.token && authState.email ? (
        <AdminDashboard 
          token={authState.token} 
          onLogout={handleLogout} 
        />
      ) : (
        <Auth onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
};

export default App;
