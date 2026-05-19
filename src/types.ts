export type HandoverStatus = 'routine' | 'urgent' | 'delay';
export type ActionItemStatus = 'Pending' | 'In Progress' | 'Done';

export interface ActionItem {
  id: string;
  task: string;
  status: ActionItemStatus;
  remarks?: string;
}

export interface Handover {
  id: string;
  timestamp: string;
  outgoingName: string;
  outgoingRole: string;
  incomingName: string;
  incomingEmail: string[];
  projectName: string;
  location: string;
  shiftDateTime: string;
  status: HandoverStatus;
  notes: string;
  actionItems: ActionItem[];
  ownerEmail: string;
}

export interface HandoverFormData {
  outgoingName: string;
  outgoingRole: string;
  incomingName: string;
  incomingEmail: string[];
  projectName: string;
  location: string;
  shiftDateTime: string;
  status: HandoverStatus;
  notes: string;
  actionItems: ActionItem[];
}
