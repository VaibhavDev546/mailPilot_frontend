import type { CampaignStatus, LeadStatus } from '@/types';

export const colors = {
  bg: '#020617',
  card: '#0f172a',
  cardAlt: '#1e293b',
  border: '#1e293b',
  borderStrong: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  faint: '#64748b',
  accent: '#6366f1',
  accentLight: '#a5b4fc',
  accentBg: '#1e1b4b',
  success: '#10b981',
  successBg: '#052e2b',
  warning: '#f59e0b',
  warningBg: '#3a2606',
  error: '#f43f5e',
  errorBg: '#3b0a17',
};

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Interview', 'Rejected', 'Hired', 'Archived'];
export const CLOSED_STATUSES: LeadStatus[] = ['Rejected', 'Hired', 'Archived'];

export const leadStatusColor: Record<LeadStatus, string> = {
  New: '#6366f1',
  Contacted: '#38bdf8',
  Replied: '#10b981',
  Interview: '#a78bfa',
  Rejected: '#f43f5e',
  Hired: '#22c55e',
  Archived: '#64748b',
};

export const campaignStatusColor: Record<CampaignStatus, string> = {
  draft: '#64748b',
  scheduled: '#38bdf8',
  queued: '#f59e0b',
  sending: '#6366f1',
  completed: '#10b981',
  paused: '#f59e0b',
  cancelled: '#64748b',
  failed: '#f43f5e',
};

export const TEMPLATE_VARIABLES = ['name', 'firstName', 'email', 'companyName', 'companyWebsite', 'jobTitle', 'jobUrl', 'linkedInUrl', 'senderName'] as const;

export const DATA_SOURCE: 'mock' | 'api' = process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** Created only when the user taps "Add starter templates". Never seeded automatically. */
export const STARTER_TEMPLATES = [
  {
    name: 'Initial job enquiry',
    subject: 'Enquiry: {{jobTitle}} at {{companyName}}',
    body: 'Hi {{firstName}},\n\nI came across the {{jobTitle}} opening at {{companyName}} ({{jobUrl}}) and would love to be considered. My resume is attached for your review.\n\nThanks for your time,\n{{senderName}}',
  },
  {
    name: 'Follow-up',
    subject: 'Re: Enquiry: {{jobTitle}} at {{companyName}}',
    body: "Hi {{firstName}},\n\nJust following up on my earlier note about the {{jobTitle}} role at {{companyName}}. I'd be glad to share anything else that would help.\n\nBest,\n{{senderName}}",
  },
  {
    name: 'Final follow-up',
    subject: 'Closing the loop: {{jobTitle}} at {{companyName}}',
    body: "Hi {{firstName}},\n\nI wanted to check in one last time about the {{jobTitle}} role at {{companyName}}. If the position is filled or not a fit, no problem at all, and I'd appreciate being kept in mind for future openings.\n\nThank you,\n{{senderName}}",
  },
];
