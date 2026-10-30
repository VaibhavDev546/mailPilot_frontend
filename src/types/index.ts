export type LeadStatus =
  | 'New' | 'Contacted' | 'Replied' | 'Interview' | 'Rejected' | 'Hired' | 'Archived';

export interface Lead {
  id: string;
  recruiterName: string;
  email: string;
  companyName: string;
  companyWebsite?: string;
  jobTitle?: string;
  jobUrl?: string;
  linkedinUrl?: string;
  notes?: string;
  status: LeadStatus;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
  createdAt: string;
}

export type MessageDirection = 'outbound' | 'inbound';
export type MessageStatus = 'queued' | 'sent' | 'failed' | 'bounced' | 'received';

export interface EmailMessage {
  id: string;
  leadId?: string;
  campaignId?: string;
  sequenceId?: string;
  threadId?: string;
  direction: MessageDirection;
  status: MessageStatus;
  subject: string;
  body: string;
  fromEmail: string;
  toEmail: string;
  read: boolean;
  createdAt: string;
}

export interface Template { id: string; name: string; subject: string; body: string; createdAt: string }

export type DocumentKind = 'resume' | 'cover_letter' | 'other';
export interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  kind: DocumentKind;
  createdAt: string;
  /** Temporary local URI. Only set by the mock repository; the backend owns persistent files. */
  localUri?: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'queued' | 'sending' | 'completed' | 'paused' | 'cancelled' | 'failed';
export type RecipientStatus = 'pending' | 'sending' | 'sent' | 'bounced' | 'replied' | 'failed' | 'skipped' | 'cancelled';
export interface CampaignRecipient { leadId: string; status: RecipientStatus; error?: string }
export interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  subject: string;
  body: string;
  attachmentIds: string[];
  status: CampaignStatus;
  scheduledAt?: string | null;
  createdAt: string;
  recipients: CampaignRecipient[];
  recipientCount?: number;
  stats: { sent: number; bounced: number; replied: number };
}

export interface SequenceStep { id: string; templateId: string; delayDays: number }
export type SequenceStatus = 'draft' | 'active' | 'paused' | 'stopped';
export interface SequenceEnrollment {
  id: string;
  leadId: string;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  nextRunAt?: string | null;
}
export interface Sequence {
  id: string;
  name: string;
  status: SequenceStatus;
  steps: SequenceStep[];
  enrolledLeadIds: string[];
  enrollments?: SequenceEnrollment[];
  stopOnReply: boolean;
  stopOnClosedStatus: boolean;
  nextRunAt?: string | null;
  createdAt: string;
}
export interface SequenceExecution {
  id: string;
  sequenceId: string;
  leadId: string;
  stepIndex: number;
  status: 'scheduled' | 'sent' | 'failed' | 'skipped' | 'stopped';
  at: string;
  detail?: string;
}

export type NotificationType =
  | 'follow_up_due' | 'reply_received' | 'campaign_completed' | 'send_failure' | 'sequence_paused'
  | 'campaign_failed' | 'sequence_failed' | 'email_bounced' | 'gmail_disconnected' | 'system';
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  target?: { type: 'lead' | 'campaign' | 'sequence' | 'reply'; id: string };
}

export interface Settings {
  senderName: string;
  signature: string;
  timezone: string;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  sendOnWeekends: boolean;
  defaultFollowUpDays: number;
  dailySendLimit: number;
  sendIntervalSeconds: number;
  gmail: { connected: boolean; email?: string };
}
