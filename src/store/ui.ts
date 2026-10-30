import { create } from 'zustand';
import type { LeadStatus } from '@/types';

export type WizardDraft = {
  name: string;
  leadIds: string[];
  templateId?: string;
  subject: string;
  body: string;
  attachmentIds: string[];
  mode: 'now' | 'schedule';
  scheduledAt: string; // ISO or ''
};

export const emptyDraft: WizardDraft = { name: '', leadIds: [], templateId: undefined, subject: '', body: '', attachmentIds: [], mode: 'now', scheduledAt: '' };

type UiState = {
  leadSearch: string;
  leadStatus: LeadStatus | 'All';
  setLeadSearch: (s: string) => void;
  setLeadStatus: (s: LeadStatus | 'All') => void;
  draft: WizardDraft;
  setDraft: (p: Partial<WizardDraft>) => void;
  resetDraft: () => void;
};

export const useUi = create<UiState>((set) => ({
  leadSearch: '',
  leadStatus: 'All',
  setLeadSearch: (leadSearch) => set({ leadSearch }),
  setLeadStatus: (leadStatus) => set({ leadStatus }),
  draft: emptyDraft,
  setDraft: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
  resetDraft: () => set({ draft: emptyDraft }),
}));
