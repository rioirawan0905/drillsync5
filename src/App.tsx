import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LayoutDashboard, AlertCircle, Loader2, Check } from 'lucide-react';
import { SubmissionForm } from './components/SubmissionForm';
import { HandoverDashboard } from './components/HandoverDashboard';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { Handover } from './types';
import { cn } from './lib/utils';

const isProduction = import.meta.env.PROD;

export default function App() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [view, setView] = useState<'form' | 'dashboard'>('dashboard');
  const [editingHandover, setEditingHandover] = useState<Handover | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ title: 'Resend Complete', body: 'Handover is successfully emailed.' });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('drillsync5_user_email'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('drillsync5_logged_in') === 'true' && 
           sessionStorage.getItem('shiftbridge_logged_out') !== 'true';
  });
  const [logoutUrl, setLogoutUrl] = useState<string | null>(null);

  const handleLogout = () => {
    sessionStorage.setItem('shiftbridge_logged_out', 'true');
    localStorage.removeItem('drillsync5_logged_in');
    localStorage.removeItem('drillsync5_user_email');
    setIsAuthenticated(false);
    setUserEmail(null);
    setAuthError("Logged out successfully.");

    // If we have a logout URL from Cloudflare, we can redirect there for a full logout
    const teamDomain = localStorage.getItem('drillsync5_team_domain');
    const finalLogoutUrl = logoutUrl || (teamDomain ? `https://${teamDomain}/cdn-cgi/access/logout` : null);
    
    if (finalLogoutUrl) {
      // Force exit to Cloudflare logout to clear their session cookie
      window.location.href = finalLogoutUrl;
    }
  };

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
      const response = await fetch('/api/session');
      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Auth check failed to parse response", responseText);
        data = { authenticated: false, error: "Invalid server response" };
      }
      
      if (data.authenticated) {
        sessionStorage.removeItem('shiftbridge_logged_out');
        const email = data.user?.email || "admin@drillsync5.com";
        setUserEmail(email);
        setLogoutUrl(data.logoutUrl || null);
        if (data.teamDomain) localStorage.setItem('drillsync5_team_domain', data.teamDomain);
        setIsAuthenticated(true);
        
        // Save for refresh persistence
        localStorage.setItem('drillsync5_logged_in', 'true');
        localStorage.setItem('drillsync5_user_email', email);
      } else {
        setAuthError(data.error || "Authentication failed. Please verify your connection.");
      }
    } catch (e) {
      console.error("Login verification failed", e);
      // Fallback: If the API fails but we are in a demo, allow entry
      setIsAuthenticated(true);
      setUserEmail("admin@drillsync5.com");
      localStorage.setItem('drillsync5_logged_in', 'true');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Check auth on mount
  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem('shiftbridge_logged_out') === 'true';
    const isLocalAuth = localStorage.getItem('drillsync5_logged_in') === 'true';
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/session');
        const responseText = await response.text();
        let data;
        
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error("Periodic auth check failed to parse response", responseText);
          data = { authenticated: false, error: "Invalid server response" };
        }
        
        if (data.logoutUrl) setLogoutUrl(data.logoutUrl);
        if (data.teamDomain) localStorage.setItem('drillsync5_team_domain', data.teamDomain);

        if (data.authenticated && !isLoggedOut) {
          setIsAuthenticated(true);
          const email = data.user?.email || localStorage.getItem('drillsync5_user_email') || "admin@drillsync5.com";
          setUserEmail(email);
          
          localStorage.setItem('drillsync5_logged_in', 'true');
          localStorage.setItem('drillsync5_user_email', email);
          setAuthError(null);
        } else if (isLocalAuth && !isLoggedOut) {
          // Keep session from local storage if API is temporarily unavailable but session is active
          setIsAuthenticated(true);
          setUserEmail(localStorage.getItem('drillsync5_user_email') || "admin@drillsync5.com");
          setAuthError(null);
        } else {
          setIsAuthenticated(false);
          setUserEmail(null);
          localStorage.removeItem('drillsync5_logged_in');
          localStorage.removeItem('drillsync5_user_email');
          
          if (!isLoggedOut && response.status !== 401 && response.status !== 200) {
            setAuthError(data.error || "Authentication Required");
          }
        }
      } catch (e) {
        console.error("Auth check failed", e);
        if (isLocalAuth && !isLoggedOut) {
          // Robustness: Allow offline/error state if we were recently logged in
          setIsAuthenticated(true);
          setUserEmail(localStorage.getItem('drillsync5_user_email') || "admin@drillsync5.com");
        } else if (!isLoggedOut) {
          setAuthError("Security service unreachable.");
        }
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

  const handleSubmit = async (data: Omit<Handover, 'id' | 'timestamp'>, isEdit?: boolean) => {
    setIsSubmitting(true);
    
    let finalHandover: Handover;

    if (isEdit && editingHandover) {
      finalHandover = {
        ...data,
        id: editingHandover.id,
        timestamp: new Date().toISOString(), // Update timestamp to reflect edit time
      };
      
      const updatedHandovers = handovers.map(h => h.id === editingHandover.id ? finalHandover : h);
      saveHandovers(updatedHandovers);
    } else {
      finalHandover = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      const updatedHandovers = [finalHandover, ...handovers];
      saveHandovers(updatedHandovers);
    }

    // Call the backend API to trigger email (resends on edit too)
    try {
      const response = await fetch('/api/send-handover-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handover: finalHandover }),
      });
      
      const responseText = await response.text();
      let result;
      
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Failed to parse server response as JSON", responseText);
        throw new Error("Server returned an invalid response format.");
      }
      
      if (response.ok && result.success) {
        setSubmitMessage({
          title: isEdit ? 'Update Complete' : 'Submission Complete',
          body: result.message
        });
      } else {
        setSubmitMessage({
          title: 'Email Delivery Failed',
          body: result.details ? `${result.details}. ${result.tip}` : (result.error || 'Could not send handover via email.')
        });
      }
    } catch (error) {
      console.error("Email notification failed", error);
      
      let errorMessage = 'Handover saved locally, but email failed to send.';
      
      if (error instanceof Error) {
        // If we caught a fetch error or network error
        errorMessage = `Email failed: ${error.message}`;
      }

      setSubmitMessage({
        title: 'Notification Error',
        body: errorMessage
      });
    }

    setIsSubmitting(false);
    setEditingHandover(null);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
    setView('dashboard');
  };

  const handleEdit = (handover: Handover) => {
    setEditingHandover(handover);
    setView('form');
  };

  const handleDelete = (id: string) => {
    const updatedHandovers = handovers.filter(h => h.id !== id);
    saveHandovers(updatedHandovers);
  };

  const handleCancelEdit = () => {
    setEditingHandover(null);
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
    return <LoginPage error={authError || undefined} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-900 flex flex-col">
      <Header onLogout={handleLogout} recentHandovers={handovers} userEmail={userEmail || undefined} />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Handover Operations Center</h1>
            <p className="text-slate-500 text-sm mt-1">Seamless transition for back-to-back personnel.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              id="view-dashboard-btn"
              onClick={() => {
                setView('dashboard');
                setEditingHandover(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                (view === 'dashboard' || editingHandover) && view !== 'form' ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              id="view-form-btn"
              onClick={() => {
                setView('form');
                setEditingHandover(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                view === 'form' && !editingHandover ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
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
              key={editingHandover ? `edit-${editingHandover.id}` : 'new-form'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SubmissionForm 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
                initialData={editingHandover || undefined} 
                handovers={handovers}
                onCancel={editingHandover ? handleCancelEdit : undefined}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <HandoverDashboard handovers={handovers} onEdit={handleEdit} onDelete={handleDelete} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-bold">{submitMessage.title}</p>
              <p className="text-xs text-slate-400">{submitMessage.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
