export type HandoverStatus = 'routine' | 'urgent' | 'delay';

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
  actionItems: string[];
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
  actionItems: string[];
}
