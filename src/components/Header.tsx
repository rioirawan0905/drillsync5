import { useState } from 'react';
import { Shield, Bell, LogOut, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Handover } from '../types';
import { cn } from '../lib/utils';

interface HeaderProps {
  onLogout: () => void;
  recentHandovers?: Handover[];
}

export function Header({ onLogout, recentHandovers = [] }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg text-white">
            <Shield size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">ShiftBridge</span>
          <div className="h-4 w-[1px] bg-slate-200 mx-2" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Ops Portal v1.0</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative cursor-pointer"
            >
              <Bell size={20} />
              {recentHandovers.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
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
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{recentHandovers.length}</span>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {recentHandovers.length === 0 ? (
                        <div className="p-8 text-center">
                          <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs text-slate-400">No recent notifications</p>
                        </div>
                      ) : (
                        recentHandovers.slice(0, 5).map((h) => (
                          <div key={h.id} className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                            <p className="text-xs font-bold text-slate-900 mb-0.5">{h.projectName}</p>
                            <p className="text-[10px] text-slate-500 mb-2 truncate">
                              New handover submitted by {h.outgoingName}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 font-mono uppercase">
                                {format(new Date(h.timestamp), 'HH:mm dd MMM')}
                              </span>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                h.status === 'urgent' ? "bg-red-500" : h.status === 'delay' ? "bg-amber-500" : "bg-blue-500"
                              )} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="px-4 py-2 bg-slate-50 mt-2">
                      <button 
                        className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-1 flex items-center justify-center gap-1"
                        onClick={() => setShowNotifications(false)}
                      >
                        View All Activity <ArrowRight size={10} />
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Operations Control</p>
              <button 
                onClick={onLogout}
                className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5 transition-colors"
              >
                <LogOut size={10} />
                Log Out
              </button>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
              OC
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
