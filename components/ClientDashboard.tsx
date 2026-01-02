import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DriveFile, FolderContent, ViewMode } from '../types';
import { getFolderContents } from '../services/apiService';
import { 
  Folder, FileText, Image as ImageIcon, Video, FileSpreadsheet, 
  Download, Search, Grid, List, ChevronRight, Loader2, AlertCircle, 
  ArrowLeft, LayoutGrid, X, ChevronLeft, ZoomIn, ZoomOut, RotateCcw, Maximize2, Home
} from 'lucide-react';

interface ClientDashboardProps {
  shareId: string;
}

interface TransformState {
  scale: number;
  x: number;
  y: number;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ shareId }) => {
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderData, setFolderData] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Persistent Branding State
  const [pageTitle, setPageTitle] = useState<string>('');
  const [pageLogo, setPageLogo] = useState<string | undefined>(undefined);

  // Lightbox State
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  
  // Image Interaction State
  const [transform, setTransform] = useState<TransformState>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (folderId: string) => {
    setLoading(true);
    setSearchQuery('');
    setError(null);
    
    // Pass null for token, provide shareId
    const res = await getFolderContents(folderId, null, shareId);
    
    if (res.success && res.data) {
      setFolderData(res.data);
      // Update persistent branding only if available and not set yet (or update always to be safe)
      if (res.data.shareLabel) setPageTitle(res.data.shareLabel);
      if (res.data.shareLogo) setPageLogo(res.data.shareLogo);
    } else {
      setError(res.error || "This link may have expired or is invalid.");
      setFolderData(null);
    }
    setLoading(false);
  }, [shareId]);

  useEffect(() => {
    fetchData(currentFolder);
  }, [currentFolder, fetchData]);

  // Reset transform when file changes
  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [previewFile]);

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
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className={`${className} text-green-500`} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${className} text-blue-400`} />;
    return <FileText className={`${className} text-slate-400`} />;
  };

  const filteredFiles = folderData?.files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // --- LIGHTBOX LOGIC ---
  const imageFiles = filteredFiles.filter(f => f.mimeType.startsWith('image/') && f.thumbnailUrl);

  const isPreviewable = (mimeType: string) => {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType === 'application/pdf' ||
           mimeType.includes('officedocument'); // Word/Excel
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.isFolder) {
      setCurrentFolder(file.id);
    } else if (isPreviewable(file.mimeType)) {
      setPreviewFile(file);
    } else {
      window.open(file.downloadUrl, '_blank');
    }
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = imageFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex !== -1 && currentIndex < imageFiles.length - 1) {
      setPreviewFile(imageFiles[currentIndex + 1]);
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!previewFile) return;
    const currentIndex = imageFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex > 0) {
      setPreviewFile(imageFiles[currentIndex - 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewFile) return;
      
      // Only navigate images if currently viewing an image
      if (previewFile.mimeType.startsWith('image/')) {
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'ArrowLeft') handlePrevImage();
      }
      
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, imageFiles]);

  const handleDownload = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    window.open(file.downloadUrl, '_blank');
  };

  const getPreviewUrl = (thumbnailUrl: string) => {
    if (thumbnailUrl.startsWith('data:')) {
      return thumbnailUrl;
    }
    return thumbnailUrl.replace(/=s\d+.*$/, '=s0');
  };

  const getEmbedUrl = (url: string) => {
    return url.replace('/view', '/preview');
  };

  // --- ZOOM & PAN HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    if (!previewFile?.mimeType.startsWith('image/')) return;
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(1, transform.scale + delta), 5);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewFile?.mimeType.startsWith('image/') || transform.scale === 1) return;
    e.preventDefault();
    setIsDragging(true);
    setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({
      ...prev,
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.5, 5) }));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.5, 1), x: prev.scale <= 1.5 ? 0 : prev.x, y: prev.scale <= 1.5 ? 0 : prev.y }));
  };

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransform({ scale: 1, x: 0, y: 0 });
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
      <header className="glass z-20 border-b border-slate-700/50 flex-shrink-0 flex flex-col">
        {/* Top Bar: Title & Search */}
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* Main Title: STATIC (Based on Share Label) */}
             <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-tight">
                {pageTitle || (folderData ? folderData.name : 'Loading...')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative w-full max-w-xs hidden sm:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search files..." 
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

        {/* Bottom Bar: Logo & Breadcrumbs Navigation */}
        <div className="px-4 sm:px-6 py-2 bg-slate-800/30 flex items-center gap-4 border-t border-white/5">
            {/* Logo Section */}
            {pageLogo && (
               <div className="flex-shrink-0 mr-2 border-r border-slate-700 pr-4">
                  <img src={pageLogo} alt="Logo" className="h-8 w-auto object-contain" />
               </div>
            )}

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
              {!isRoot && !loading && (
                <button 
                  onClick={handleNavigateUp}
                  className="p-1 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors mr-1"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <nav className="flex items-center text-sm text-slate-400">
                {folderData?.path.map((p, idx) => (
                  <React.Fragment key={p.id}>
                    {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0 text-slate-600" />}
                    <button 
                      onClick={() => setCurrentFolder(p.id)}
                      className={`hover:text-blue-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 ${idx === folderData.path.length - 1 ? 'text-white font-medium bg-slate-800/50 border border-slate-700/50' : ''}`}
                    >
                      {idx === 0 ? <Home className="w-3 h-3" /> : null}
                      {p.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
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
                  onClick={() => handleFileClick(file)}
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
                            // removed onError that hides image, as Base64 is reliable
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
                          <Download onClick={(e) => handleDownload(e, file)} className="w-4 h-4 text-slate-500 hover:text-blue-400 transition-colors" />
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

      {/* --- PREVIEW MODAL (LIGHTBOX) --- */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewFile(null)}
        >
          {/* Close Button */}
          <button 
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-white transition-colors z-[60]"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Buttons (Only for Images) */}
          {previewFile.mimeType.startsWith('image/') && imageFiles.length > 1 && (
            <>
              <button 
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110 z-[60]"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110 z-[60]"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* CONTROLS (Top Left) - For Images */}
          {previewFile.mimeType.startsWith('image/') && (
            <div 
              className="absolute top-4 left-4 flex gap-2 z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={zoomIn} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors" title="Zoom In">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={zoomOut} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors" title="Zoom Out">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={resetZoom} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors" title="Reset View">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* DOWNLOAD & INFO (Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end justify-between pointer-events-none z-[60]">
             <div className="pointer-events-auto">
                <h3 className="text-white font-bold text-lg drop-shadow-md">{previewFile.name}</h3>
                <p className="text-slate-300 text-sm drop-shadow-md">{(previewFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {previewFile.mimeType.startsWith('image/') && imageFiles.length > 1 && (
                   <p className="text-xs text-slate-400 mt-1">
                      Image {imageFiles.findIndex(f => f.id === previewFile.id) + 1} of {imageFiles.length}
                   </p>
                )}
             </div>
             <button 
               onClick={(e) => handleDownload(e, previewFile)}
               className="pointer-events-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50"
             >
               <Download className="w-5 h-5" /> Download
             </button>
          </div>

          {/* --- MEDIA CONTENT CONTAINER --- */}
          <div 
             ref={imageContainerRef}
             className="w-full h-full flex items-center justify-center p-0 sm:p-4 overflow-hidden"
             onClick={(e) => e.stopPropagation()} 
             onWheel={handleWheel}
          >
             {/* 1. IMAGE RENDERING */}
             {previewFile.mimeType.startsWith('image/') ? (
                previewFile.thumbnailUrl ? (
                  <div 
                    className="w-full h-full flex items-center justify-center cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img 
                      src={getPreviewUrl(previewFile.thumbnailUrl)} 
                      alt={previewFile.name} 
                      className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out select-none"
                      draggable={false}
                      style={{
                        transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`,
                        cursor: transform.scale > 1 ? 'grab' : 'default'
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-white flex flex-col items-center">
                    <ImageIcon className="w-20 h-20 text-slate-600 mb-4" />
                    <p>Preview not available</p>
                  </div>
                )
             ) : (
               /* 2. VIDEO & DOCUMENT RENDERING (iFrame) */
               <div className="w-full h-full max-w-6xl max-h-[85vh] bg-black rounded-lg overflow-hidden shadow-2xl relative">
                  <iframe 
                    src={getEmbedUrl(previewFile.url)} 
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media" 
                    allowFullScreen
                    title="File Preview"
                  ></iframe>
               </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientDashboard;