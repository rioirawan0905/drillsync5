import { useState } from 'react';
import { Shield, Bell, LogOut, Clock, ArrowRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Handover } from '../types';
import { cn } from '../lib/utils';

interface HeaderProps {
  onLogout: () => void;
  recentHandovers?: Handover[];
  userEmail?: string;
}

export function Header({ onLogout, recentHandovers = [], userEmail }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showFullActivity, setShowFullActivity] = useState(false);

  const unreadCount = recentHandovers.filter(h => !readIds.includes(h.id)).length;

  const handleNotificationClick = (id: string) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg text-white">
            <Shield size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">DrillSync5</span>
          <div className="h-4 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden lg:block">Ops Portal v1.2</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 h-full">
          {userEmail && (
            <div className="hidden sm:flex flex-col items-end mr-2 max-w-[150px]">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Welcome</span>
              <span className="text-[11px] font-semibold text-slate-700 truncate w-full text-right">{userEmail}</span>
            </div>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative cursor-pointer"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">{unreadCount} New</span>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {recentHandovers.length === 0 ? (
                        <div className="p-8 text-center">
                          <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs text-slate-400">No recent notifications</p>
                        </div>
                      ) : (
                        recentHandovers.slice(0, 5).map((h) => (
                          <div 
                            key={h.id} 
                            onClick={() => handleNotificationClick(h.id)}
                            className={cn(
                              "px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer relative",
                              !readIds.includes(h.id) && "bg-blue-50/30"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-slate-900 mb-0.5">{h.projectName}</p>
                                <p className="text-[10px] text-slate-500 mb-1 line-clamp-2">
                                  Handover by {h.outgoingName}
                                </p>
                              </div>
                              {!readIds.includes(h.id) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-slate-400 font-mono uppercase">
                                {format(new Date(h.timestamp), 'HH:mm')}
                              </span>
                              <span className={cn(
                                "w-1 h-1 rounded-full",
                                h.status === 'urgent' ? "bg-red-500" : h.status === 'delay' ? "bg-amber-500" : "bg-blue-500"
                              )} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="px-4 py-2 bg-slate-50">
                      <button 
                        className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-1 flex items-center justify-center gap-1"
                        onClick={() => {
                          setShowNotifications(false);
                          setShowFullActivity(true);
                        }}
                      >
                        View All Activity <ArrowRight size={10} />
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200">
            <div className="text-right hidden xs:block">
              <p className="text-[11px] sm:text-sm font-medium text-slate-900 truncate max-w-[100px]">Ops Control</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
              OC
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-1"
              title="Log Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFullActivity && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowFullActivity(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Operational Activity</h2>
                  <p className="text-xs text-slate-500">History of all shift handovers across the team</p>
                </div>
                <button 
                  onClick={() => setShowFullActivity(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Plus className="rotate-45 text-slate-400" size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {recentHandovers.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm text-slate-400 font-medium">No activity recorded yet.</p>
                  </div>
                ) : (
                  recentHandovers.map((h) => (
                    <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0",
                        h.status === 'urgent' ? "bg-red-500" : h.status === 'delay' ? "bg-amber-500" : "bg-slate-900"
                      )}>
                        <ArrowRight size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{h.projectName}</h4>
                          <span className="text-[9px] font-mono text-slate-400 tabular-nums uppercase">
                            {format(new Date(h.timestamp), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {h.outgoingName} handed over to {h.incomingName} at {h.location}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-white">
                <button 
                  onClick={() => setShowFullActivity(false)}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}

