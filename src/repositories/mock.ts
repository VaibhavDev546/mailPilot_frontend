import { ApiError } from '@/services/http';
import { leadsToCsv } from '@/utils/csv';
import type {
  AppNotification, Campaign, DocumentItem, EmailMessage, Lead, Sequence, Settings, Template,
} from '@/types';
import type { Repository } from './types';

/**
 * In-memory repository for UI work. It starts EMPTY, contains no seed data, never simulates
 * email delivery or replies, and forgets everything when the app restarts.
 */
const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;
const nowIso = () => new Date().toISOString();
const norm = (e: string) => e.trim().toLowerCase();
const notFound = (what: string) => new ApiError(`${what} not found.`, 404);
const needsBackend = () => new ApiError('Gmail connection needs the backend. Set EXPO_PUBLIC_DATA_SOURCE=api and EXPO_PUBLIC_API_URL.');

export function createMockRepository(): Repository {
  let leads: Lead[] = [];
  let campaigns: Campaign[] = [];
  let templates: Template[] = [];
  let sequences: Sequence[] = [];
  let documents: DocumentItem[] = [];
  let messages: EmailMessage[] = [];
  let notifications: AppNotification[] = [];
  let settings: Settings = {
    senderName: '',
    signature: '',
    timezone: 'UTC',
    sendWindowStartHour: 9,
    sendWindowEndHour: 18,
    sendOnWeekends: false,
    defaultFollowUpDays: 5,
    dailySendLimit: 50,
    sendIntervalSeconds: 20,
    gmail: { connected: false },
  };

  const find = <T extends { id: string }>(list: T[], id: string, what: string) => {
    const item = list.find((x) => x.id === id);
    if (!item) throw notFound(what);
    return item;
  };
  const dupEmail = (email: string, exceptId?: string) => leads.some((l) => l.id !== exceptId && norm(l.email) === norm(email));

  return {
    async health() { await delay(30); return { ok: true, mode: 'mock' }; },
    auth: { async me() { await delay(30); return { authenticated: false }; } },

    leads: {
      async list() { await delay(); return [...leads]; },
      async get(id) { await delay(); return { ...find(leads, id, 'Lead') }; },
      async create(input) {
        await delay();
        if (dupEmail(input.email)) throw new ApiError('A lead with this email already exists.', 409);
        const lead: Lead = { ...input, id: uid('lead'), createdAt: nowIso() };
        leads = [lead, ...leads];
        return lead;
      },
      async update(id, patch) {
        await delay();
        const cur = find(leads, id, 'Lead');
        if (patch.email && dupEmail(patch.email, id)) throw new ApiError('A lead with this email already exists.', 409);
        const next = { ...cur, ...patch };
        leads = leads.map((l) => (l.id === id ? next : l));
        return next;
      },
      async remove(id) {
        await delay();
        find(leads, id, 'Lead');
        leads = leads.filter((l) => l.id !== id);
        sequences = sequences.map((s) => ({ ...s, enrolledLeadIds: s.enrolledLeadIds.filter((x) => x !== id) }));
      },
      async importMany(inputs) {
        await delay();
        let created = 0, skipped = 0;
        for (const i of inputs) {
          if (dupEmail(i.email)) { skipped++; continue; }
          leads = [{ ...i, id: uid('lead'), createdAt: nowIso() }, ...leads];
          created++;
        }
        return { created, skipped };
      },
      async exportCsv() { await delay(); return leadsToCsv(leads); },
    },

    campaigns: {
      async list() { await delay(); return [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
      async get(id) { await delay(); return { ...find(campaigns, id, 'Campaign') }; },
      async create(input) {
        await delay();
        const c: Campaign = {
          id: uid('camp'),
          name: input.name,
          templateId: input.templateId,
          subject: input.subject,
          body: input.body,
          attachmentIds: input.attachmentIds,
          status: input.scheduledAt ? 'scheduled' : 'queued',
          scheduledAt: input.scheduledAt,
          createdAt: nowIso(),
          recipients: input.leadIds.map((leadId) => ({ leadId, status: 'pending' as const })),
          stats: { sent: 0, bounced: 0, replied: 0 },
        };
        campaigns = [c, ...campaigns];
        return c;
      },
      async act(id, action) {
        await delay();
        const c = find(campaigns, id, 'Campaign');
        const active = ['scheduled', 'queued', 'sending'];
        let status = c.status;
        if (action === 'pause') {
          if (!active.includes(c.status)) throw new ApiError('Only scheduled or queued campaigns can be paused.', 409);
          status = 'paused';
        } else if (action === 'resume') {
          if (c.status !== 'paused') throw new ApiError('Only paused campaigns can be resumed.', 409);
          status = c.scheduledAt ? 'scheduled' : 'queued';
        } else {
          if (![...active, 'paused'].includes(c.status)) throw new ApiError('This campaign can no longer be cancelled.', 409);
          status = 'cancelled';
        }
        const next = { ...c, status };
        campaigns = campaigns.map((x) => (x.id === id ? next : x));
        return next;
      },
    },

    templates: {
      async list() { await delay(); return [...templates]; },
      async create(input) { await delay(); const t = { ...input, id: uid('tpl'), createdAt: nowIso() }; templates = [t, ...templates]; return t; },
      async update(id, input) {
        await delay();
        const cur = find(templates, id, 'Template');
        const next = { ...cur, ...input };
        templates = templates.map((t) => (t.id === id ? next : t));
        return next;
      },
      async remove(id) {
        await delay();
        if (sequences.some((s) => s.steps.some((st) => st.templateId === id))) throw new ApiError('This template is used by a sequence. Remove it from the sequence first.', 409);
        templates = templates.filter((t) => t.id !== id);
      },
    },

    sequences: {
      async list() { await delay(); return [...sequences]; },
      async get(id) { await delay(); return { ...find(sequences, id, 'Sequence') }; },
      async create(input) {
        await delay();
        const s: Sequence = { ...input, stopOnClosedStatus: input.stopOnClosedStatus ?? true, id: uid('seq'), status: 'draft', enrolledLeadIds: [], createdAt: nowIso(), nextRunAt: null };
        sequences = [s, ...sequences];
        return s;
      },
      async update(id, input) {
        await delay();
        const cur = find(sequences, id, 'Sequence');
        const next = { ...cur, ...input };
        sequences = sequences.map((s) => (s.id === id ? next : s));
        return next;
      },
      async remove(id) { await delay(); sequences = sequences.filter((s) => s.id !== id); },
      async setStatus(id, status) {
        await delay();
        const cur = find(sequences, id, 'Sequence');
        if (status === 'active' && cur.steps.length === 0) throw new ApiError('Add at least one step before activating.', 400);
        const next = { ...cur, status };
        sequences = sequences.map((s) => (s.id === id ? next : s));
        return next;
      },
      async setEnrollment(id, leadIds) {
        await delay();
        const cur = find(sequences, id, 'Sequence');
        const next = { ...cur, enrolledLeadIds: leadIds };
        sequences = sequences.map((s) => (s.id === id ? next : s));
        return { sequence: next, enrolled: leadIds, skipped: [] };
      },
    },

    documents: {
      async list() { await delay(); return [...documents]; },
      async upload(input) {
        await delay();
        const d: DocumentItem = { id: uid('doc'), name: input.name, mimeType: input.mimeType, sizeBytes: input.size, kind: input.kind ?? 'other', createdAt: nowIso(), localUri: input.uri };
        documents = [d, ...documents];
        return d;
      },
      async remove(id) {
        await delay();
        documents = documents.filter((d) => d.id !== id);
      },
    },

    messages: {
      async list(params) { await delay(); return messages.filter((m) => !params?.leadId || m.leadId === params.leadId); },
      async thread(threadId) { await delay(); return messages.filter((m) => m.threadId === threadId); },
      async sync() { await delay(); throw needsBackend(); },
      async markRead(id) {
        await delay();
        const cur = find(messages, id, 'Message');
        const next = { ...cur, read: true };
        messages = messages.map((m) => (m.id === id ? next : m));
        return next;
      },
    },

    notifications: {
      async list() { await delay(); return [...notifications]; },
      async markRead(id) { await delay(); notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n)); },
      async markAllRead() { await delay(); notifications = notifications.map((n) => ({ ...n, read: true })); },
    },

    settings: {
      async get() { await delay(); return { ...settings }; },
      async update(patch) { await delay(); settings = { ...settings, ...patch }; return { ...settings }; },
      async connectGmail() { await delay(); throw needsBackend(); },
      async disconnectGmail() { await delay(); throw needsBackend(); },
    },
  };
}
