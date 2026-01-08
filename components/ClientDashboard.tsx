import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DriveFile, FolderContent, ViewMode } from '../types';
import { getFolderContents } from '../services/apiService';
import { useUI } from '../contexts/UIContext';
import { EMPTY_STATE_IMAGE } from '../constants';
import { 
  Folder, FileText, Image as ImageIcon, Video, FileSpreadsheet, 
  Download, Search, Grid, List, ChevronRight, AlertCircle, 
  ArrowLeft, X, ChevronLeft, ZoomIn, ZoomOut, RotateCcw, Home,
  Sun, Moon, ArrowUp, Loader2, FolderOpen, CheckSquare, Square, Check
} from 'lucide-react';

interface ClientDashboardProps {
  shareId: string;
}

interface TransformState {
  scale: number;
  x: number;
  y: number;
}

// --- SKELETON COMPONENTS ---
const GridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 animate-pulse">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="rounded-2xl bg-white dark:bg-slate-800/30 ring-1 ring-slate-200 dark:ring-white/5 p-3 flex flex-col aspect-[3/4]">
        <div className="flex-1 w-full rounded-xl bg-slate-200 dark:bg-slate-800 mb-3 shimmer"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 shimmer"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 shimmer"></div>
        </div>
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="flex flex-col space-y-2 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="rounded-lg p-3 flex items-center gap-4 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-800 shimmer"></div>
        <div className="flex-1 space-y-2">
           <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 shimmer"></div>
        </div>
        <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-800 shimmer"></div>
      </div>
    ))}
  </div>
);

