import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Banner, Button, Card, Chip, ChipRow, DateField, EmptyState, Input, KeyValue, ListRow, Screen, SectionTitle } from '@/components/ui';
import { colors, TEMPLATE_VARIABLES } from '@/constants';
import { useCampaign, useCreateCampaign, useDocuments, useLeads, useSettings, useTemplates } from '@/hooks/queries';
import { useUi, WizardDraft } from '@/store/ui';
import { clearDraft, loadDraft, saveDraft } from '@/utils/drafts';
import { errMsg, formatDateTime, formatBytes } from '@/utils/format';
import { buildVars, render, unresolved } from '@/utils/template';

const STEPS = ['Details', 'Message', 'Attachments', 'Preview', 'Delivery', 'Review'];

function Check_({ on }: { on: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Check size={14} color="#fff" />}
    </View>
  );
}

export default function NewCampaign() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { draft, setDraft, resetDraft } = useUi();
  const leads = useLeads();
  const templates = useTemplates();
  const docs = useDocuments();
  const settings = useSettings();
  const source = useCampaign(from);
  const create = useCreateCampaign();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const [saved, setSaved] = useState<WizardDraft | null>(null);
  const [focus, setFocus] = useState<'subject' | 'body'>('body');
  const [idx, setIdx] = useState(0);
  const [search, setSearch] = useState('');
  const applied = useRef(false);

  useEffect(() => {
    resetDraft();
    if (!from) loadDraft<WizardDraft>('campaign').then((d) => d && setSaved(d)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (from && source.data && !applied.current) {
      applied.current = true;
      const c = source.data;
      setDraft({ name: `${c.name} (copy)`, leadIds: c.recipients.map((r) => r.leadId), templateId: c.templateId, subject: c.subject, body: c.body, attachmentIds: c.attachmentIds, mode: 'now', scheduledAt: '' });
    }
  }, [from, source.data, setDraft]);

  const allLeads = leads.data ?? [];
  const selected = useMemo(() => allLeads.filter((l) => draft.leadIds.includes(l.id)), [allLeads, draft.leadIds]);
  const filtered = allLeads.filter((l) => {
    const s = search.trim().toLowerCase();
    return !s || [l.recruiterName, l.companyName, l.email].some((v) => v.toLowerCase().includes(s));
  });
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const validate = (s: number): string | undefined => {
    if (s === 0) { if (!draft.name.trim()) return 'Enter a campaign name.'; if (draft.leadIds.length === 0) return 'Select at least one lead.'; }
    if (s === 1) { if (!draft.subject.trim()) return 'Enter a subject.'; if (!draft.body.trim()) return 'Enter a message body.'; }
    if (s === 3 && Object.keys(missing).length > 0) return 'Fill in every template value for all recipients before continuing.';
    if (s === 4 && draft.mode === 'schedule') {
      if (!draft.scheduledAt) return 'Enter a valid date and time.';
      const scheduledAt = new Date(draft.scheduledAt).getTime();
      if (!Number.isFinite(scheduledAt)) return 'Enter a valid date and time.';
      if (scheduledAt <= Date.now() + 30_000) return 'Choose a time at least 30 seconds in the future.';
    }
    return undefined;
  };
  const next = () => { const e = validate(step); setError(e); if (!e) { setNote(undefined); setStep(step + 1); } };
  const back = () => { setError(undefined); setStep(step - 1); };

  const insertVar = (v: string) => setDraft({ [focus]: `${draft[focus]}{{${v}}}` } as Partial<WizardDraft>);
  const applyTemplate = (id?: string) => {
    const t = templates.data?.find((x) => x.id === id);
    setDraft(t ? { templateId: t.id, subject: t.subject, body: t.body } : { templateId: undefined });
  };

  const saveForLater = async () => {
    try { await saveDraft('campaign', draft); setNote('Draft saved on this device.'); } catch (e) { setError(errMsg(e)); }
  };

  const submit = async () => {
    for (let s = 0; s <= 4; s++) { const e = validate(s); if (e) { setError(e); setStep(s); return; } }
    setError(undefined);
    try {
      const c = await create.mutateAsync({
        name: draft.name.trim(), leadIds: draft.leadIds, templateId: draft.templateId, subject: draft.subject, body: draft.body,
        attachmentIds: draft.attachmentIds, scheduledAt: draft.mode === 'schedule' ? new Date(draft.scheduledAt).toISOString() : null,
      });
      await clearDraft('campaign').catch(() => {});
      resetDraft();
      router.replace(`/campaigns/${c.id}`);
    } catch (e) { setError(errMsg(e)); }
  };

  const lead = selected[Math.min(idx, Math.max(selected.length - 1, 0))];
  const vars = buildVars(lead, settings.data);
  const missing = useMemo(() => {
    const out: Record<string, string[]> = {};
    selected.forEach((l) => {
      const v = buildVars(l, settings.data);
      const m = [...new Set([...unresolved(draft.subject, v), ...unresolved(draft.body, v)])];
      if (m.length) out[l.id] = m;
    });
    return out;
  }, [selected, draft.subject, draft.body, settings.data]);
  const limit = settings.data?.dailySendLimit;

  return (
    <Screen>
      {saved && !from && (
        <Banner tone="info" text="You have an unfinished campaign draft on this device." />
      )}
      {saved && !from && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button small title="Restore draft" onPress={() => { setDraft(saved); setSaved(null); }} />
          <Button small variant="secondary" title="Discard" onPress={() => { clearDraft('campaign').catch(() => {}); setSaved(null); }} />
        </View>
      )}

      <Text style={{ color: colors.muted, fontSize: 13 }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Text>
      <View style={{ flexDirection: 'row', gap: 4, marginVertical: 10 }}>
        {STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.cardAlt }} />)}
      </View>
      {!!error && <Banner tone="error" text={error} />}
      {!!note && <Banner tone="success" text={note} />}

      {step === 0 && (
        <>
          <Input label="Campaign name" value={draft.name} onChangeText={(name) => setDraft({ name })} placeholder="e.g. Backend roles, October" />
          <SectionTitle right={<Text style={{ color: colors.accentLight, fontSize: 13 }}>{draft.leadIds.length} selected</Text>}>Recipients</SectionTitle>
          <Input value={search} onChangeText={setSearch} placeholder="Search leads" style={{ marginBottom: 0 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
            <Button small variant="secondary" title="Select shown" onPress={() => setDraft({ leadIds: [...new Set([...draft.leadIds, ...filtered.map((l) => l.id)])] })} />
            <Button small variant="secondary" title="Clear" onPress={() => setDraft({ leadIds: [] })} />
          </View>
          {leads.isLoading ? <Text style={{ color: colors.muted }}>Loading leads…</Text> : leads.isError ? <Banner tone="error" text={errMsg(leads.error)} /> : allLeads.length === 0 ? (
            <EmptyState title="No leads to select" text="Add leads first, then come back." actionLabel="Add lead" onAction={() => router.push('/leads/edit')} />
          ) : (
            <Card>
              {filtered.map((l) => (
                <ListRow key={l.id} title={l.recruiterName} subtitle={`${l.companyName} · ${l.status}`} onPress={() => setDraft({ leadIds: toggle(draft.leadIds, l.id) })} right={<Check_ on={draft.leadIds.includes(l.id)} />} />
              ))}
            </Card>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Template</Text>
          <ChipRow>
            <Chip label="Write my own" active={!draft.templateId} onPress={() => applyTemplate(undefined)} />
            {(templates.data ?? []).map((t) => <Chip key={t.id} label={t.name} active={draft.templateId === t.id} onPress={() => applyTemplate(t.id)} />)}
          </ChipRow>
          {(templates.data ?? []).length === 0 && !templates.isLoading && <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>No templates yet. Create some under More → Templates.</Text>}
          <View style={{ height: 14 }} />
          <Input label="Subject" value={draft.subject} onChangeText={(subject) => setDraft({ subject })} onFocus={() => setFocus('subject')} />
          <Input label="Message" value={draft.body} onChangeText={(body) => setDraft({ body })} onFocus={() => setFocus('body')} multiline style={{ minHeight: 200 }} />
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Insert variable into {focus}</Text>
          <ChipRow>{TEMPLATE_VARIABLES.map((v) => <Chip key={v} label={`{{${v}}}`} onPress={() => insertVar(v)} />)}</ChipRow>
          <Text style={{ color: colors.faint, fontSize: 12, marginTop: 8 }}>If you edit a saved template, the edited message is saved as a campaign-specific template.</Text>
        </>
      )}

      {step === 2 && (
        <>
          {docs.isLoading ? <Text style={{ color: colors.muted }}>Loading documents…</Text> : docs.isError ? <Banner tone="error" text={errMsg(docs.error)} /> : (docs.data ?? []).length === 0 ? (
            <EmptyState title="No documents uploaded" text="Upload a resume or cover letter, or continue without attachments." actionLabel="Open documents" onAction={() => router.push('/documents')} />
          ) : (
            <Card>
              {docs.data!.map((d) => (
                <ListRow key={d.id} title={d.name} subtitle={formatBytes(d.sizeBytes)} onPress={() => setDraft({ attachmentIds: toggle(draft.attachmentIds, d.id) })} right={<Check_ on={draft.attachmentIds.includes(d.id)} />} />
              ))}
            </Card>
          )}
          <Text style={{ color: colors.faint, fontSize: 12 }}>Attachments are optional.</Text>
        </>
      )}

      {step === 3 && (
        <>
          {Object.keys(missing).length > 0 && <Banner text={`${Object.keys(missing).length} recipient(s) have empty values for some variables, shown as {{variable}}. Fill them in on the lead or in Settings, or edit the message.`} />}
          {selected.length > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Button small variant="secondary" title="Previous" onPress={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} />
              <Text style={{ color: colors.muted }}>{idx + 1} of {selected.length}</Text>
              <Button small variant="secondary" title="Next" onPress={() => setIdx(Math.min(selected.length - 1, idx + 1))} disabled={idx >= selected.length - 1} />
            </View>
          )}
          {lead && (
            <Card>
              <Text style={{ color: colors.faint, fontSize: 12 }}>To: {lead.recruiterName} &lt;{lead.email}&gt;</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginVertical: 8 }}>{render(draft.subject, vars)}</Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{render(draft.body, vars)}</Text>
              {draft.attachmentIds.length > 0 && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>{draft.attachmentIds.length} attachment(s)</Text>}
            </Card>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <ChipRow>
            <Chip label="Send now" active={draft.mode === 'now'} onPress={() => setDraft({ mode: 'now' })} />
            <Chip label="Schedule" active={draft.mode === 'schedule'} onPress={() => setDraft({ mode: 'schedule' })} />
          </ChipRow>
          <View style={{ height: 14 }} />
          {draft.mode === 'schedule' && <DateField label="Send at" withTime value={draft.scheduledAt} onChange={(scheduledAt) => setDraft({ scheduledAt })} />}
          {draft.mode === 'now' && <Text style={{ color: colors.muted, fontSize: 13 }}>The backend sends this as soon as it can. Status stays Queued until it confirms delivery.</Text>}
        </>
      )}

      {step === 5 && (
        <>
          {limit !== undefined && draft.leadIds.length > limit && <Banner text={`This campaign has ${draft.leadIds.length} recipients, above your daily sending limit of ${limit}. The backend may spread or hold sends.`} />}
          {settings.data && !settings.data.gmail.connected && <Banner text="Gmail is not connected. The backend may be unable to send until you connect it in Settings." />}
          <Card>
            <KeyValue k="Name" v={draft.name} />
            <KeyValue k="Recipients" v={String(draft.leadIds.length)} />
            <KeyValue k="Subject" v={draft.subject} />
            <KeyValue k="Attachments" v={String(draft.attachmentIds.length)} />
            <KeyValue k="Delivery" v={draft.mode === 'now' ? 'Send now' : formatDateTime(draft.scheduledAt)} />
          </Card>
          <Button title={draft.mode === 'now' ? 'Confirm and send' : 'Confirm and schedule'} onPress={submit} loading={create.isPending} />
          <Text style={{ color: colors.faint, fontSize: 12, marginTop: 8 }}>Nothing is shown as sent until the API confirms it.</Text>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={back} style={{ flex: 1 }} />}
        {step < STEPS.length - 1 && <Button title="Next" onPress={next} style={{ flex: 1 }} />}
      </View>
      <Pressable onPress={saveForLater} style={{ alignSelf: 'center', marginTop: 16, padding: 8 }}>
        <Text style={{ color: colors.accentLight, fontSize: 14 }}>Save draft on this device</Text>
      </Pressable>
    </Screen>
  );
}
