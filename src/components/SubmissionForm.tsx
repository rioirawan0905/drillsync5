import React, { useState } from 'react';
import { Send, Plus, Trash2, ShieldAlert, Target, MapPin, Calendar, Mail, User, ClipboardList, ChevronDown } from 'lucide-react';
import { Handover, HandoverFormData, HandoverStatus, ActionItem, ActionItemStatus } from '../types';
import { cn } from '../lib/utils';
import { DESIGNATED_ROLES, PERSONNEL_LIST, LOCATIONS, DEFAULT_PROJECT_NAME } from '../constants';

interface SubmissionFormProps {
  onSubmit: (data: HandoverFormData, isEdit?: boolean) => void;
  isSubmitting: boolean;
  initialData?: Handover;
  handovers?: Handover[];
  onCancel?: () => void;
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

export function SubmissionForm({ onSubmit, isSubmitting, initialData, handovers = [], onCancel }: SubmissionFormProps) {
  const [formData, setFormData] = useState<HandoverFormData>({
    outgoingName: initialData?.outgoingName || '',
    outgoingRole: initialData?.outgoingRole || '',
    incomingName: initialData?.incomingName || '',
    incomingEmail: Array.isArray(initialData?.incomingEmail) 
      ? initialData.incomingEmail 
      : (initialData?.incomingEmail ? [initialData.incomingEmail as unknown as string] : []),
    projectName: initialData?.projectName || DEFAULT_PROJECT_NAME,
    location: initialData?.location || '',
    shiftDateTime: initialData?.shiftDateTime || new Date().toISOString().slice(0, 16),
    status: initialData?.status || 'routine',
    notes: initialData?.notes || '',
    actionItems: initialData?.actionItems.length 
      ? initialData.actionItems 
      : [{ id: crypto.randomUUID(), task: '', status: 'Pending', remarks: '' }],
  });

  const handleActionItemChange = (index: number, field: keyof ActionItem, value: any) => {
    const newItems = [...formData.actionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, actionItems: newItems });
  };

  const addActionItem = () => {
    setFormData({ 
      ...formData, 
      actionItems: [...formData.actionItems, { id: crypto.randomUUID(), task: '', status: 'Pending', remarks: '' }] 
    });
  };

  const pullPreviousActionItems = () => {
    if (!handovers.length) return;
    // Get the most recent handover
    const previous = handovers[0];
    // Pull only non-'Done' items or all? User says "pull previous handover especially the tasks/ action items"
    // Usually you want to pull pending tasks. Let's pull all items that are not 'Done'.
    const pendingItems = previous.actionItems
      .filter(item => item.status !== 'Done')
      .map(item => ({
        ...item,
        id: crypto.randomUUID(), // New ID for the new record
      }));

    if (pendingItems.length > 0) {
      // Remove the initial empty item if it exists
      const currentItems = formData.actionItems.filter(item => item.task.trim() !== '');
      setFormData({ 
        ...formData, 
        actionItems: [...currentItems, ...pendingItems] 
      });
    }
  };

  const removeActionItem = (index: number) => {
    const newItems = formData.actionItems.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      actionItems: newItems.length ? newItems : [{ id: crypto.randomUUID(), task: '', status: 'Pending', remarks: '' }] 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      actionItems: formData.actionItems.filter(item => item.task.trim() !== ''),
    }, !!initialData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            {initialData ? <ClipboardList size={20} /> : <Send size={20} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{initialData ? 'Update Handover' : 'Handover Submission'}</h2>
            <p className="text-sm text-slate-500">{initialData ? 'Modify existing record and resend notification.' : 'Record shift activities and pending actions.'}</p>
          </div>
        </div>
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        )}
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
              <div className="relative">
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.outgoingName}
                  onChange={e => {
                    const person = PERSONNEL_LIST.find(p => p.name === e.target.value);
                    setFormData({ 
                      ...formData, 
                      outgoingName: e.target.value,
                    });
                  }}
                >
                  <option value="" disabled>Select Outgoing Personnel</option>
                  {PERSONNEL_LIST.map(p => (
                    <option key={p.email} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </InputWrapper>

            <InputWrapper label="Designated Role" icon={ShieldAlert}>
              <div className="relative">
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.outgoingRole}
                  onChange={e => setFormData({ ...formData, outgoingRole: e.target.value })}
                >
                  <option value="" disabled>Select Role</option>
                  {DESIGNATED_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </InputWrapper>

            <InputWrapper label="Incoming (Back-to-Back)" icon={User}>
              <div className="relative">
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.incomingName}
                  onChange={e => {
                    const person = PERSONNEL_LIST.find(p => p.name === e.target.value);
                    if (person) {
                      setFormData({ 
                        ...formData, 
                        incomingName: person.name,
                        incomingEmail: [person.email]
                      });
                    }
                  }}
                >
                  <option value="" disabled>Select Relieving Personnel</option>
                  {PERSONNEL_LIST.map(p => (
                    <option key={p.email} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </InputWrapper>

            <div className="space-y-4">
              <InputWrapper label="Notification Emails" icon={Mail}>
                <div className="space-y-2">
                  {formData.incomingEmail.map((email, index) => (
                    <div key={index} className="flex gap-2 group">
                      <input
                        required
                        type="email"
                        placeholder="email@company.com"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
                        value={email}
                        onChange={e => {
                          const newEmails = [...formData.incomingEmail];
                          newEmails[index] = e.target.value;
                          setFormData({ ...formData, incomingEmail: newEmails });
                        }}
                      />
                      {formData.incomingEmail.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newEmails = formData.incomingEmail.filter((_, i) => i !== index);
                            setFormData({ ...formData, incomingEmail: newEmails });
                          }}
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, incomingEmail: [...formData.incomingEmail, ''] })}
                    className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 mt-1 ml-1"
                  >
                    <Plus size={14} /> Add Additional Email
                  </button>
                </div>
              </InputWrapper>
            </div>
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
              <div className="relative">
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all appearance-none cursor-pointer"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="" disabled>Select Location</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
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
                  onClick={pullPreviousActionItems}
                  className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 mr-4"
                  disabled={!handovers.length}
                >
                  <ClipboardList size={14} /> Pull Pending Tasks
                </button>
                <button
                  type="button"
                  onClick={addActionItem}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.actionItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 group relative">
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            placeholder="Task description..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                            value={item.task}
                            onChange={e => handleActionItemChange(index, 'task', e.target.value)}
                          />
                          <select
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-3 py-2 sm:py-0 rounded-lg border focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer bg-white",
                              item.status === 'Done' ? "bg-green-50 border-green-200 text-green-700" :
                              item.status === 'In Progress' ? "bg-blue-50 border-blue-200 text-blue-700" :
                              "bg-slate-50 border-slate-200 text-slate-600"
                            )}
                            value={item.status}
                            onChange={e => handleActionItemChange(index, 'status', e.target.value)}
                          >
                            {(['Pending', 'In Progress', 'Done'] as ActionItemStatus[]).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Add remarks or updates..."
                          className="w-full bg-white/50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-500 italic focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                          value={item.remarks || ''}
                          onChange={e => handleActionItemChange(index, 'remarks', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActionItem(index)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all self-start"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
