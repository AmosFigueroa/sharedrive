import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ShareLink, FolderContent, DriveFile } from '../types';
import { createShare, updateShare, getShares, deleteShare, getFolderContents } from '../services/apiService';
import { useUI } from '../contexts/UIContext';
import { 
  Plus, Trash2, Copy, ExternalLink, FolderLock, LogOut, Loader2, RefreshCw, 
  Search, Folder, ChevronRight, X, CheckCircle2, ArrowLeft, CheckSquare, Square, Check, Link as LinkIcon, Image as ImageIcon,
  Sun, Moon, Pencil, Save
} from 'lucide-react';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const { showToast, theme, toggleTheme } = useUI();
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  
  const [newLabel, setNewLabel] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [customPathTouched, setCustomPathTouched] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerCurrentId, setPickerCurrentId] = useState('root');
  const [pickerData, setPickerData] = useState<FolderContent | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const formRef = useRef<HTMLDivElement>(null);

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

  const toggleFolderSelection = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    const newSet = new Set(selectedIds);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setSelectedIds(newSet);
  };

  const confirmSelection = () => {
    if (selectedIds.size > 0) {
      setNewFolderId(Array.from(selectedIds).join(','));
    } else if (pickerCurrentId !== 'root') {
      setNewFolderId(pickerCurrentId);
    }
    setShowPicker(false);
    setSelectedIds(new Set()); 
    setPickerCurrentId('root');
  };

  // --- Main Logic ---

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewLabel(val);
    if (!customPathTouched && !isEditing) {
      const slug = val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setCustomPath(slug);
    }
  };

  const handleCustomPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPathTouched(true);
    setCustomPath(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''));
  };

  const resetForm = () => {
    setNewLabel('');
    setNewFolderId('');
    setCustomPath('');
    setLogoUrl('');
    setCustomPathTouched(false);
    setIsEditing(false);
    setEditingShareId(null);
  };

  const handleStartEdit = (share: ShareLink) => {
    setIsEditing(true);
    setEditingShareId(share.id);
    setNewLabel(share.label);
    setNewFolderId(share.folderId);
    setCustomPath(share.id);
    setLogoUrl(share.logoUrl || '');
    setCustomPathTouched(true); // Don't auto-update path when editing label
    
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newFolderId) return;

    setCreating(true);
    
    let res;
    if (isEditing && editingShareId) {
      res = await updateShare(token, editingShareId, newFolderId, newLabel, customPath, logoUrl);
    } else {
      res = await createShare(token, newFolderId, newLabel, customPath, logoUrl);
    }
    
    setCreating(false);

    if (res.success) {
      resetForm();
      fetchShares();
      showToast(isEditing ? "Link updated successfully!" : "Link created successfully!", 'success');
    } else {
      showToast(res.error || "Operation failed.", 'error');
    }
  };

  const handleFolderIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    let extractedId = input;
    const matches = [...input.matchAll(/(?:folders\/|id=)([\w-]+)/g)];
    if (matches.length > 0) {
      extractedId = matches.map(m => m[1]).join(',');
    }
    setNewFolderId(extractedId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link? The client will lose access.")) return;
    const res = await deleteShare(token, id);
    if (res.success) {
      setShares(prev => prev.filter(s => s.id !== id));
      showToast("Link deleted.", 'info');
      if (editingShareId === id) resetForm();
    } else {
      showToast("Failed to delete link.", 'error');
    }
  };

  const copyLink = (shareId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard!", 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-6 flex flex-col items-center transition-colors duration-300">
      
      <div className="w-full max-w-4xl">
        {/* Header - Stacked on Mobile, Row on Desktop */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 flex-shrink-0">
               <FolderLock className="w-6 h-6 text-white" />
             </div>
             <div className="min-w-0 flex-1">
               <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">Share Manager</h1>
               <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">Generate secure links</p>
             </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                title="Toggle Theme"
             >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
            <button onClick={onLogout} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium border border-transparent dark:border-slate-700">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {/* Create/Edit Card */}
        <div ref={formRef} className={`glass rounded-2xl p-4 sm:p-6 mb-8 border transition-all duration-300 ${isEditing ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/20'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
             <h2 className={`text-lg font-semibold flex items-center gap-2 ${isEditing ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
               {isEditing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5 text-blue-500" />} 
               {isEditing ? "Edit Shared Link" : "Create New Share"}
             </h2>
             {isEditing && (
                <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white underline">
                   Cancel Edit
                </button>
             )}
          </div>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
               <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Client / Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PT Maju Jaya Files"
                    value={newLabel}
                    onChange={handleLabelChange}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all text-sm sm:text-base"
                  />
               </div>
               
               <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Logo URL (Optional)</label>
                 <div className="relative flex gap-2">
                   <div className="relative flex-1 min-w-0">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                      <input 
                          type="text" 
                          placeholder="https://..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-xl pl-10 pr-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all text-sm"
                        />
                   </div>
                   {logoUrl && (
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0">
                         <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                   )}
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Custom Link Name</label>
                 <div className="relative group">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono group-focus-within:text-blue-500">?share=</div>
                   <input 
                      type="text" 
                      placeholder="client-name"
                      value={customPath}
                      onChange={handleCustomPathChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-xl pl-16 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                    />
                 </div>
               </div>

               <div className="relative">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Folder ID(s)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Folder ID..."
                      value={newFolderId}
                      onChange={handleFolderIdChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPicker(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                      title="Browse Drive"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={creating || !newLabel || !newFolderId}
              className={`w-full font-bold rounded-xl px-4 py-3.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-lg ${isEditing ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'}`}
            >
              {creating ? <Loader2 className="animate-spin w-5 h-5" /> : (isEditing ? <><Save className="w-5 h-5" /> Update Link</> : "Generate Secure Link")}
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">Active Links</h3>
           <button onClick={fetchShares} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
             <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>

        {loading && shares.length === 0 ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
            <span>Loading shares...</span>
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-100 dark:bg-slate-800/20">
            <p className="text-slate-500 dark:text-slate-400">No active shared links found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shares.map(share => (
              <div key={share.id} className={`bg-white dark:bg-slate-800/40 border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:shadow-md transition-all ${isEditing && editingShareId === share.id ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-700/50'}`}>
                
                {/* Logo & Label Section */}
                <div className="flex items-start gap-4 w-full sm:w-auto overflow-hidden">
                   <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-600/50 overflow-hidden">
                      {share.logoUrl ? (
                         <img src={share.logoUrl} className="w-full h-full object-contain" alt="logo" />
                      ) : (
                         <span className="text-lg font-bold text-slate-400 dark:text-slate-500 uppercase">{share.label.substring(0,2)}</span>
                      )}
                   </div>
                   
                   <div className="min-w-0 flex-1">
                      {/* Use break-words for long names */}
                      <h4 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white break-words leading-tight">{share.label}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono border border-blue-100 dark:border-blue-500/20 whitespace-nowrap">
                           <LinkIcon className="w-3 h-3" /> /{share.id}
                        </span>
                        <span className="hidden sm:inline opacity-50">&bull;</span>
                        <span className="opacity-70 truncate max-w-[150px] sm:max-w-xs">ID: {share.folderId}</span>
                      </div>
                   </div>
                </div>

                {/* Actions - Grid on Mobile, Flex on Desktop */}
                <div className="grid grid-cols-4 sm:flex gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50">
                   <button 
                     onClick={() => copyLink(share.id)}
                     className="sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white rounded-lg transition-all text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500"
                     title="Copy Link"
                   >
                     <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Copy</span>
                   </button>
                   
                   <button 
                     onClick={() => handleStartEdit(share)}
                     className="flex items-center justify-center p-2.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-600/30"
                     title="Edit"
                   >
                     <Pencil className="w-5 h-5" />
                   </button>

                   <a 
                     href={`?share=${share.id}`}
                     target="_blank"
                     className="flex items-center justify-center p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                     title="Open Link"
                   >
                     <ExternalLink className="w-5 h-5" />
                   </a>

                   <button 
                     onClick={() => handleDelete(share.id)}
                     className="flex items-center justify-center p-2.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
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

      {/* FOLDER PICKER MODAL - Mobile Optimized */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-700 sm:rounded-2xl w-full max-w-2xl h-full sm:h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-500" /> Select Folder(s)
              </h3>
              <div className="flex items-center gap-3">
                 {selectedIds.size > 0 && (
                   <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full animate-pulse">
                     {selectedIds.size} Selected
                   </span>
                 )}
                 <button 
                    onClick={() => setShowPicker(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
              {pickerData?.path.map((p, idx) => (
                <div key={p.id} className="flex items-center">
                  {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 mx-1" />}
                  <button 
                    onClick={() => setPickerCurrentId(p.id)}
                    className={`hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${idx === pickerData.path.length - 1 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {p.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-white dark:bg-slate-900">
               {pickerLoading ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                   <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                   <p className="text-sm">Loading folders...</p>
                 </div>
               ) : (
                 <div className="space-y-1">
                   {pickerData?.path.length && pickerData.path.length > 1 && (
                     <button 
                       onClick={() => {
                          const parent = pickerData.path[pickerData.path.length - 2];
                          setPickerCurrentId(parent.id);
                       }}
                       className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 text-left transition-colors group"
                     >
                       <div className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                         <ArrowLeft className="w-5 h-5 text-slate-400" />
                       </div>
                       <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">.. (Back)</span>
                     </button>
                   )}

                   {pickerData?.files.filter(f => f.isFolder).map(folder => {
                     const isSelected = selectedIds.has(folder.id);
                     return (
                      <div key={folder.id} className={`w-full flex items-center gap-3 p-2 rounded-xl border ${isSelected ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-500/10' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'} transition-all group`}>
                        <button 
                          onClick={() => setPickerCurrentId(folder.id)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-blue-500'}`}>
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`}>{folder.name}</p>
                            <p className="text-xs text-slate-500">Click to open</p>
                          </div>
                        </button>

                        <button 
                          onClick={(e) => toggleFolderSelection(e, folder.id)}
                          className={`
                            p-3 rounded-lg transition-all transform active:scale-95 flex-shrink-0
                            ${isSelected 
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }
                          `}
                        >
                          {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                   )})}
                 </div>
               )}
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-8 sm:pb-4">
              <button
                onClick={confirmSelection}
                className={`
                  w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg 
                  ${selectedIds.size > 0 
                     ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20' 
                     : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }
                `}
              >
                {selectedIds.size > 0 
                  ? <><CheckCircle2 className="w-5 h-5" /> Confirm {selectedIds.size} Selected Folder{selectedIds.size > 1 ? 's' : ''}</>
                  : `Select Current Folder (${pickerData?.name || 'Root'})`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;