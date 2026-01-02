import * as React from 'react';
import { useState, useEffect } from 'react';
import { ShareLink } from '../types';
import { createShare, getShares, deleteShare } from '../services/apiService';
import { 
  Plus, Trash2, Copy, ExternalLink, Link as LinkIcon, 
  FolderLock, LogOut, Loader2, RefreshCw 
} from 'lucide-react';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form State
  const [newLabel, setNewLabel] = useState('');
  const [newFolderId, setNewFolderId] = useState('');

  const fetchShares = async () => {
    setLoading(true);
    const res = await getShares(token);
    if (res.success && res.data) {
      setShares(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShares();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newFolderId) return;

    setCreating(true);
    const res = await createShare(token, newFolderId, newLabel);
    setCreating(false);

    if (res.success) {
      setNewLabel('');
      setNewFolderId('');
      fetchShares();
    } else {
      alert(res.error || "Failed to create share. Check Folder ID.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link? The client will lose access.")) return;
    const res = await deleteShare(token, id);
    if (res.success) {
      setShares(prev => prev.filter(s => s.id !== id));
    }
  };

  const copyLink = (shareId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
               <FolderLock className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">Share Manager</h1>
               <p className="text-sm text-slate-400">Generate secure links for your clients</p>
             </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Create New Share Card */}
        <div className="glass rounded-2xl p-6 mb-8 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" /> Create New Share
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Client Name / Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
            />
            <input 
              type="text" 
              placeholder="Google Drive Folder ID"
              value={newFolderId}
              onChange={(e) => setNewFolderId(e.target.value)}
              className="bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white font-mono text-sm"
            />
            <button 
              type="submit" 
              disabled={creating || !newLabel || !newFolderId}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl px-4 py-3 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="animate-spin w-5 h-5" /> : "Generate Link"}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-3 ml-1">
            * Retrieve the Folder ID from the URL of your Google Drive folder (e.g., drive.google.com/drive/folders/<b>1AbC...</b>)
          </p>
        </div>

        {/* History List */}
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-bold text-white">Active Links</h3>
           <button onClick={fetchShares} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
             <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>

        {loading && shares.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Loading shares...</div>
        ) : shares.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
            <p className="text-slate-400">No active shared links found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shares.map(share => (
              <div key={share.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-slate-800/60 transition-colors">
                
                <div className="flex-1">
                   <h4 className="font-bold text-lg text-white mb-1">{share.label}</h4>
                   <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                     <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">Folder: {share.folderId}</span>
                     <span>Created: {new Date(share.created).toLocaleDateString()}</span>
                   </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                   <button 
                     onClick={() => copyLink(share.id)}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-sm font-medium text-slate-300"
                   >
                     <Copy className="w-4 h-4" /> Copy Link
                   </button>
                   
                   <a 
                     href={`?share=${share.id}`}
                     target="_blank"
                     className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                     title="Test Link"
                   >
                     <ExternalLink className="w-5 h-5" />
                   </a>

                   <div className="w-px h-6 bg-slate-700 mx-1"></div>

                   <button 
                     onClick={() => handleDelete(share.id)}
                     className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                     title="Delete"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;