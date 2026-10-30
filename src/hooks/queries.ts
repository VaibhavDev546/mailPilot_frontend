import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services';
import type { Lead } from '@/types';
import type { CampaignAction, CampaignInput, LeadInput, LeadPatch, SequenceInput, TemplateInput, UploadInput } from '@/repositories/types';
import { cancelFollowUpReminder, scheduleFollowUpReminder, type ReminderResult } from '@/utils/notifications';

function useApiMutation<A, R>(fn: (a: A) => Promise<R>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation<R, Error, A>({
    mutationFn: fn,
    onSuccess: () => { keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Queries
export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: () => api.health(), retry: false });
export const useLeads = () => useQuery({ queryKey: ['leads'], queryFn: () => api.leads.list() });
export const useExportLeads = () => useMutation({ mutationFn: () => api.leads.exportCsv() });
export const useLead = (id?: string) => useQuery({ queryKey: ['leads', id], queryFn: () => api.leads.get(id!), enabled: !!id });
export const useCampaigns = () => useQuery({ queryKey: ['campaigns'], queryFn: () => api.campaigns.list() });
export const useCampaign = (id?: string) => useQuery({ queryKey: ['campaigns', id], queryFn: () => api.campaigns.get(id!), enabled: !!id });
export const useTemplates = () => useQuery({ queryKey: ['templates'], queryFn: () => api.templates.list() });
export const useSequences = () => useQuery({ queryKey: ['sequences'], queryFn: () => api.sequences.list() });
export const useSequence = (id?: string) => useQuery({ queryKey: ['sequences', id], queryFn: () => api.sequences.get(id!), enabled: !!id });
export const useDocuments = () => useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
export const useMessages = (leadId?: string) => useQuery({ queryKey: ['messages', leadId ?? 'all'], queryFn: () => api.messages.list(leadId ? { leadId } : undefined) });
export const useMessageThread = (threadId?: string) => useQuery({
  queryKey: ['messages', 'thread', threadId],
  queryFn: () => api.messages.thread(threadId!),
  enabled: !!threadId,
});
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications.list() });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get() });

// Leads
export const useCreateLead = () => useApiMutation((i: LeadInput) => api.leads.create(i), ['leads']);
export const useUpdateLead = () => useApiMutation((a: { id: string; patch: LeadPatch }) => api.leads.update(a.id, a.patch), ['leads']);
export const useDeleteLead = () => useApiMutation((id: string) => api.leads.remove(id), ['leads', 'sequences']);
export const useImportLeads = () => useApiMutation((l: LeadInput[]) => api.leads.importMany(l), ['leads']);

// Campaigns
export const useCreateCampaign = () => useApiMutation((i: CampaignInput) => api.campaigns.create(i), ['campaigns']);
export const useCampaignAction = () => useApiMutation((a: { id: string; action: CampaignAction }) => api.campaigns.act(a.id, a.action), ['campaigns']);

// Templates
export const useCreateTemplate = () => useApiMutation((i: TemplateInput) => api.templates.create(i), ['templates']);
export const useUpdateTemplate = () => useApiMutation((a: { id: string; input: TemplateInput }) => api.templates.update(a.id, a.input), ['templates']);
export const useDeleteTemplate = () => useApiMutation((id: string) => api.templates.remove(id), ['templates']);

// Sequences
export const useCreateSequence = () => useApiMutation((i: SequenceInput) => api.sequences.create(i), ['sequences']);
export const useUpdateSequence = () => useApiMutation((a: { id: string; input: SequenceInput }) => api.sequences.update(a.id, a.input), ['sequences']);
export const useDeleteSequence = () => useApiMutation((id: string) => api.sequences.remove(id), ['sequences']);
export const useSequenceStatus = () => useApiMutation((a: { id: string; status: 'active' | 'paused' }) => api.sequences.setStatus(a.id, a.status), ['sequences']);
export const useEnroll = () => useApiMutation((a: { id: string; leadIds: string[] }) => api.sequences.setEnrollment(a.id, a.leadIds), ['sequences']);

// Documents
export const useUploadDocument = () => useApiMutation((i: UploadInput) => api.documents.upload(i), ['documents']);
export const useDeleteDocument = () => useApiMutation((id: string) => api.documents.remove(id), ['documents', 'settings']);

// Messages & notifications
export const useMarkRead = () => useApiMutation((id: string) => api.messages.markRead(id), ['messages']);
export const useSyncMessages = () => useApiMutation(() => api.messages.sync(), ['messages']);
export const useMarkNotificationRead = () => useApiMutation((id: string) => api.notifications.markRead(id), ['notifications']);
export const useMarkAllNotificationsRead = () => useApiMutation(() => api.notifications.markAllRead(), ['notifications']);

// Settings
export const useUpdateSettings = () => useApiMutation((p: Parameters<typeof api.settings.update>[0]) => api.settings.update(p), ['settings']);
export const useConnectGmail = () => useApiMutation(() => api.settings.connectGmail(), ['settings']);
export const useDisconnectGmail = () => useApiMutation(() => api.settings.disconnectGmail(), ['settings']);

export type FollowUpResult = { lead: Lead; reminder: ReminderResult | 'cleared' };

/** Saves nextFollowUpAt on the lead (server) and schedules a local reminder if enabled. */
export function useSetFollowUp() {
  const qc = useQueryClient();
  return useMutation<FollowUpResult, Error, { lead: Lead; date: string }>({
    mutationFn: async ({ lead, date }) => {
      const updated = await api.leads.update(lead.id, { nextFollowUpAt: date || null });
      if (!date) { await cancelFollowUpReminder(lead.id); return { lead: updated, reminder: 'cleared' } };
      const reminder = await scheduleFollowUpReminder(updated, new Date(date));
      return { lead: updated, reminder };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); },
  });
}

export function reminderMessage(r: FollowUpResult['reminder']) {
  switch (r) {
    case 'scheduled': return 'Follow-up saved and reminder set on this device.';
    case 'cleared': return 'Follow-up cleared.';
    case 'past': return 'Follow-up saved. That time has passed, so no reminder was scheduled.';
    case 'denied': return 'Follow-up saved. Notification permission was denied, so no reminder was scheduled.';
    case 'unavailable': return 'Follow-up saved. Notifications are not available on this device.';
  }
}