const ClientDashboard: React.FC<ClientDashboardProps> = ({ shareId }) => {
  const { showToast, startDownload, theme, toggleTheme } = useUI();
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderData, setFolderData] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [emptyImgError, setEmptyImgError] = useState(false);
  
  // Multi-Select State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Persistent Branding State
  const [pageTitle, setPageTitle] = useState<string>('');
  const [pageLogo, setPageLogo] = useState<string | undefined>(undefined);

  // Scroll State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Lightbox State
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // Image Interaction State
  const [transform, setTransform] = useState<TransformState>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // --- RECURSIVE FETCHING FOR PAGINATION ---
  const fetchNextPage = async (folderId: string, pageToken: string) => {
    setLoadingMore(true);
    const res = await getFolderContents(folderId, null, shareId, pageToken);
    
    if (res.success && res.data && 'files' in res.data) {
       setFolderData(prev => {
         if (!prev) return null;
         return {
           ...prev,
           files: [...prev.files, ...(res.data as any).files],
           nextPageToken: (res.data as any).nextPageToken
         };
       });

       // Automatically fetch next page if one exists
       if ((res.data as any).nextPageToken) {
          fetchNextPage(folderId, (res.data as any).nextPageToken);
       } else {
         setLoadingMore(false);
       }
    } else {
      setLoadingMore(false);
    }
  };

  const fetchData = useCallback(async (folderId: string) => {
    setLoading(true);
    setSearchQuery('');
    setError(null);
    setFailedImages(new Set()); // Reset failed images on new fetch
    setLoadingMore(false);
    setSelectedFileIds(new Set()); // Reset selections
    setIsSelectionMode(false);
    
    // Pass null for token, provide shareId
    const res = await getFolderContents(folderId, null, shareId);
    
    if (res.success && res.data) {
      setFolderData(res.data as FolderContent);
      if ((res.data as FolderContent).shareLabel) setPageTitle((res.data as FolderContent).shareLabel!);
      if ((res.data as FolderContent).shareLogo) setPageLogo((res.data as FolderContent).shareLogo);
      
      // Check for pagination immediately after first load
      if ((res.data as FolderContent).nextPageToken) {
         fetchNextPage(folderId, (res.data as FolderContent).nextPageToken!);
      }

    } else {
      setError(res.error || "This link may have expired or is invalid.");
      setFolderData(null);
    }
    setLoading(false);
  }, [shareId]);

  useEffect(() => {
    fetchData(currentFolder);
  }, [currentFolder, fetchData]);

  useEffect(() => {
    // Reset state when file changes
    setTransform({ scale: 1, x: 0, y: 0 });
    setIsImageLoading(true); 
  }, [previewFile]);

  const handleImageError = (fileId: string) => {
    setFailedImages(prev => new Set(prev).add(fileId));
    setIsImageLoading(false);
  };

  // Handle Scroll to toggle button visibility
  const handleScroll = () => {
    if (mainContentRef.current) {
      setShowScrollTop(mainContentRef.current.scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateUp = () => {
    if (folderData && folderData.path.length > 1) {
      const parent = folderData.path[folderData.path.length - 2];
      setCurrentFolder(parent.id);
    }
  };

  const getFileIcon = (mimeType: string, className: string = "w-10 h-10") => {
    if (mimeType.includes('folder')) return <Folder className={`${className} text-blue-500 fill-blue-500/20`} />;
    if (mimeType.includes('image')) return <ImageIcon className={`${className} text-purple-500 dark:text-purple-400`} />;
    if (mimeType.includes('video')) return <Video className={`${className} text-pink-500 dark:text-pink-400`} />;
    if (mimeType.includes('pdf')) return <FileText className={`${className} text-red-500 dark:text-red-400`} />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className={`${className} text-green-600 dark:text-green-500`} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${className} text-blue-500 dark:text-blue-400`} />;
    return <FileText className={`${className} text-slate-400`} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredFiles = folderData?.files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const imageFiles = filteredFiles.filter(f => f.mimeType.startsWith('image/') && f.thumbnailUrl);

  const toggleSelection = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedFileIds);
    if (newSet.has(fileId)) {
      newSet.delete(fileId);
      if (newSet.size === 0) setIsSelectionMode(false);
    } else {
      newSet.add(fileId);
      setIsSelectionMode(true);
    }
    setSelectedFileIds(newSet);
  };

  const handleFileClick = (file: DriveFile) => {
    if (isSelectionMode && !file.isFolder) {
      // In selection mode, clicking the card toggles selection (except folders for now)
      const newSet = new Set(selectedFileIds);
      if (newSet.has(file.id)) newSet.delete(file.id);
      else newSet.add(file.id);
      setSelectedFileIds(newSet);
      if (newSet.size === 0) setIsSelectionMode(false);
      return;
    }

    if (file.isFolder) {
      setCurrentFolder(file.id);
    } else {
      setPreviewFile(file);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewFile) return;
      if (previewFile.mimeType.startsWith('image/')) {
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'ArrowLeft') handlePrevImage();
      }
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, imageFiles]);

  const handleDownload = (e: React.MouseEvent | null, file: DriveFile) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    startDownload();
    
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  const handleBulkDownload = () => {
    if (selectedFileIds.size === 0) return;
    
    startDownload();
    showToast(`Starting download for ${selectedFileIds.size} files...`, 'info');

    const filesToDownload = filteredFiles.filter(f => selectedFileIds.has(f.id));
    
    // Download files with a slight stagger to prevent browser blocking
    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
      }, index * 800);
    });

    setSelectedFileIds(new Set());
    setIsSelectionMode(false);
  };

  const getPreviewUrl = (thumbnailUrl: string) => {
    if (thumbnailUrl.startsWith('data:')) {
      return thumbnailUrl;
    }
    return thumbnailUrl.replace(/=s\d+.*$/, '=s1600'); 
  };

  const getEmbedUrl = (url: string) => {
    return url.replace('/view', '/preview');
  };

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

  const handleMouseUp = () => setIsDragging(false);
  const zoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.5, 5) })); };
  const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.5, 1) })); };
  const resetZoom = (e: React.MouseEvent) => { e.stopPropagation(); setTransform({ scale: 1, x: 0, y: 0 }); };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const isRoot = folderData?.path.length === 1;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="glass z-20 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0 flex flex-col">
        {/* Top Bar: Layout optimized for mobile */}
        <div className="p-4 sm:px-6 min-h-[4rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
             {pageLogo && (
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 p-1">
                   <img src={pageLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
             )}
             <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight truncate leading-tight">
                {pageTitle || (folderData ? folderData.name : 'Loading...')}
              </span>
            </div>
          </div>

          {/* Controls: Search, Theme, View, Select */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:flex-none sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search files..." 
                 className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-full py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
               />
             </div>
             
             {/* Divider hidden on mobile */}
             <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>

             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             {/* View Toggle */}
             <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
               <button onClick={() => setViewMode(ViewMode.GRID)} className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.GRID ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Grid className="w-4 h-4"/></button>
               <button onClick={() => setViewMode(ViewMode.LIST)} className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.LIST ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><List className="w-4 h-4"/></button>
             </div>

             {/* Selection Mode Toggle */}
             <button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedFileIds(new Set());
                }}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isSelectionMode ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                title="Select Files"
             >
               {isSelectionMode ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
             </button>
          </div>
        </div>

        {/* Bottom Bar: Breadcrumbs */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/50 dark:bg-slate-800/30 flex items-center gap-4 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
              {!isRoot && !loading && (
                <button 
                  onClick={handleNavigateUp}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors mr-1"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                {folderData?.path.map((p, idx) => (
                  <React.Fragment key={p.id}>
                    {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0 text-slate-400 dark:text-slate-600" />}
                    <button 
                      onClick={() => setCurrentFolder(p.id)}
                      className={`hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 ${idx === folderData.path.length - 1 ? 'text-slate-900 dark:text-white font-medium bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm' : ''}`}
                    >
                      {idx === 0 ? <Home className="w-3 h-3" /> : null}
                      {p.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>
            
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Loading more...</span>
              </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main 
        ref={mainContentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar bg-slate-50 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 relative"
      >
          {loading ? (
            <div className="h-full w-full">
              {viewMode === ViewMode.GRID ? <GridSkeleton /> : <ListSkeleton />}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full m-4">
               {/* 3D Illustration Empty State with Fallback */}
               {emptyImgError ? (
                  <div className="relative w-48 h-48 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mb-6 ring-4 ring-slate-50 dark:ring-slate-900 shadow-xl">
                    <FolderOpen className="w-24 h-24 text-slate-300 dark:text-slate-600" />
                    <div className="absolute -bottom-2 -right-2 bg-slate-50 dark:bg-slate-900 rounded-full p-2 shadow-sm">
                        <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-2">
                           <X className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                    </div>
                  </div>
               ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/5 blur-[50px] rounded-full transform scale-75 animate-pulse"></div>
                    <img 
                      src={EMPTY_STATE_IMAGE} 
                      alt="Empty Folder" 
                      onError={() => setEmptyImgError(true)}
                      className="relative w-48 h-48 object-contain animate-float drop-shadow-2xl"
                    />
                  </div>
               )}
               
               <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mt-6">Folder is Empty</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-center">There are no files to display in this folder.</p>
            </div>
          ) : (
            <>
              {/* LIST VIEW HEADERS (Desktop Only) */}
              {viewMode === ViewMode.LIST && (
                <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 mb-2 uppercase tracking-wider">
                  {isSelectionMode && <div className="w-8"></div>}
                  <div className="flex-1 pl-12">Name</div>
                  <div className="w-32">Date Modified</div>
                  <div className="w-24 text-right pr-8">Size</div>
                  <div className="w-8"></div>
                </div>
              )}

              <div className={`
                ${viewMode === ViewMode.GRID 
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6' 
                  : 'flex flex-col space-y-2'
                }
              `}>
                {filteredFiles.map((file) => {
                  const isSelected = selectedFileIds.has(file.id);
                  return (
                    <div 
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className={`
                        group relative transition-all duration-300 cursor-pointer overflow-hidden
                        ${viewMode === ViewMode.GRID 
                          ? `rounded-2xl bg-white dark:bg-slate-800/30 shadow-sm hover:shadow-xl dark:hover:shadow-black/50 ring-1 p-3 flex flex-col aspect-[3/4] ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'ring-slate-200 dark:ring-white/5 hover:ring-blue-500/50 hover:bg-white dark:hover:bg-slate-800'}`
                          : `rounded-lg p-3 flex items-center justify-between border ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`
                        }
                      `}
                    >
                      {/* Checkbox Overlay */}
                      {!file.isFolder && (
                         <div 
                           onClick={(e) => toggleSelection(e, file.id)}
                           className={`
                             absolute top-2 right-2 z-30 p-1.5 rounded-full transition-all
                             ${viewMode === ViewMode.GRID ? '' : 'left-2 right-auto top-1/2 -translate-y-1/2'}
                             ${isSelected ? 'bg-blue-500 text-white opacity-100' : 'bg-black/20 text-white opacity-0 group-hover:opacity-100'}
                             ${isSelectionMode ? 'opacity-100' : ''}
                           `}
                         >
                           {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                         </div>
                      )}

                      {viewMode === ViewMode.GRID ? (
                        <>
                          <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900/50 mb-3 shadow-inner">
                            {file.thumbnailUrl && !failedImages.has(file.id) ? (
                              <img 
                                src={file.thumbnailUrl} 
                                alt={file.name} 
                                onError={() => handleImageError(file.id)}
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
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 w-full line-clamp-2 leading-tight h-10 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                              {file.name}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-slate-400 dark:text-slate-500">{file.isFolder ? 'Folder' : formatSize(file.size)}</p>
                                {!file.isFolder && !isSelectionMode && (
                                  <button 
                                    onClick={(e) => handleDownload(e, file)}
                                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors z-20"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* List View - Name Column */}
                          <div className={`flex items-center gap-4 flex-1 min-w-0 ${isSelectionMode ? 'pl-8' : ''}`}>
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                {getFileIcon(file.mimeType, "w-5 h-5")}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{file.name}</span>
                                {/* Mobile Meta Data (Visible only on small screens) */}
                                <span className="sm:hidden text-xs text-slate-400 dark:text-slate-500">
                                  {file.isFolder ? 'Folder' : `${file.lastUpdated} • ${formatSize(file.size)}`}
                                </span>
                              </div>
                          </div>

                          {/* List View - Desktop Columns */}
                          <div className="hidden sm:block w-32 text-sm text-slate-500 dark:text-slate-400 truncate">
                            {file.lastUpdated}
                          </div>
                          
                          <div className="hidden sm:block w-24 text-sm text-slate-500 dark:text-slate-400 text-right font-mono">
                            {file.isFolder ? '-' : formatSize(file.size)}
                          </div>

                          {/* Action Icon */}
                          <div className="w-8 flex justify-end">
                            {!file.isFolder ? (
                                <button 
                                  onClick={(e) => isSelectionMode ? toggleSelection(e, file.id) : handleDownload(e, file)} 
                                  className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors z-20"
                                >
                                  {isSelectionMode ? null : <Download className="w-4 h-4" />}
                                </button>
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
      </main>

      {/* FLOATING ACTION BAR FOR MULTI-SELECT DOWNLOAD */}
      {selectedFileIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 animate-fade-in-up border border-slate-700">
           <span className="font-semibold text-sm whitespace-nowrap">{selectedFileIds.size} Selected</span>
           <div className="h-5 w-px bg-slate-700"></div>
           <button 
             onClick={handleBulkDownload}
             className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
           >
             <Download className="w-4 h-4" /> Download All
           </button>
           <button 
             onClick={() => {
               setSelectedFileIds(new Set());
               setIsSelectionMode(false);
             }}
             className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* Scroll to Top Button (Hidden if selection bar is active) */}
      {showScrollTop && selectedFileIds.size === 0 && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-110 z-40 animate-fade-in-up"
          title="Back to Top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      {/* --- PREVIEW MODAL (LIGHTBOX) --- */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <button 
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-white transition-colors z-[60]"
          >
            <X className="w-6 h-6" />
          </button>

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

          {previewFile.mimeType.startsWith('image/') && (
            <div className="absolute top-4 left-4 flex gap-2 z-[60]" onClick={(e) => e.stopPropagation()}>
              <button onClick={zoomIn} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={zoomOut} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors"><ZoomOut className="w-5 h-5" /></button>
              <button onClick={resetZoom} className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-blue-600 transition-colors"><RotateCcw className="w-5 h-5" /></button>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end justify-between pointer-events-none z-[60]">
             <div className="pointer-events-auto">
                <h3 className="text-white font-bold text-lg drop-shadow-md">{previewFile.name}</h3>
                <p className="text-slate-300 text-sm drop-shadow-md">{formatSize(previewFile.size)}</p>
             </div>
             <button 
               onClick={(e) => handleDownload(e, previewFile)}
               className="pointer-events-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50"
             >
               <Download className="w-5 h-5" /> Download
             </button>
          </div>

          <div 
             ref={imageContainerRef}
             className="w-full h-full flex items-center justify-center p-0 sm:p-4 overflow-hidden relative"
             onClick={(e) => e.stopPropagation()} 
             onWheel={handleWheel}
          >
             {previewFile.mimeType.startsWith('image/') ? (
                previewFile.thumbnailUrl && !failedImages.has(previewFile.id) ? (
                  <>
                    {/* Loading Spinner for Image Transition */}
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                         <div className="bg-black/50 p-4 rounded-full backdrop-blur-md">
                           <Loader2 className="w-8 h-8 text-white animate-spin" />
                         </div>
                      </div>
                    )}
                    
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
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => handleImageError(previewFile.id)}
                        className={`max-w-full max-h-full object-contain transition-all duration-200 ease-out select-none ${isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        draggable={false}
                        style={{
                          transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`,
                          cursor: transform.scale > 1 ? 'grab' : 'default'
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-white flex flex-col items-center">
                    <ImageIcon className="w-20 h-20 text-slate-600 mb-4" />
                    <p>Preview not available</p>
                  </div>
                )
             ) : (
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