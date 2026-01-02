
import * as React from 'react';
import { ToastMessage } from '../types';
import { Rocket, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface GlobalUIProps {
  toasts: ToastMessage[];
  isDownloading: boolean;
  progress: number;
  removeToast: (id: string) => void;
}

const GlobalUI: React.FC<GlobalUIProps> = ({ toasts, isDownloading, progress, removeToast }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      
      {/* ROCKET PROGRESS BAR */}
      <div 
        className={`absolute top-0 left-0 w-full h-1 bg-transparent transition-opacity duration-300 ${isDownloading ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="relative w-full h-full">
           {/* The Bar */}
           <div 
             className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
             style={{ width: `${progress}%` }}
           ></div>
           
           {/* The Rocket */}
           <div 
             className="absolute top-0 -mt-3 transition-all duration-200 ease-out"
             style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
           >
              <div className="rocket-shake relative">
                 <Rocket className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] fill-indigo-600 transform rotate-45" />
                 {/* Rocket Fire Trail */}
                 <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full blur-[2px] animate-pulse"></div>
              </div>
           </div>
        </div>
      </div>

      {/* TOASTS CONTAINER */}
      <div className="absolute top-16 right-0 p-4 flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              animate-slide-in flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md
              ${toast.type === 'success' ? 'bg-slate-900/90 border-green-500/30 text-green-100' : ''}
              ${toast.type === 'error' ? 'bg-slate-900/90 border-red-500/30 text-red-100' : ''}
              ${toast.type === 'info' ? 'bg-slate-900/90 border-blue-500/30 text-blue-100' : ''}
            `}
          >
            <div className={`p-2 rounded-full ${
                toast.type === 'success' ? 'bg-green-500/20' : 
                toast.type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'
              }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-70" />
            </button>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default GlobalUI;
