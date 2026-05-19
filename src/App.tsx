import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LayoutDashboard, AlertCircle, Loader2 } from 'lucide-react';
import { SubmissionForm } from './components/SubmissionForm';
import { HandoverDashboard } from './components/HandoverDashboard';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { Handover } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [view, setView] = useState<'form' | 'dashboard'>('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setIsAuthenticated(false);
          setAuthError(data.error || "Authentication Required");
        }
      } catch (e) {
        console.error("Auth check failed", e);
        setAuthError("Failed to verify security credentials.");
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const saved = localStorage.getItem('shiftbridge_handovers');
    if (saved) {
      try {
        setHandovers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved handovers", e);
      }
    }
  }, [isAuthenticated]);

  const saveHandovers = (newHandovers: Handover[]) => {
    setHandovers(newHandovers);
    localStorage.setItem('shiftbridge_handovers', JSON.stringify(newHandovers));
  };

  const handleSubmit = async (data: Omit<Handover, 'id' | 'timestamp'>) => {
    setIsSubmitting(true);
    const newHandover: Handover = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const updatedHandovers = [newHandover, ...handovers];
    saveHandovers(updatedHandovers);

    // Call the backend API to trigger email
    try {
      await fetch('/api/send-handover-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handover: newHandover }),
      });
    } catch (error) {
      console.error("Email notification failed", error);
    }

    setIsSubmitting(false);
    setView('dashboard');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage error={authError || undefined} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Shift Operations Center</h1>
            <p className="text-slate-500 text-sm mt-1">Seamless transition for back-to-back personnel.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              id="view-dashboard-btn"
              onClick={() => setView('dashboard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                view === 'dashboard' ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              id="view-form-btn"
              onClick={() => setView('form')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                view === 'form' ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Plus size={18} />
              New Handover
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SubmissionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <HandoverDashboard handovers={handovers} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistence Note */}
      <footer id="app-footer" className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
            <AlertCircle size={14} />
            Data Persistence: localStorage (Dev Mode)
          </div>
          <p className="mt-2 text-[11px] text-slate-400 max-w-lg mx-auto leading-relaxed">
            Note: To transition to a multi-user production environment, replace the `localStorage` logic with a 
            database like Firebase Firestore or a custom Node.js/PostgreSQL backend.
          </p>
        </div>
      </footer>
    </div>
  );
}
