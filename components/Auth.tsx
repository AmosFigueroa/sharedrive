
import * as React from 'react';
import { useState } from 'react';
import { sendOtp, verifyOtp } from '../services/apiService';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface AuthProps {
  onLoginSuccess: (token: string, email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const { showToast } = useUI();
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await sendOtp(email);
    setLoading(false);
    if (res.success) {
      showToast("Verification code sent to email", 'success');
      setStep('OTP');
    } else {
      showToast(res.error || "Error sending OTP", 'error');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await verifyOtp(email, otp);
    setLoading(false);
    if (res.success && res.data) {
      showToast("Login Successful", 'success');
      onLoginSuccess(res.data.token, email);
    } else {
      showToast(res.error || "Invalid OTP", 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
      {/* Overlay: Always dark for the Auth screen aesthetic, or adapt if preferred. Keeping dark for premium feel but glass adapts */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass rounded-2xl shadow-2xl animate-fade-in-up border border-white/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4 ring-1 ring-blue-500/30">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Secure Portal</h1>
          <p className="text-slate-300">Access your shared client documents securely.</p>
        </div>

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all outline-none"
                  placeholder="client@company.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Request Access Code <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center mb-4">
              <span className="text-sm text-slate-400">Code sent to </span>
              <span className="text-sm font-medium text-blue-300">{email}</span>
              <button 
                type="button" 
                onClick={() => setStep('EMAIL')}
                className="block w-full text-xs text-slate-500 hover:text-slate-300 mt-1 underline"
              >
                Change Email
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all outline-none tracking-widest text-lg"
                  placeholder="123456"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Unlock Files"}
            </button>
          </form>
        )}
      </div>
      
      <div className="absolute bottom-6 text-slate-500 text-xs">
        Powered by DriveShare Pro &bull; Secure Encrypted Connection
      </div>
    </div>
  );
};

export default Auth;
