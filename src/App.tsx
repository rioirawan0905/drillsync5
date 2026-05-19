import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LayoutDashboard, AlertCircle, Loader2, Check } from 'lucide-react';
import { SubmissionForm } from './components/SubmissionForm';
import { HandoverDashboard } from './components/HandoverDashboard';
import { Header } from './components/Header';
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
  const [authLoopDetected, setAuthLoopDetected] = useState(false);

  const clearAuthPersistence = () => {
    localStorage.removeItem('drillsync5_logged_in');
    localStorage.removeItem('drillsync5_user_email');
    localStorage.removeItem('drillsync5_team_domain');
    sessionStorage.removeItem('shiftbridge_logged_out');
  };

  const handleLogout = () => {
    sessionStorage.setItem('shiftbridge_logged_out', 'true');
    localStorage.removeItem('drillsync5_logged_in');
    localStorage.removeItem('drillsync5_user_email');
    setIsAuthenticated(false);
    setUserEmail(null);
    setAuthError("Logged out successfully.");

    // EXTREMELY IMPORTANT: To truly log out of Cloudflare, we must redirect to their logout path
    // We use the relative path to ensure we hit the correct organization gateway on this domain
    window.location.href = "/cdn-cgi/access/logout";
  };

  const handleAuthenticate = () => {
    // Check for redirect loops before triggering
    const now = Date.now();
    const lastAuth = parseInt(localStorage.getItem('drillsync5_last_auth_attempt') || '0');
    const authAttempts = parseInt(localStorage.getItem('drillsync5_auth_attempts') || '0');

    if (now - lastAuth < 10000 && authAttempts > 3) {
      setAuthLoopDetected(true);
      clearAuthPersistence();
      return;
    }

    localStorage.setItem('drillsync5_last_auth_attempt', now.toString());
    localStorage.setItem('drillsync5_auth_attempts', (authAttempts + 1).toString());

    // Clear all local state to ensures Cloudflare doesn't get confused by our app's state
    clearAuthPersistence();
    
    // Redirect to the relative Cloudflare logout path on the current domain
    // This forces a re-verification session with the gateway
    window.location.href = "/cdn-cgi/access/logout";
  };

  // Check auth on mount
  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem('shiftbridge_logged_out') === 'true';
    const isLocalAuth = localStorage.getItem('drillsync5_logged_in') === 'true';
    
    // Clear redirect attempts if we successfully loaded the app (meaning we are authenticated)
    if (isLocalAuth && !isLoggedOut) {
      localStorage.setItem('drillsync5_auth_attempts', '0');
    }

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
          localStorage.setItem('drillsync5_auth_attempts', '0'); // Reset attempts on success
        } else if (isLocalAuth && !isLoggedOut) {
          // If we have local auth but the server says no, it's likely an expired session
          // ONLY clear if the server explicitly rejected the JWT (401)
          if (response.status === 401) {
            setIsAuthenticated(false);
            setUserEmail(null);
            localStorage.removeItem('drillsync5_logged_in');
            localStorage.removeItem('drillsync5_user_email');
            setAuthError("Session expired. Please re-authenticate.");
          } else {
            // Server error or other issue? Keep local session for robustness
            setIsAuthenticated(true);
            setUserEmail(localStorage.getItem('drillsync5_user_email') || "admin@drillsync5.com");
          }
        } else {
          setIsAuthenticated(false);
          setUserEmail(null);
          // Only clear persistence if they are NOT intentionally logged out (prevent state confusion)
          if (!isLoggedOut) {
            localStorage.removeItem('drillsync5_logged_in');
            localStorage.removeItem('drillsync5_user_email');
            
            // Only show "Authentication Required" if they didn't just log out
            if (response.status === 401) {
              setAuthError(null); // Keep it clean
              // Automatic Redirect: If we aren't logged in, hit the gateway again
              handleAuthenticate();
            } else if (response.status !== 200) {
              setAuthError(data.error || "Authentication Required");
            }
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

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
        <h1 className="text-xl font-semibold text-slate-800">Verifying Security Session...</h1>
        <p className="text-slate-500 text-sm mt-2">Connecting to Cloudflare Zero Trust gateway.</p>
        
        {authLoopDetected ? (
          <div className="mt-8 max-w-sm">
            <p className="text-red-600 text-sm mb-4">Authentication loop detected. Please clear your cookies and try again.</p>
            <button 
              onClick={() => {
                setAuthLoopDetected(false);
                localStorage.setItem('drillsync5_auth_attempts', '0');
                handleAuthenticate();
              }}
              className="py-2 px-4 bg-slate-900 text-white rounded-lg text-sm font-bold"
            >
              Retry Reset
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAuthenticate}
            className="mt-8 text-blue-600 hover:underline font-medium text-sm"
          >
            Not redirected? Click here to sign in.
          </button>
        )}
      </div>
    );
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
