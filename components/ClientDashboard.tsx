import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { DriveFile, FolderContent, ViewMode } from '../types';
import { getFolderContents } from '../services/apiService';
import { 
  Folder, FileText, Image as ImageIcon, Video, FileSpreadsheet, 
  Download, Search, Grid, List, ChevronRight, Loader2, AlertCircle, ArrowLeft, LayoutGrid 
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

  const handleNavigateUp = () => {
    if (folderData && folderData.path.length > 1) {
      const parent = folderData.path[folderData.path.length - 2];
      setCurrentFolder(parent.id);
    }
  };

  const getFileIcon = (mimeType: string, className: string = "w-10 h-10") => {
    if (mimeType.includes('folder')) return <Folder className={`${className} text-blue-500 fill-blue-500/20`} />;
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

  const isRoot = folderData?.path.length === 1;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden flex-col font-sans">
      
      {/* Header */}
      <header className="glass z-20 border-b border-slate-700/50 flex-shrink-0">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isRoot && !loading && (
              <button 
                onClick={handleNavigateUp}
                className="p-2 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-tight">
                {folderData ? folderData.name : 'Gallery'}
              </span>
              {!isRoot && folderData && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                   <LayoutGrid className="w-3 h-3" /> 
                   In: {folderData.path[folderData.path.length - 2]?.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative w-full max-w-xs hidden sm:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search gallery..." 
                 className="w-full bg-slate-800/50 border border-slate-700/50 rounded-full py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-200"
               />
             </div>
             
             <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

             <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
               <button onClick={() => setViewMode(ViewMode.GRID)} className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.GRID ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}><Grid className="w-4 h-4"/></button>
               <button onClick={() => setViewMode(ViewMode.LIST)} className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.LIST ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}><List className="w-4 h-4"/></button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gradient-to-b from-slate-900 to-slate-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Loading content...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-800/20 m-4">
               <Folder className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-lg">This folder is empty</p>
            </div>
          ) : (
            <div className={`
              ${viewMode === ViewMode.GRID 
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6' 
                : 'flex flex-col space-y-2'
              }
            `}>
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => file.isFolder ? setCurrentFolder(file.id) : handleDownload({ stopPropagation: () => {} } as any, file)}
                  className={`
                    group relative transition-all duration-300 cursor-pointer overflow-hidden
                    ${viewMode === ViewMode.GRID 
                      ? 'rounded-2xl bg-slate-800/30 hover:bg-slate-800 hover:shadow-2xl hover:shadow-black/50 ring-1 ring-white/5 hover:ring-blue-500/50 p-3 flex flex-col aspect-[3/4]' 
                      : 'rounded-lg p-3 flex items-center justify-between hover:bg-slate-800 border border-transparent hover:border-slate-700'
                    }
                  `}
                >
                   {viewMode === ViewMode.GRID ? (
                     <>
                       <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-xl bg-slate-900/50 mb-3 shadow-inner">
                         {file.thumbnailUrl ? (
                           <img 
                            src={file.thumbnailUrl} 
                            alt={file.name} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" 
                           />
                         ) : (
                            <div className="transform group-hover:scale-110 transition-transform duration-300">
                              {getFileIcon(file.mimeType, "w-16 h-16")}
                            </div>
                         )}
                         
                         {file.isFolder && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white border border-white/10">Open</span>
                            </div>
                         )}

                         {!file.isFolder && (
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur-[2px] transition-all duration-300">
                                <Download className="text-white w-8 h-8 drop-shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform" />
                             </div>
                         )}
                       </div>
                       <div className="w-full">
                         <p className="text-sm font-medium text-slate-300 w-full truncate group-hover:text-white transition-colors">{file.name}</p>
                         <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-slate-500">{file.isFolder ? 'Folder' : (file.size / 1024 / 1024).toFixed(1) + ' MB'}</p>
                         </div>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 bg-slate-800 rounded-lg">
                            {getFileIcon(file.mimeType, "w-5 h-5")}
                          </div>
                          <span className="text-sm text-slate-200 truncate font-medium">{file.name}</span>
                       </div>
                       {!file.isFolder ? (
                          <Download className="w-4 h-4 text-slate-500 hover:text-blue-400 transition-colors" />
                       ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                       )}
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