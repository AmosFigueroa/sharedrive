import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { DriveFile, FolderContent, ViewMode } from '../types';
import { getFolderContents } from '../services/apiService';
import { 
  Folder, FileText, Image as ImageIcon, Video, FileSpreadsheet, 
  Download, Search, Grid, List, ChevronRight, Loader2, AlertCircle 
} from 'lucide-react';

interface ClientDashboardProps {
  shareId: string;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ shareId }) => {
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderData, setFolderData] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const fetchData = useCallback(async (folderId: string) => {
    setLoading(true);
    setSearchQuery('');
    setError(null);
    
    // Pass null for token, provide shareId
    const res = await getFolderContents(folderId, null, shareId);
    
    if (res.success && res.data) {
      setFolderData(res.data);
    } else {
      setError(res.error || "This link may have expired or is invalid.");
      setFolderData(null);
    }
    setLoading(false);
  }, [shareId]);

  useEffect(() => {
    fetchData(currentFolder);
  }, [currentFolder, fetchData]);

  const getFileIcon = (mimeType: string, className: string = "w-10 h-10") => {
    if (mimeType.includes('folder')) return <Folder className={`${className} text-blue-400`} />;
    if (mimeType.includes('image')) return <ImageIcon className={`${className} text-purple-400`} />;
    if (mimeType.includes('video')) return <Video className={`${className} text-pink-400`} />;
    if (mimeType.includes('pdf')) return <FileText className={`${className} text-red-400`} />;
    if (mimeType.includes('spreadsheet')) return <FileSpreadsheet className={`${className} text-green-500`} />;
    return <FileText className={`${className} text-slate-400`} />;
  };

  const filteredFiles = folderData?.files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDownload = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    window.open(file.downloadUrl, '_blank');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden flex-col">
      
      {/* Client Header - Clean */}
      <header className="glass z-20 border-b border-slate-700/50 flex-shrink-0">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Folder className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-white">Client Portal</span>
          </div>
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files..." 
              className="w-full bg-slate-800 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-200"
            />
          </div>
        </div>
      </header>

      {/* Path Bar */}
      <div className="px-6 py-3 bg-slate-900/50 border-b border-white/5 flex items-center gap-2">
         {folderData?.path.map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
              <button 
                onClick={() => setCurrentFolder(p.id)}
                className={`text-sm hover:text-blue-400 transition-colors ${idx === folderData.path.length - 1 ? 'text-white font-medium' : 'text-slate-400'}`}
              >
                {p.name}
              </button>
            </React.Fragment>
         ))}
         <div className="flex-1"></div>
         <div className="flex gap-1 bg-slate-800 rounded p-1">
            <button onClick={() => setViewMode(ViewMode.GRID)} className={`p-1 rounded ${viewMode === ViewMode.GRID ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><Grid className="w-4 h-4"/></button>
            <button onClick={() => setViewMode(ViewMode.LIST)} className={`p-1 rounded ${viewMode === ViewMode.LIST ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><List className="w-4 h-4"/></button>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
               <Folder className="w-12 h-12 mb-3 opacity-30" />
               <p>No files found.</p>
            </div>
          ) : (
            <div className={`
              ${viewMode === ViewMode.GRID 
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' 
                : 'flex flex-col space-y-2'
              }
            `}>
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => file.isFolder ? setCurrentFolder(file.id) : handleDownload({ stopPropagation: () => {} } as any, file)}
                  className={`
                    group relative border border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/60 
                    hover:border-blue-500/30 hover:shadow-lg transition-all cursor-pointer overflow-hidden
                    ${viewMode === ViewMode.GRID 
                      ? 'rounded-xl p-4 flex flex-col items-center text-center aspect-[4/5] justify-between' 
                      : 'rounded-lg p-3 flex items-center justify-between'
                    }
                  `}
                >
                   {viewMode === ViewMode.GRID ? (
                     <>
                       <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-lg bg-slate-900/50 mb-3">
                         {file.thumbnailUrl ? (
                           <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                         ) : (
                            <div className="transform group-hover:scale-105 transition-transform">
                              {getFileIcon(file.mimeType, "w-12 h-12")}
                            </div>
                         )}
                         {!file.isFolder && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                <Download className="text-white w-6 h-6 drop-shadow-lg" />
                             </div>
                         )}
                       </div>
                       <p className="text-sm text-slate-200 w-full truncate">{file.name}</p>
                     </>
                   ) : (
                     <>
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file.mimeType, "w-5 h-5")}
                          <span className="text-sm text-slate-200 truncate">{file.name}</span>
                       </div>
                       {!file.isFolder && <Download className="w-4 h-4 text-slate-500" />}
                     </>
                   )}
                </div>
              ))}
            </div>
          )}
      </main>
    </div>
  );
};

export default ClientDashboard;