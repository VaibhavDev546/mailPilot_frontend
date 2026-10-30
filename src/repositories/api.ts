import { ApiError, http, httpPage, httpText } from '@/services/http';
import type {
  AppNotification, Campaign, CampaignRecipient, DocumentItem, EmailMessage, Lead, LeadStatus,
  Sequence, SequenceEnrollment, SequenceStatus, SequenceStep, Settings, Template,
} from '@/types';
import type { CampaignInput, Repository } from './types';

type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };
type Page<T> = { data: T[]; meta: PageMeta };
type BackendLead = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  jobTitle: string | null;
  jobUrl: string | null;
  linkedInUrl: string | null;
  notes: string | null;
  status: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
};
type BackendTemplate = { id: string; name: string; category?: string; subject: string; body: string; createdAt: string };
type BackendRecipient = {
  id: string;
  leadId: string;
  sendStatus: string;
  errorMessage: string | null;
  sentAt: string | null;
  bouncedAt: string | null;
  repliedAt: string | null;
};
type BackendCampaign = {
  id: string;
  name: string;
  status: string;
  templateId: string;
  template?: { id: string; name: string; subject?: string; body?: string };
  scheduledAt: string | null;
  createdAt: string;
  attachments?: { id: string; name: string; mimeType: string; sizeBytes: number }[];
  counts?: Record<string, number>;
  recipients?: Page<BackendRecipient> | BackendRecipient[];
};
type BackendSequence = {
  id: string;
  name: string;
  status: string;
  stopOnReply: boolean;
  createdAt: string;
  steps: {
    id: string;
    templateId: string;
    delayMinutes: number;
    template?: { id: string };
  }[];
  enrollments?: { id: string; leadId: string; status: string; nextRunAt: string | null }[];
  enrollmentCounts?: Record<string, number>;
};
type BackendMessage = {
  id: string;
  leadId: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  providerThreadId: string | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  isRead: boolean;
  createdAt: string;
  campaignRecipient?: { campaignId: string } | null;
  enrollment?: { sequenceId: string } | null;
};
type BackendNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedLeadId: string | null;
  relatedCampaignId: string | null;
  readAt: string | null;
  createdAt: string;
};
type BackendSettings = Omit<Settings, 'gmail'>;
type BackendGmailStatus = { status: string; emailAddress: string | null };

const leadStatusToApi: Record<LeadStatus, string> = {
  New: 'NEW',
  Contacted: 'CONTACTED',
  Replied: 'REPLIED',
  Interview: 'INTERVIEWING',
  Rejected: 'REJECTED',
  Hired: 'HIRED',
  Archived: 'ARCHIVED',
};

function leadStatusFromApi(status: string): LeadStatus {
  switch (status) {
    case 'NEW': return 'New';
    case 'CONTACTED': return 'Contacted';
    case 'REPLIED': return 'Replied';
    case 'INTERVIEWING': return 'Interview';
    case 'REJECTED': return 'Rejected';
    case 'HIRED': return 'Hired';
    case 'ARCHIVED': return 'Archived';
    default: throw new ApiError(`The backend returned an unsupported lead status: ${status}.`);
  }
}

const leadFromApi = (lead: BackendLead): Lead => ({
  id: lead.id,
  recruiterName: lead.name,
  email: lead.email,
  companyName: lead.companyName ?? '',
  companyWebsite: lead.companyWebsite ?? undefined,
  jobTitle: lead.jobTitle ?? undefined,
  jobUrl: lead.jobUrl ?? undefined,
  linkedinUrl: lead.linkedInUrl ?? undefined,
  notes: lead.notes ?? undefined,
  status: leadStatusFromApi(lead.status),
  lastContactedAt: lead.lastContactedAt,
  nextFollowUpAt: lead.nextFollowUpAt,
  createdAt: lead.createdAt,
});

