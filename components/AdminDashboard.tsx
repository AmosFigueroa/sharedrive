import * as React from 'react';
import { useState, useEffect } from 'react';
import { ShareLink, FolderContent, DriveFile } from '../types';
import { createShare, getShares, deleteShare, getFolderContents } from '../services/apiService';
import { 
  Plus, Trash2, Copy, ExternalLink, FolderLock, LogOut, Loader2, RefreshCw, 
  Search, Folder, ChevronRight, X, CheckCircle2, ArrowLeft 
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

  // Picker State
  const [showPicker, setShowPicker] = useState(false);
  const [pickerCurrentId, setPickerCurrentId] = useState('root');
  const [pickerData, setPickerData] = useState<FolderContent | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);

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

  // --- Picker Logic ---
  useEffect(() => {
    if (showPicker) {
      loadPickerFolder(pickerCurrentId);
    }
  }, [showPicker, pickerCurrentId]);

  const loadPickerFolder = async (id: string) => {
    setPickerLoading(true);
    const res = await getFolderContents(id, token);
    if (res.success && res.data) {
      setPickerData(res.data);
    }
    setPickerLoading(false);
  };

  const handlePickerSelect = (folderId: string) => {
    setNewFolderId(folderId);
    setShowPicker(false);
    setPickerCurrentId('root'); // Reset for next time
  };

  // --- Main Logic ---

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

  const handleFolderIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Robust Logic to extract ID if a full URL is pasted
    let extractedId = input;
    
    // Match common Drive URL patterns
    // 1. folders/ID
    // 2. id=ID
    // 3. open?id=ID
    const match = input.match(/(?:folders\/|id=)([\w-]+)/);
    
    if (match && match[1]) {
      extractedId = match[1];
    }
    
    setNewFolderId(extractedId);
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
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <input 
                type="text" 
                placeholder="Client Name / Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white"
              />
            </div>
            
            <div className="md:col-span-5 relative">
              <input 
                type="text" 
                placeholder="Paste ID or Browse..."
                value={newFolderId}
                onChange={handleFolderIdChange}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white font-mono text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPicker(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                title="Browse Drive"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-3">
              <button 
                type="submit" 
                disabled={creating || !newLabel || !newFolderId}
                className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl px-4 py-3 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="animate-spin w-5 h-5" /> : "Generate Link"}
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-500 mt-3 ml-1">
            * Paste a Google Drive Link, ID, or use the search icon to browse your folders.
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

      {/* FOLDER PICKER MODAL */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-400" /> Browse Drive
              </h3>
              <button 
                onClick={() => setShowPicker(false)}
                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breadcrumbs */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
              {pickerData?.path.map((p, idx) => (
                <div key={p.id} className="flex items-center">
                  {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
                  <button 
                    onClick={() => setPickerCurrentId(p.id)}
                    className={`hover:text-blue-400 transition-colors ${idx === pickerData.path.length - 1 ? 'text-white font-bold' : 'text-slate-400'}`}
                  >
                    {p.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-900">
               {pickerLoading ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                   <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                   <p className="text-sm">Loading folders...</p>
                 </div>
               ) : (
                 <div className="space-y-1">
                   {/* Back Button if not root */}
                   {pickerData?.path.length && pickerData.path.length > 1 && (
                     <button 
                       onClick={() => {
                          const parent = pickerData.path[pickerData.path.length - 2];
                          setPickerCurrentId(parent.id);
                       }}
                       className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 text-left transition-colors group"
                     >
                       <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-lg group-hover:bg-slate-700">
                         <ArrowLeft className="w-5 h-5 text-slate-400" />
                       </div>
                       <span className="text-slate-400 group-hover:text-slate-200">.. (Back)</span>
                     </button>
                   )}

                   {/* Folders */}
                   {pickerData?.files.filter(f => f.isFolder).map(folder => (
                     <div key={folder.id} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 text-left transition-colors group">
                       <button 
                         onClick={() => setPickerCurrentId(folder.id)}
                         className="flex-1 flex items-center gap-3"
                       >
                         <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                           <Folder className="w-5 h-5" />
                         </div>
                         <div className="min-w-0">
                           <p className="font-medium text-slate-200 truncate">{folder.name}</p>
                           <p className="text-xs text-slate-500">Folder</p>
                         </div>
                       </button>

                       <button 
                         onClick={() => handlePickerSelect(folder.id)}
                         className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 hover:border-transparent"
                       >
                         Select <CheckCircle2 className="w-3 h-3" />
                       </button>
                     </div>
                   ))}

                   {/* Current Folder Selection Option */}
                   <div className="mt-4 pt-4 border-t border-slate-800 px-2">
                      <button
                        onClick={() => handlePickerSelect(pickerCurrentId)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        Select Current Folder ({pickerData?.name})
                      </button>
                   </div>
                 </div>
               )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;