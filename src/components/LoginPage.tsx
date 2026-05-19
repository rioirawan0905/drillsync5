import { Shield, Lock, ArrowRight, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  error?: string;
  onLogin: () => void;
}

export function LoginPage({ error, onLogin }: LoginPageProps) {
  const handleLogin = () => {
    // In dev mode, we call onLogin to simulate success.
    // In real production, this would trigger the Cloudflare flow.
    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-8 pt-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-3xl text-white mb-6 shadow-xl shadow-slate-200">
              <Shield size={40} />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">DrillSync5</h1>
            <p className="text-slate-500 text-sm mb-8 font-medium">Handover Management System</p>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Lock size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Zero Trust Access</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This environment is strictly restricted. Access requires authorization via **Cloudflare Zero Trust**.
                Only pre-approved organization emails are permitted to enter.
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-left"
              >
                <XCircle className="text-red-500 flex-shrink-0" size={20} />
                <div>
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Access Denied</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}

            <button
              onClick={handleLogin}
              className="group w-full bg-slate-900 text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200"
            >
              Sign In with Organization Email
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
              Secured by Cloudflare Access Assertion
            </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[11px] text-slate-400 font-medium">
          Problems logging in? contact <span className="text-slate-600 underline">security@org-ops.com</span>
        </p>
      </motion.div>
    </div>
  );
}