function leadToApi(input: Partial<RepositoryLeadInput>) {
  const body: Record<string, unknown> = {};
  if (input.recruiterName !== undefined) body.name = input.recruiterName;
  if (input.email !== undefined) body.email = input.email;
  if (input.companyName !== undefined) body.companyName = input.companyName;
  if (input.companyWebsite !== undefined) body.companyWebsite = input.companyWebsite ?? null;
  if (input.jobTitle !== undefined) body.jobTitle = input.jobTitle ?? null;
  if (input.jobUrl !== undefined) body.jobUrl = input.jobUrl ?? null;
  if (input.linkedinUrl !== undefined) body.linkedInUrl = input.linkedinUrl ?? null;
  if (input.notes !== undefined) body.notes = input.notes ?? null;
  if (input.status !== undefined) body.status = leadStatusToApi[input.status];
  if (input.nextFollowUpAt !== undefined) body.nextFollowUpAt = input.nextFollowUpAt;
  if (input.lastContactedAt !== undefined) body.lastContactedAt = input.lastContactedAt;
  return body;
}

type RepositoryLeadInput = Parameters<Repository['leads']['create']>[0];

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function allPages<T>(path: string): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?';
  const first = await httpPage<T>(`${path}${separator}${queryString({ page: 1, pageSize: 100 }).slice(1)}`);
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await httpPage<T>(`${path}${separator}${queryString({ page, pageSize: 100 }).slice(1)}`);
    rows.push(...next.data);
  }
  return rows;
}

function templateFromApi(t: BackendTemplate): Template {
  return { id: t.id, name: t.name, subject: t.subject, body: t.body, createdAt: t.createdAt };
}

function campaignStatusFromApi(status: string): Campaign['status'] {
  switch (status) {
    case 'DRAFT': return 'draft';
    case 'SCHEDULED': return 'scheduled';
    case 'SENDING': return 'sending';
    case 'PAUSED': return 'paused';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    default: throw new ApiError(`The backend returned an unsupported campaign status: ${status}.`);
  }
}

function recipientFromApi(recipient: BackendRecipient): CampaignRecipient {
  let status: CampaignRecipient['status'];
  if (recipient.repliedAt) status = 'replied';
  else {
    switch (recipient.sendStatus) {
      case 'PENDING': status = 'pending'; break;
      case 'SENDING': status = 'sending'; break;
      case 'SENT': status = 'sent'; break;
      case 'BOUNCED': status = 'bounced'; break;
      case 'FAILED': status = 'failed'; break;
      case 'SKIPPED': status = 'skipped'; break;
      case 'CANCELLED': status = 'cancelled'; break;
      default: throw new ApiError(`The backend returned an unsupported recipient status: ${recipient.sendStatus}.`);
    }
  }
  return {
    leadId: recipient.leadId,
    status,
    error: recipient.errorMessage ?? undefined,
  };
}

function recipientsFromApi(recipients: BackendCampaign['recipients']): BackendRecipient[] {
  if (Array.isArray(recipients)) return recipients;
  return recipients?.data ?? [];
}

function campaignFromApi(c: BackendCampaign, template?: BackendTemplate): Campaign {
  const recipients = recipientsFromApi(c.recipients).map(recipientFromApi);
  const counts = c.counts ?? {};
  const records = recipientsFromApi(c.recipients);
  const recipientCount = records.length || Object.entries(counts)
    .filter(([status]) => status !== 'REPLIED')
    .reduce((total, [, count]) => total + count, 0);
  return {
    id: c.id,
    name: c.name,
    templateId: c.templateId,
    subject: template?.subject ?? c.template?.subject ?? '',
    body: template?.body ?? c.template?.body ?? '',
    attachmentIds: (c.attachments ?? []).map((a) => a.id),
    status: campaignStatusFromApi(c.status),
    scheduledAt: c.scheduledAt,
    createdAt: c.createdAt,
    recipients,
    recipientCount,
    stats: {
      sent: counts.SENT ?? 0,
      bounced: counts.BOUNCED ?? 0,
      replied: counts.REPLIED ?? records.filter((r) => r.repliedAt !== null).length,
    },
  };
}

function sequenceStatusFromApi(status: string): SequenceStatus {
  switch (status) {
    case 'ACTIVE': return 'active';
    case 'PAUSED': return 'paused';
    case 'STOPPED': return 'stopped';
    default: throw new ApiError(`The backend returned an unsupported sequence status: ${status}.`);
  }
}

