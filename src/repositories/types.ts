import type {
  AppNotification, Campaign, DocumentItem, DocumentKind, EmailMessage, Lead, Sequence,
  SequenceStep, Settings, Template,
} from '@/types';

export type LeadInput = Omit<Lead, 'id' | 'createdAt'>;
export type LeadPatch = Partial<LeadInput>;
export type CampaignInput = {
  name: string;
  leadIds: string[];
  templateId?: string;
  subject: string;
  body: string;
  attachmentIds: string[];
  /** ISO string to schedule, or null to send as soon as the backend can. */
  scheduledAt: string | null;
};
export type CampaignAction = 'pause' | 'resume' | 'cancel';
export type TemplateInput = { name: string; subject: string; body: string };
export type SequenceInput = { name: string; steps: SequenceStep[]; stopOnReply: boolean; stopOnClosedStatus?: boolean };
export type UploadInput = { uri: string; name: string; mimeType: string; size?: number; kind?: DocumentKind };
export type EnrollmentResult = {
  sequence: Sequence;
  enrolled: string[];
  skipped: { leadId: string; reason: string }[];
};

export interface Repository {
  health(): Promise<{ ok: boolean; mode?: string }>;
  auth: { me(): Promise<{ authenticated: boolean; email?: string }> };
  leads: {
    list(): Promise<Lead[]>;
    get(id: string): Promise<Lead>;
    create(input: LeadInput): Promise<Lead>;
    update(id: string, patch: LeadPatch): Promise<Lead>;
    remove(id: string): Promise<void>;
    importMany(leads: LeadInput[]): Promise<{ created: number; skipped: number }>;
    exportCsv(): Promise<string>;
  };
  campaigns: {
    list(): Promise<Campaign[]>;
    get(id: string): Promise<Campaign>;
    create(input: CampaignInput): Promise<Campaign>;
    act(id: string, action: CampaignAction): Promise<Campaign>;
  };
  templates: {
    list(): Promise<Template[]>;
    create(input: TemplateInput): Promise<Template>;
    update(id: string, input: TemplateInput): Promise<Template>;
    remove(id: string): Promise<void>;
  };
  sequences: {
    list(): Promise<Sequence[]>;
    get(id: string): Promise<Sequence>;
    create(input: SequenceInput): Promise<Sequence>;
    update(id: string, input: SequenceInput): Promise<Sequence>;
    remove(id: string): Promise<void>;
    setStatus(id: string, status: 'active' | 'paused'): Promise<Sequence>;
    setEnrollment(id: string, leadIds: string[]): Promise<EnrollmentResult>;
  };
  documents: {
    list(): Promise<DocumentItem[]>;
    upload(input: UploadInput): Promise<DocumentItem>;
    remove(id: string): Promise<void>;
  };
  messages: {
    list(params?: { leadId?: string }): Promise<EmailMessage[]>;
    thread(threadId: string): Promise<EmailMessage[]>;
    sync(): Promise<{ mode: string; inspected: number; stored: number; replies: number; bounces: number }>;
    markRead(id: string): Promise<EmailMessage>;
  };
  notifications: {
    list(): Promise<AppNotification[]>;
    markRead(id: string): Promise<void>;
    markAllRead(): Promise<void>;
  };
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
    /** Returns the backend-generated OAuth URL. The app only opens it in the browser. */
    connectGmail(): Promise<{ authUrl: string }>;
    disconnectGmail(): Promise<Settings>;
  };
}
