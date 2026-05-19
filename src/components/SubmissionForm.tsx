import React, { useState } from 'react';
import { Send, Plus, Trash2, ShieldAlert, Target, MapPin, Calendar, Mail, User, ClipboardList } from 'lucide-react';
import { HandoverFormData, HandoverStatus } from '../types';
import { cn } from '../lib/utils';

interface SubmissionFormProps {
  onSubmit: (data: HandoverFormData) => void;
  isSubmitting: boolean;
}

const InputWrapper = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
      <Icon size={12} className="text-slate-400" />
      {label}
    </label>
    {children}
  </div>
);

export function SubmissionForm({ onSubmit, isSubmitting }: SubmissionFormProps) {
  const [formData, setFormData] = useState<HandoverFormData>({
    outgoingName: '',
    outgoingRole: '',
    incomingName: '',
    incomingEmail: '',
    projectName: '',
    location: '',
    shiftDateTime: new Date().toISOString().slice(0, 16),
    status: 'routine',
    notes: '',
    actionItems: [''],
  });

  const handleActionItemChange = (index: number, value: string) => {
    const newItems = [...formData.actionItems];
    newItems[index] = value;
    setFormData({ ...formData, actionItems: newItems });
  };

  const addActionItem = () => {
    setFormData({ ...formData, actionItems: [...formData.actionItems, ''] });
  };

  const removeActionItem = (index: number) => {
    const newItems = formData.actionItems.filter((_, i) => i !== index);
    setFormData({ ...formData, actionItems: newItems.length ? newItems : [''] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      actionItems: formData.actionItems.filter(item => item.trim() !== ''),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Send size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Handover Submission</h2>
            <p className="text-sm text-slate-500">Record shift activities and pending actions.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">
        {/* Personnel Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">01</span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Personnel Details</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InputWrapper label="Outgoing Personnel" icon={User}>
              <input
                required
                type="text"
                placeholder="Full Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.outgoingName}
                onChange={e => setFormData({ ...formData, outgoingName: e.target.value })}
              />
            </InputWrapper>
            <InputWrapper label="Designated Role" icon={ShieldAlert}>
              <input
                required
                type="text"
                placeholder="e.g. Lead Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.outgoingRole}
                onChange={e => setFormData({ ...formData, outgoingRole: e.target.value })}
              />
            </InputWrapper>
            <InputWrapper label="Incoming (Back-to-Back)" icon={User}>
              <input
                required
                type="text"
                placeholder="Relieving Personnel Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.incomingName}
                onChange={e => setFormData({ ...formData, incomingName: e.target.value })}
              />
            </InputWrapper>
            <InputWrapper label="Notification Email" icon={Mail}>
              <input
                required
                type="email"
                placeholder="email@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.incomingEmail}
                onChange={e => setFormData({ ...formData, incomingEmail: e.target.value })}
              />
            </InputWrapper>
          </div>
        </section>

        {/* Project Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">02</span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Operation Context</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InputWrapper label="Project Name" icon={Target}>
              <input
                required
                type="text"
                placeholder="Operations Project"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.projectName}
                onChange={e => setFormData({ ...formData, projectName: e.target.value })}
              />
            </InputWrapper>
            <InputWrapper label="Site Location" icon={MapPin}>
              <input
                required
                type="text"
                placeholder="Building / Rig / Facility"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </InputWrapper>
            <InputWrapper label="Shift Date & Time" icon={Calendar}>
              <input
                required
                type="datetime-local"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                value={formData.shiftDateTime}
                onChange={e => setFormData({ ...formData, shiftDateTime: e.target.value })}
              />
            </InputWrapper>
          </div>
        </section>

        {/* Handover Details */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">03</span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Handover Report</h3>
          </div>

          <div className="space-y-6">
            <InputWrapper label="Operational Status" icon={ShieldAlert}>
              <div className="flex flex-wrap gap-2">
                {(['routine', 'urgent', 'delay'] as HandoverStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                      formData.status === status
                        ? status === 'urgent' ? "bg-red-50 border-red-200 text-red-700 shadow-sm" :
                          status === 'delay' ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" :
                          "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </InputWrapper>

            <InputWrapper label="Detailed Notes" icon={ClipboardList}>
              <textarea
                required
                rows={5}
                placeholder="Comprehensive report of shift events, issues encountered, and general updates..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all resize-none font-mono"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </InputWrapper>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                  <Plus size={12} className="text-slate-400" />
                  Action Items / Pending Tasks
                </label>
                <button
                  type="button"
                  onClick={addActionItem}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                {formData.actionItems.map((item, index) => (
                  <div key={index} className="flex gap-2 group">
                    <input
                      type="text"
                      placeholder={`Task #${index + 1}`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                      value={item}
                      onChange={e => handleActionItemChange(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeActionItem(index)}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group-hover:bg-slate-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="pt-8 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={18} className="group-hover:translate-x-1 transition-transform" />
            )}
            Complete & Submit Handover
          </button>
        </div>
      </form>
    </div>
  );
}