function enrollmentFromApi(enrollment: NonNullable<BackendSequence['enrollments']>[number]): SequenceEnrollment {
  const status = enrollment.status.toLowerCase();
  if (!['active', 'paused', 'completed', 'stopped'].includes(status)) {
    throw new ApiError(`The backend returned an unsupported enrollment status: ${enrollment.status}.`);
  }
  return {
    id: enrollment.id,
    leadId: enrollment.leadId,
    status: status as SequenceEnrollment['status'],
    nextRunAt: enrollment.nextRunAt,
  };
}

function sequenceFromApi(s: BackendSequence): Sequence {
  const enrollments = (s.enrollments ?? []).map(enrollmentFromApi);
  return {
    id: s.id,
    name: s.name,
    status: sequenceStatusFromApi(s.status),
    steps: s.steps.map((step): SequenceStep => ({
      id: step.id,
      templateId: step.templateId,
      delayDays: step.delayMinutes / 1440,
    })),
    enrolledLeadIds: enrollments.map((enrollment) => enrollment.leadId),
    enrollments,
    stopOnReply: s.stopOnReply,
    stopOnClosedStatus: true,
    nextRunAt: enrollments.find((enrollment) => enrollment.nextRunAt)?.nextRunAt ?? null,
    createdAt: s.createdAt,
  };
}

function messageFromApi(m: BackendMessage): EmailMessage {
  return {
    id: m.id,
    leadId: m.leadId ?? undefined,
    campaignId: m.campaignRecipient?.campaignId,
    sequenceId: m.enrollment?.sequenceId,
    threadId: m.providerThreadId ?? undefined,
    direction: m.direction === 'INBOUND' ? 'inbound' : 'outbound',
    status: m.direction === 'INBOUND' ? 'received' : 'sent',
    subject: m.subject,
    body: m.snippet ?? '',
    fromEmail: m.fromAddress,
    toEmail: m.toAddress,
    read: m.isRead,
    createdAt: m.receivedAt ?? m.sentAt ?? m.createdAt,
  };
}

const notificationTypeFromApi: Record<string, AppNotification['type']> = {
  FOLLOW_UP_DUE: 'follow_up_due',
  REPLY_RECEIVED: 'reply_received',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  CAMPAIGN_FAILED: 'campaign_failed',
  SEQUENCE_FAILED: 'sequence_failed',
  EMAIL_BOUNCED: 'email_bounced',
  GMAIL_DISCONNECTED: 'gmail_disconnected',
  SYSTEM: 'system',
};

function notificationFromApi(n: BackendNotification): AppNotification {
  const target = n.relatedLeadId
    ? { type: 'lead' as const, id: n.relatedLeadId }
    : n.relatedCampaignId
      ? { type: 'campaign' as const, id: n.relatedCampaignId }
      : undefined;
  return {
    id: n.id,
    type: notificationTypeFromApi[n.type] ?? 'system',
    title: n.title,
    body: n.body,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    target,
  };
}

async function templatesById() {
  const rows = await allPages<BackendTemplate>('/templates');
  return new Map(rows.map((row) => [row.id, row]));
}

async function fetchCampaign(id: string) {
  const path = `/campaigns/${encodeURIComponent(id)}`;
  const first = await http<BackendCampaign>(`${path}${queryString({ recipientsPage: 1, recipientsPageSize: 100 })}`);
  const page = first.recipients && !Array.isArray(first.recipients) ? first.recipients : undefined;
  if (!page || page.meta.totalPages <= 1) return first;
  const recipients = [...page.data];
  for (let current = 2; current <= page.meta.totalPages; current++) {
    const next = await http<BackendCampaign>(`${path}${queryString({ recipientsPage: current, recipientsPageSize: 100 })}`);
    if (next.recipients && !Array.isArray(next.recipients)) recipients.push(...next.recipients.data);
  }
  return { ...first, recipients };
}

