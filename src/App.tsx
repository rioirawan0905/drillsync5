import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LayoutDashboard, AlertCircle, Loader2, Check, RefreshCw, Key, Activity } from 'lucide-react';
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

  const clearAuthPersistence = () => {
    localStorage.removeItem('drillsync5_logged_in');
    localStorage.removeItem('drillsync5_user_email');
    localStorage.removeItem('drillsync5_team_domain');
    sessionStorage.removeItem('shiftbridge_logged_out');
  };

  const handleLogout = () => {
    // Clear all local session state
    clearAuthPersistence();
    
    // Force Cloudflare session termination and return to the app with a cache buster
    // This effectively forces the user back to the Zero Trust login screen
    const returnUrl = window.location.origin + "/?reauth=" + Date.now();
    window.location.href = "/cdn-cgi/access/logout?returnTo=" + encodeURIComponent(returnUrl);
  };

  const handleAuthenticate = () => {
    // Clear all local state to ensure Cloudflare doesn't get confused by our app's state
    clearAuthPersistence();
    
    // Using a cache-busting reload to trigger the edge interception
    window.location.href = "/?reauth=" + Date.now();
  };

  // Check auth on mount
  useEffect(() => {
    const isLoggedOut = sessionStorage.getItem('shiftbridge_logged_out') === 'true';
    const isLocalAuth = localStorage.getItem('drillsync5_logged_in') === 'true';
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/session', { 
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        const responseText = await response.text();
        let data;
        
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error("Periodic auth check failed to parse response", responseText);
          data = { authenticated: false, error: "Invalid server response" };
        }
        
        if (data.logoutUrl) setLogoutUrl(data.logoutUrl);
        
        // If the server explicitly says we are authenticated, we trust it regardless of local state
        // except for explicit user logouts in the current session
        if (data.authenticated) {
          const email = data.user?.email || localStorage.getItem('drillsync5_user_email') || "admin@drillsync5.com";
          
          localStorage.setItem('drillsync5_logged_in', 'true');
          localStorage.setItem('drillsync5_user_email', email);
          localStorage.setItem('drillsync5_auth_attempts', '0'); 
          
          // Clear any stale logout flag since we are now verified as logged in
          sessionStorage.removeItem('shiftbridge_logged_out');
          
          setUserEmail(email);
          setIsAuthenticated(true);
          setAuthError(null);
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
          
          // Only clear persistence if they are NOT intentionally logged out
          if (!isLoggedOut) {
            localStorage.removeItem('drillsync5_logged_in');
            localStorage.removeItem('drillsync5_user_email');
            
            if (response.status === 401) {
              setAuthError(null); 
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

  // Load handovers from server on mount or when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchHandovers = async () => {
      try {
        const response = await fetch('/api/handovers');
        if (response.ok) {
          const data = await response.json();
          setHandovers(data);
          setAuthError(null);
        } else {
          const errData = await response.json();
          console.error("Database fetch failed", errData);
          setAuthError(errData.details || "Failed to fetch records from database.");
        }
      } catch (error: any) {
        console.error("Failed to fetch handovers", error);
        setAuthError("Network error: Could not connect to the operations server.");
      }
    };

    fetchHandovers();
    
    // Refresh interval every 30 seconds for non-realtime fallback
    const interval = setInterval(fetchHandovers, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSubmit = async (data: Omit<Handover, 'id' | 'timestamp'>, isEdit?: boolean) => {
    if (!userEmail) {
      alert("Authentication identity missing. Please reload.");
      return;
    }

    setIsSubmitting(true);
    
    const id = isEdit && editingHandover ? editingHandover.id : crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const finalHandover: Handover = {
      ...data,
      id,
      timestamp,
      ownerEmail: userEmail
    } as Handover;

    try {
      // Save to Server (which handles Firestore via Admin SDK)
      const saveResponse = await fetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handover: finalHandover }),
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.details || "Failed to save to database server.");
      }

      // Call the backend API to trigger email
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
          result = { error: "Invalid server response" };
        }
        
        if (response.ok && result.success) {
          setSubmitMessage({
            title: isEdit ? 'Update Complete' : 'Submission Complete',
            body: result.message
          });
        } else {
          setSubmitMessage({
            title: 'Email Delivery Failed',
            body: result.details ? `${result.details}. ${result.tip}` : (result.error || 'Saved to DB, but email failed.')
          });
        }
      } catch (error) {
        console.error("Email notification failed", error);
        setSubmitMessage({
          title: 'Database Sync Successful',
          body: 'Handover saved to cloud, but notification email failed to send.'
        });
      }

      // Optimistic update or just refetch
      setIsSubmitting(false);
      setEditingHandover(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      setView('dashboard');

      // Trigger a refresh
      const refreshRes = await fetch('/api/handovers');
      if (refreshRes.ok) setHandovers(await refreshRes.json());

    } catch (error: any) {
      console.error("Submission failed", error);
      alert("Error: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleEdit = (handover: Handover) => {
    setEditingHandover(handover);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/handovers/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setHandovers(prev => prev.filter(h => h.id !== id));
      } else {
        throw new Error("Server failed to delete record.");
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete record.");
    }
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
          <div className="inline-flex items-center gap-2 text-[10px] text-blue-600 font-bold uppercase tracking-widest">
            <Activity size={14} />
            Data Persistence: Google Cloud Firestore (Live)
          </div>
          <p className="mt-2 text-[11px] text-slate-400 max-w-lg mx-auto leading-relaxed">
            Multi-user production environment active. All records are secured by enterprise-grade encryption and access controls.
          </p>
        </div>
      </footer>
    </div>
  );
}
