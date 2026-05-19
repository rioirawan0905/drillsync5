import { useState } from 'react';
import { Search, Filter, ArrowUpRight, Clock, MapPin, User, ChevronRight, AlertCircle, FileText } from 'lucide-react';
import { Handover } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface HandoverDashboardProps {
  handovers: Handover[];
}

export function HandoverDashboard({ handovers }: HandoverDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);

  const filteredHandovers = handovers.filter(h => 
    h.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.outgoingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.incomingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: Handover['status'] }) => {
    const styles = {
      routine: "bg-blue-50 text-blue-700 border-blue-100",
      urgent: "bg-red-50 text-red-700 border-red-100",
      delay: "bg-amber-50 text-amber-700 border-amber-100"
    };
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[status])}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by project, personnel, or location..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {/* Main Grid / Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Column */}
        <div className="lg:col-span-2 space-y-4">
          {filteredHandovers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-slate-300" size={32} />
              </div>
              <h3 className="text-slate-900 font-bold">No Records Found</h3>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your search or submit a new handover.</p>
            </div>
          ) : (
            filteredHandovers.map((handover) => (
              <motion.div
                key={handover.id}
                layoutId={handover.id}
                onClick={() => setSelectedHandover(handover)}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer bg-white flex items-center justify-between group",
                  selectedHandover?.id === handover.id ? "border-slate-900 shadow-lg ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                    handover.status === 'urgent' ? "bg-red-500" : handover.status === 'delay' ? "bg-amber-500" : "bg-slate-900"
                  )}>
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-slate-900">{handover.projectName}</h4>
                      <StatusBadge status={handover.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {handover.outgoingName} → {handover.incomingName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {handover.location}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-4">
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">{format(new Date(handover.timestamp), 'MMM dd')}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{format(new Date(handover.timestamp), 'HH:mm')}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Details Column */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedHandover ? (
              <motion.div
                key={selectedHandover.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-8"
              >
                <div className="p-6 bg-slate-900 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge status={selectedHandover.status} />
                    <button 
                      onClick={() => setSelectedHandover(null)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <h3 className="text-xl font-bold">{selectedHandover.projectName}</h3>
                  <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
                    <MapPin size={14} />
                    {selectedHandover.location}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Outgoing</p>
                      <p className="text-sm font-bold text-slate-900">{selectedHandover.outgoingName}</p>
                      <p className="text-xs text-slate-500">{selectedHandover.outgoingRole}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Incoming</p>
                      <p className="text-sm font-bold text-slate-900">{selectedHandover.incomingName}</p>
                      <p className="text-xs text-slate-500">Notified via Email</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={12} /> Handover Brief
                    </h5>
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">
                      {selectedHandover.notes}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <ArrowUpRight size={12} /> Pending Action Items
                    </h5>
                    <div className="space-y-2">
                      {selectedHandover.actionItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-slate-500">{i + 1}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase">
                    <Clock size={12} />
                    Submitted at {format(new Date(selectedHandover.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-12 text-center h-[400px] flex flex-col items-center justify-center sticky top-8">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <AlertCircle className="text-slate-300" size={24} />
                </div>
                <p className="text-slate-400 text-sm font-medium">Select a handover record to view full operational details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