async function campaignTemplate(input: CampaignInput) {
  let template = input.templateId
    ? await http<BackendTemplate>(`/templates/${encodeURIComponent(input.templateId)}`)
    : undefined;
  if (!template || template.subject !== input.subject || template.body !== input.body) {
    const suffix = ' campaign template';
    template = await http<BackendTemplate>('/templates', {
      method: 'POST',
      body: {
        name: `${input.name.slice(0, Math.max(1, 120 - suffix.length))}${suffix}`,
        subject: input.subject,
        body: input.body,
      },
    });
  }
  return template;
}

export function createApiRepository(): Repository {
  return {
    health: async () => {
      const result = await http<{ status: string }>('/health');
      if (result.status !== 'ok') throw new Error('The backend health check did not return an OK status.');
      return { ok: true };
    },
    auth: {
      me: async () => {
        const result = await http<{ email: string }>('/auth/me');
        return { authenticated: true, email: result.email };
      },
    },
    leads: {
      list: async () => (await allPages<BackendLead>('/leads')).map(leadFromApi),
      get: async (id) => leadFromApi(await http<BackendLead>(`/leads/${encodeURIComponent(id)}`)),
      create: async (input) => leadFromApi(await http<BackendLead>('/leads', { method: 'POST', body: leadToApi(input) })),
      update: async (id, patch) => leadFromApi(await http<BackendLead>(`/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: leadToApi(patch) })),
      remove: async (id) => http<void>(`/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      importMany: async (leads) => {
        const result = await http<{ created: number; skipped: number }>('/leads/import', {
          method: 'POST',
          body: { leads: leads.map(leadToApi), onDuplicate: 'skip' },
        });
        return result;
      },
      exportCsv: () => httpText('/leads/export'),
    },
    campaigns: {
      list: async () => {
        const [campaigns, templates] = await Promise.all([allPages<BackendCampaign>('/campaigns'), templatesById()]);
        return campaigns.map((campaign) => campaignFromApi(campaign, templates.get(campaign.templateId)));
      },
      get: async (id) => {
        const campaign = await fetchCampaign(id);
        const template = await http<BackendTemplate>(`/templates/${encodeURIComponent(campaign.templateId)}`);
        return campaignFromApi(campaign, template);
      },
      create: async (input) => {
        if (!input.scheduledAt) {
          const gmail = await http<BackendGmailStatus>('/integrations/gmail/status');
          if (gmail.status !== 'CONNECTED') {
            throw new ApiError('Connect Gmail in Settings before sending a campaign.', 409);
          }
        }
        const template = await campaignTemplate(input);
        const created = await http<BackendCampaign>('/campaigns', {
          method: 'POST',
          body: {
            name: input.name,
            templateId: template.id,
            leadIds: input.leadIds,
            documentIds: input.attachmentIds,
          },
        });
        if (input.scheduledAt) {
          const scheduled = await http<BackendCampaign>(`/campaigns/${encodeURIComponent(created.id)}/schedule`, {
            method: 'POST',
            body: { scheduledAt: input.scheduledAt },
          });
          return campaignFromApi(scheduled, template);
        }
        const started = await http<{ campaign: BackendCampaign }>(`/campaigns/${encodeURIComponent(created.id)}/send`, { method: 'POST' });
        return campaignFromApi(started.campaign, template);
      },
      act: async (id, action) => {
        const campaign = await http<BackendCampaign>(`/campaigns/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        const template = await http<BackendTemplate>(`/templates/${encodeURIComponent(campaign.templateId)}`);
        return campaignFromApi(campaign, template);
      },
    },
    templates: {
      list: async () => (await allPages<BackendTemplate>('/templates')).map(templateFromApi),
      create: async (input) => templateFromApi(await http<BackendTemplate>('/templates', { method: 'POST', body: input })),
      update: async (id, input) => templateFromApi(await http<BackendTemplate>(`/templates/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })),
      remove: async (id) => http<void>(`/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    },
    sequences: {
      list: async () => (await allPages<BackendSequence>('/sequences')).map(sequenceFromApi),
      get: async (id) => sequenceFromApi(await http<BackendSequence>(`/sequences/${encodeURIComponent(id)}`)),
      create: async (input) => sequenceFromApi(await http<BackendSequence>('/sequences', {
        method: 'POST',
        body: {
          name: input.name,
          stopOnReply: input.stopOnReply,
          steps: input.steps.map((step) => ({ templateId: step.templateId, delayMinutes: step.delayDays * 1440 })),
        },
      })),
      update: async (id, input) => sequenceFromApi(await http<BackendSequence>(`/sequences/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          name: input.name,
          stopOnReply: input.stopOnReply,
          steps: input.steps.map((step) => ({ templateId: step.templateId, delayMinutes: step.delayDays * 1440 })),
        },
      })),
      remove: async (id) => {
        const sequence = await http<BackendSequence>(`/sequences/${encodeURIComponent(id)}`);
        if (sequence.status !== 'STOPPED') await http(`/sequences/${encodeURIComponent(id)}/stop`, { method: 'POST' });
        await http<void>(`/sequences/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
      setStatus: async (id, status) => sequenceFromApi(await http<BackendSequence>(`/sequences/${encodeURIComponent(id)}/${status === 'active' ? 'resume' : 'pause'}`, { method: 'POST' })),
      setEnrollment: async (id, leadIds) => {
        const result = await http<{ enrolled: string[]; skipped: { leadId: string; reason: string }[] }>(`/sequences/${encodeURIComponent(id)}/enroll`, {
          method: 'POST',
          body: { leadIds },
        });
        const sequence = sequenceFromApi(await http<BackendSequence>(`/sequences/${encodeURIComponent(id)}`));
        return { sequence, enrolled: result.enrolled, skipped: result.skipped };
      },
    },
    documents: {
      list: async () => (await allPages<Omit<DocumentItem, 'kind'>>('/documents')).map((document) => ({ ...document, kind: 'other' as const })),
      upload: async (input) => {
        const form = new FormData();
        form.append('file', { uri: input.uri, name: input.name, type: input.mimeType } as unknown as Blob);
        form.append('name', input.name);
        const document = await http<Omit<DocumentItem, 'kind'>>('/documents/upload', { method: 'POST', form });
        return { ...document, kind: 'other' };
      },
      remove: async (id) => http<void>(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    },
    messages: {
      list: async (params) => {
        const rows = await allPages<BackendMessage>(`/messages${queryString({ leadId: params?.leadId })}`);
        return rows.map(messageFromApi);
      },
      thread: async (threadId) => {
        const rows = await http<BackendMessage[]>(`/messages/threads/${encodeURIComponent(threadId)}`);
        return rows.map(messageFromApi);
      },
      sync: () => http<{ mode: string; inspected: number; stored: number; replies: number; bounces: number }>('/messages/sync', { method: 'POST' }),
      markRead: async (id) => messageFromApi(await http<BackendMessage>(`/messages/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: { isRead: true } })),
    },
    notifications: {
      list: async () => (await allPages<BackendNotification>('/notifications')).map(notificationFromApi),
      markRead: async (id) => http<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
      markAllRead: async () => http<void>('/notifications/read-all', { method: 'POST' }),
    },
    settings: {
      get: async () => {
        const [settings, gmail] = await Promise.all([
          http<BackendSettings>('/settings'),
          http<BackendGmailStatus>('/integrations/gmail/status'),
        ]);
        return { ...settings, gmail: { connected: gmail.status === 'CONNECTED', email: gmail.emailAddress ?? undefined } };
      },
      update: async (patch) => {
        await http<BackendSettings>('/settings', { method: 'PATCH', body: patch });
        const [settings, gmail] = await Promise.all([
          http<BackendSettings>('/settings'),
          http<BackendGmailStatus>('/integrations/gmail/status'),
        ]);
        return { ...settings, gmail: { connected: gmail.status === 'CONNECTED', email: gmail.emailAddress ?? undefined } };
      },
      connectGmail: () => http('/integrations/gmail/connect'),
      disconnectGmail: async () => {
        await http('/integrations/gmail/disconnect', { method: 'POST' });
        const [settings, gmail] = await Promise.all([
          http<BackendSettings>('/settings'),
          http<BackendGmailStatus>('/integrations/gmail/status'),
        ]);
        return { ...settings, gmail: { connected: gmail.status === 'CONNECTED', email: gmail.emailAddress ?? undefined } };
      },
    },
  };
}
