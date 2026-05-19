import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpRight, Clock, MapPin, User, ChevronRight, AlertCircle, FileText, BarChart3, PieChart as PieChartIcon, Activity, Target, Edit, Trash2 } from 'lucide-react';
import { Handover, HandoverStatus } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

interface HandoverDashboardProps {
  handovers: Handover[];
  onEdit?: (handover: Handover) => void;
  onDelete?: (id: string) => void;
}

export function HandoverDashboard({ handovers, onEdit, onDelete }: HandoverDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredHandovers = handovers.filter(h => {
    const s = searchTerm.toLowerCase();
    return (
      (h.projectName || '').toLowerCase().includes(s) ||
      (h.outgoingName || '').toLowerCase().includes(s) ||
      (h.incomingName || '').toLowerCase().includes(s) ||
      (h.location || '').toLowerCase().includes(s)
    );
  });

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = handovers.length;
    const urgent = handovers.filter(h => h.status === 'urgent').length;
    const delay = handovers.filter(h => h.status === 'delay').length;
    const actionItemsCount = handovers.reduce((acc, h) => acc + h.actionItems.length, 0);

    // Status distribution data
    const statusData = [
      { name: 'Routine', value: handovers.filter(h => h.status === 'routine').length, color: '#0F172A' },
      { name: 'Urgent', value: urgent, color: '#EF4444' },
      { name: 'Delay', value: delay, color: '#F59E0B' },
    ].filter(d => d.value > 0);

    // Personnel distribution data
    const personCounts: Record<string, number> = {};
    handovers.forEach(h => {
      const name = h.outgoingName || 'Unknown';
      personCounts[name] = (personCounts[name] || 0) + 1;
    });
    const personnelData = Object.entries(personCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { total, urgent, delay, actionItemsCount, statusData, personnelData };
  }, [handovers]);

  const StatusBadge = ({ status }: { status: Handover['status'] }) => {
    const styles = {
      routine: "bg-blue-50 text-blue-700 border-blue-100",
      urgent: "bg-red-50 text-red-700 border-red-100",
      delay: "bg-amber-50 text-amber-700 border-amber-100"
    };
    
    const currentStyle = styles[status] || styles.routine;
    
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", currentStyle)}>
        {status || 'routine'}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Handovers', value: metrics.total, icon: FileText, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Urgent Issues', value: metrics.urgent, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Delay Alerts', value: metrics.delay, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Action Items', value: metrics.actionItemsCount, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
              <h3 className={cn("text-2xl font-black mt-1", m.color)}>{m.value}</h3>
            </div>
            <div className={cn("p-3 rounded-xl", m.bg, m.color)}>
              <m.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Row */}
      {handovers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieChartIcon className="text-slate-400" size={18} />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Status Distribution</h3>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.statusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-slate-400" size={18} />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Handovers by Personnel</h3>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.personnelData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#0F172A" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search report archives..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0",
                    handover.status === 'urgent' ? "bg-red-500" : handover.status === 'delay' ? "bg-amber-500" : "bg-slate-900"
                  )}>
                    <ArrowUpRight size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate">{handover.projectName}</h4>
                      <StatusBadge status={handover.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] sm:text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <User size={10} /> {handover.outgoingName} → {handover.incomingName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {handover.location}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-2 sm:gap-4">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-900 tabular-nums">
                    {format(new Date(handover.timestamp), 'MMM dd')}
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase font-normal">{format(new Date(handover.timestamp), 'HH:mm')}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors flex-shrink-0" />
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
                    <div className="flex items-center gap-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(selectedHandover)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg border border-white/5"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <div className="relative">
                          {isDeleting ? (
                            <div className="flex items-center gap-2 bg-red-600 rounded-lg p-1 animate-pulse">
                              <button 
                                onClick={() => {
                                  onDelete(selectedHandover.id);
                                  setSelectedHandover(null);
                                  setIsDeleting(false);
                                }}
                                className="text-[10px] font-black uppercase px-2 py-1 hover:bg-white/10 rounded"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setIsDeleting(false)}
                                className="text-[10px] uppercase px-2 py-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setIsDeleting(true)}
                              className="text-white/40 hover:text-red-400 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedHandover(null);
                          setIsDeleting(false);
                        }}
                        className="text-white/60 hover:text-white transition-colors ml-2"
                      >
                        Close
                      </button>
                    </div>
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
                       <ArrowUpRight size={12} /> Action Items & Tasks
                    </h5>
                    <div className="space-y-2">
                       {selectedHandover.actionItems.map((item, i) => (
                        <div key={item.id || i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900">{item.task}</p>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                              item.status === 'Done' ? "bg-green-50 text-green-700 border-green-100" :
                              item.status === 'In Progress' ? "bg-blue-50 text-blue-700 border-blue-100" :
                              "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                              {item.status}
                            </span>
                          </div>
                          {item.remarks && (
                            <p className="text-[11px] text-slate-500 italic leading-relaxed pl-3 border-l-2 border-slate-100">
                              {item.remarks}
                            </p>
                          )}
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
