import { Shield, Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
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
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Operations Control</p>
              <p className="text-[10px] text-slate-500 font-mono">ID: OPS-7721</p>
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
