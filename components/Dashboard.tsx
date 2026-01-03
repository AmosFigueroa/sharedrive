import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DriveFile, FolderContent, ViewMode, ChatMessage } from '../types';
import { getFolderContents } from '../services/apiService';
import { EMPTY_STATE_IMAGE } from '../constants';
import { 
  Folder, FileText, Image as ImageIcon, Video, FileSpreadsheet, 
  Download, Search, Grid, List, ChevronRight, LogOut, RefreshCw, 
  Sparkles, Bot, Send, X, Loader2, Home, AlertCircle, FolderOpen
} from 'lucide-react';
import { DEFAULT_ROOT_FOLDER_ID } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  token: string;
  userEmail: string;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ token, userEmail, onLogout }) => {
  // Drive State
  const [currentFolder, setCurrentFolder] = useState<string>(DEFAULT_ROOT_FOLDER_ID);
  const [folderData, setFolderData] = useState<FolderContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [emptyImgError, setEmptyImgError] = useState(false);
  
  // AI State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (folderId: string) => {
    setLoading(true);
    setSearchQuery('');
    setError(null);
    setEmptyImgError(false); // Reset error state on new fetch
    
    const res = await getFolderContents(folderId, token);
    
    if (res.success && res.data) {
      setFolderData(res.data);
    } else {
      console.error(res.error);
      setError(res.error || "Failed to load folder contents. Please check your permissions.");
      setFolderData(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData(currentFolder);
  }, [currentFolder, fetchData]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, showAiPanel]);

  // --- AI LOGIC ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: inputMessage, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsAiThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare context from current folder files
      const fileContext = folderData?.files.map(f => 
        `- ${f.name} (${f.isFolder ? 'Folder' : f.mimeType})`
      ).join('\n') || "No files in current view.";

      const prompt = `
        You are an intelligent assistant for a file sharing system.
        The user is currently viewing a folder named "${folderData?.name || 'Unknown'}".
        
        Here is the list of files in this folder:
        ${fileContext}
        
        User Question: "${userMsg.text}"
        
        Answer concisely. If the user asks for a file, check if it exists in the list above.
        If the user asks to summarize, describe the types of files available.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiMsg: ChatMessage = { 
        role: 'model', 
        text: response.text || "I couldn't generate a response.", 
        timestamp: Date.now() 
      };
      setChatMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'model', 
        text: "Sorry, I encountered an error connecting to the AI service.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- UI HELPERS ---
  const getFileIcon = (mimeType: string, className: string = "w-10 h-10") => {
    if (mimeType.includes('folder')) return <Folder className={`${className} text-blue-400`} />;
    if (mimeType.includes('image')) return <ImageIcon className={`${className} text-purple-400`} />;
    if (mimeType.includes('video')) return <Video className={`${className} text-pink-400`} />;
    if (mimeType.includes('pdf')) return <FileText className={`${className} text-red-400`} />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className={`${className} text-green-500`} />;
    return <FileText className={`${className} text-slate-400`} />;
  };

  const filteredFiles = folderData?.files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDownload = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    window.open(file.downloadUrl, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      
      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showAiPanel ? 'mr-0 lg:mr-80' : ''}`}>
        
        {/* Header */}
        <header className="glass z-20 border-b border-slate-700/50 flex-shrink-0">
          <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Folder className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight hidden sm:block">DriveShare Pro</span>
            </div>

            <div className="flex-1 max-w-xl mx-4 sm:mx-8">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..." 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-200 transition-all placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                onClick={() => setShowAiPanel(!showAiPanel)}
                className={`p-2 rounded-lg transition-all ${showAiPanel ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title="AI Assistant"
               >
                 <Sparkles className="w-5 h-5" />
               </button>
               <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
               <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Logout">
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          </div>
        </header>

        {/* Toolbar & Breadcrumbs */}
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/50 border-b border-white/5">
          <nav className="flex items-center text-sm text-slate-400 overflow-x-auto whitespace-nowrap w-full sm:w-auto scrollbar-hide">
            {folderData?.path.map((p, idx) => (
              <React.Fragment key={p.id}>
                {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0 text-slate-600" />}
                <button 
                  onClick={() => setCurrentFolder(p.id)}
                  className={`hover:text-blue-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 ${idx === folderData.path.length - 1 ? 'text-white font-medium bg-slate-800' : ''}`}
                >
                  {p.id === 'root' ? <Home className="w-3 h-3" /> : null}
                  {p.name}
                </button>
              </React.Fragment>
            ))}
            {!folderData && !loading && (
              <span className="text-slate-500">Error loading path</span>
            )}
          </nav>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button onClick={() => fetchData(currentFolder)} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button 
              onClick={() => setViewMode(ViewMode.GRID)} 
              className={`p-1.5 rounded transition-colors ${viewMode === ViewMode.GRID ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.LIST)} 
              className={`p-1.5 rounded transition-colors ${viewMode === ViewMode.LIST ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Syncing secure folder...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl flex flex-col items-center text-center max-w-md">
                <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                <h3 className="text-lg font-semibold text-red-200">Unable to Access Folder</h3>
                <p className="text-sm mt-2">{error}</p>
                <button 
                  onClick={() => fetchData(DEFAULT_ROOT_FOLDER_ID)} 
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
                >
                  Try Resetting to Home
                </button>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center m-4">
               {/* 3D Illustration Empty State with Fallback */}
               {emptyImgError ? (
                  <div className="relative w-48 h-48 flex items-center justify-center bg-slate-800/50 rounded-full mb-6 ring-4 ring-slate-800 shadow-xl">
                    <FolderOpen className="w-24 h-24 text-slate-600" />
                    <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-2 shadow-sm">
                        <div className="bg-slate-700 rounded-full p-2">
                           <X className="w-8 h-8 text-slate-500" />
                        </div>
                    </div>
                  </div>
               ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/10 blur-[50px] rounded-full transform scale-75 animate-pulse"></div>
                    <img 
                      src={EMPTY_STATE_IMAGE} 
                      alt="Empty Folder" 
                      onError={() => setEmptyImgError(true)}
                      className="relative w-64 h-64 object-contain animate-float drop-shadow-2xl opacity-90"
                    />
                  </div>
               )}

               <h3 className="text-xl font-bold text-white mt-6">Folder is Empty</h3>
               <p className="text-slate-400 mt-2 max-w-sm text-center">There are no files to display in this folder.</p>
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
                  onClick={() => file.isFolder ? setCurrentFolder(file.id) : setSelectedFile(file)}
                  className={`
                    group relative border border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/60 
                    hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/10
                    transition-all duration-200 cursor-pointer overflow-hidden
                    ${viewMode === ViewMode.GRID 
                      ? 'rounded-2xl p-4 flex flex-col items-center text-center aspect-[4/5] justify-between' 
                      : 'rounded-xl p-3 flex items-center justify-between'
                    }
                  `}
                >
                   {viewMode === ViewMode.GRID ? (
                     <>
                       <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden rounded-xl bg-slate-900/50 mb-3">
                         {file.thumbnailUrl ? (
                           <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-105 duration-500" />
                         ) : (
                           <div className="transform group-hover:scale-110 transition-transform duration-300">
                             {getFileIcon(file.mimeType, "w-12 h-12")}
                           </div>
                         )}
                         
                         {/* Hover Action Overlay */}
                         {!file.isFolder && (
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={(e) => handleDownload(e, file)}
                                className="p-2 bg-white rounded-full text-blue-600 hover:scale-110 transition-transform shadow-lg"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                           </div>
                         )}
                       </div>
                       <div className="w-full">
                         <p className="text-sm font-medium text-slate-200 truncate w-full group-hover:text-blue-300 transition-colors">{file.name}</p>
                         <p className="text-xs text-slate-500 mt-1">{file.isFolder ? 'Folder' : (file.size / 1024 / 1024).toFixed(2) + ' KB'}</p>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-900/50 flex items-center justify-center flex-shrink-0">
                            {getFileIcon(file.mimeType, "w-6 h-6")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-300 transition-colors">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.lastUpdated}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6 text-slate-400 text-xs">
                          <span className="w-16 text-right">{file.isFolder ? '--' : (file.size / 1024).toFixed(0) + ' KB'}</span>
                          {!file.isFolder && (
                            <button 
                              onClick={(e) => handleDownload(e, file)}
                              className="p-2 bg-slate-900 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                     </>
                   )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* AI SIDE PANEL */}
      <div 
        className={`
          fixed right-0 top-16 bottom-0 w-80 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-10
          transform transition-transform duration-300 flex flex-col
          ${showAiPanel ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
           <div className="flex items-center gap-2 text-blue-400">
             <Bot className="w-5 h-5" />
             <span className="font-semibold">Gemini Assistant</span>
           </div>
           <button onClick={() => setShowAiPanel(false)} className="text-slate-400 hover:text-white">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={chatScrollRef}>
          {chatMessages.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask me about the files in this folder.</p>
              <p className="text-xs mt-2 opacity-70">"What files are here?"<br/>"Find the budget pdf"</p>
            </div>
          )}
          
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`
                  max-w-[85%] rounded-2xl px-4 py-3 text-sm
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isAiThinking && (
             <div className="flex justify-start">
               <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-700">
                 <div className="flex gap-1">
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></span>
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                 </div>
               </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-slate-800/30 border-t border-slate-700/50">
          <div className="relative">
             <input
               type="text"
               value={inputMessage}
               onChange={(e) => setInputMessage(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleSendMessage()}
               placeholder="Ask Gemini..."
               className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
             />
             <button 
               onClick={handleSendMessage}
               disabled={!inputMessage.trim() || isAiThinking}
               className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Send className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-700 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
             
             <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-slate-800 rounded-xl ring-1 ring-slate-700">
                      {getFileIcon(selectedFile.mimeType)}
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-white break-all line-clamp-1">{selectedFile.name}</h3>
                     <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 mt-1">
                       {selectedFile.mimeType.split('/').pop()?.toUpperCase()}
                     </span>
                   </div>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
             </div>

             {selectedFile.thumbnailUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-700 bg-black flex justify-center">
                  <img src={selectedFile.thumbnailUrl} className="max-h-56 object-contain" />
                </div>
             )}

             <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <div>
                   <span className="text-xs uppercase tracking-wider text-slate-500">File Size</span>
                   <p className="text-white font-medium mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div>
                   <span className="text-xs uppercase tracking-wider text-slate-500">Last Modified</span>
                   <p className="text-white font-medium mt-1">{selectedFile.lastUpdated}</p>
                </div>
             </div>

             <div className="flex gap-3">
               <button onClick={() => setSelectedFile(null)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors">
                 Close
               </button>
               <button 
                 onClick={(e) => handleDownload(e, selectedFile)}
                 className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
               >
                 <Download className="w-5 h-5" /> Download File
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;