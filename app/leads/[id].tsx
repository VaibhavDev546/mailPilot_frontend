import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Banner, Button, Card, Chip, ChipRow, DateField, EmptyState, ErrorState, Input, KeyValue, ListRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors, leadStatusColor, LEAD_STATUSES } from '@/constants';
import { reminderMessage, useDeleteLead, useLead, useMessages, useSetFollowUp, useUpdateLead } from '@/hooks/queries';
import type { LeadStatus } from '@/types';
import { errMsg, formatDate, formatDateTime } from '@/utils/format';

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useLead(id);
  const msgs = useMessages(id);
  const update = useUpdateLead();
  const del = useDeleteLead();
  const follow = useSetFollowUp();
  const [notes, setNotes] = useState('');
  const [fu, setFu] = useState('');
  const [info, setInfo] = useState<{ tone: 'success' | 'error'; text: string }>();

  useEffect(() => {
    if (q.data) { setNotes(q.data.notes ?? ''); setFu(q.data.nextFollowUpAt ?? ''); }
  }, [q.data]);

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const lead = q.data;

  const patch = async (p: Parameters<typeof update.mutateAsync>[0]['patch'], ok: string) => {
    setInfo(undefined);
    try { await update.mutateAsync({ id: lead.id, patch: p }); setInfo({ tone: 'success', text: ok }); } catch (e) { setInfo({ tone: 'error', text: errMsg(e) }); }
  };
  const open = (u?: string) => { if (u) Linking.openURL(u).catch(() => setInfo({ tone: 'error', text: 'Could not open that link.' })); };
  const saveFollow = async () => {
    setInfo(undefined);
    try { const r = await follow.mutateAsync({ lead, date: fu }); setInfo({ tone: 'success', text: reminderMessage(r.reminder) }); } catch (e) { setInfo({ tone: 'error', text: errMsg(e) }); }
  };
  const remove = () => Alert.alert('Delete lead?', `${lead.recruiterName} will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await del.mutateAsync(lead.id); router.back(); } catch (e) { setInfo({ tone: 'error', text: errMsg(e) }); } } },
  ]);

  return (
    <Screen onRefresh={() => { q.refetch(); msgs.refetch(); }} refreshing={q.isRefetching}>
      {!!info && <Banner tone={info.tone} text={info.text} />}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{lead.recruiterName}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{lead.companyName}</Text>
          </View>
          <Badge label={lead.status} color={leadStatusColor[lead.status]} />
        </View>
        <View style={{ marginTop: 10 }}>
          <KeyValue k="Email" v={lead.email} />
          <KeyValue k="Job title" v={lead.jobTitle ?? '—'} />
          <KeyValue k="Last contacted" v={lead.lastContactedAt ? formatDate(lead.lastContactedAt) : '—'} />
          <KeyValue k="Next follow-up" v={lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : '—'} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {!!lead.companyWebsite && <Button small variant="secondary" title="Website" onPress={() => open(lead.companyWebsite)} />}
          {!!lead.jobUrl && <Button small variant="secondary" title="Job posting" onPress={() => open(lead.jobUrl)} />}
          {!!lead.linkedinUrl && <Button small variant="secondary" title="LinkedIn" onPress={() => open(lead.linkedinUrl)} />}
        </View>
      </Card>

      <SectionTitle>Status</SectionTitle>
      <ChipRow>
        {LEAD_STATUSES.map((s: LeadStatus) => (
          <Chip key={s} label={s} color={leadStatusColor[s]} active={lead.status === s} onPress={() => lead.status !== s && patch({ status: s }, `Status set to ${s}.`)} />
        ))}
      </ChipRow>
      <View style={{ height: 10 }} />
      <Button small variant="secondary" title="Mark contacted today" onPress={() => patch({ lastContactedAt: new Date().toISOString(), ...(lead.status === 'New' ? { status: 'Contacted' as const } : {}) }, 'Marked as contacted.')} loading={update.isPending} />

      <SectionTitle>Follow-up reminder</SectionTitle>
      <Card>
        <DateField label="Follow-up date" value={fu} onChange={setFu} />
        <Button title="Save follow-up" onPress={saveFollow} loading={follow.isPending} />
      </Card>

      <SectionTitle>Notes</SectionTitle>
      <Input value={notes} onChangeText={setNotes} multiline placeholder="Add notes about this lead" />
      <Button small variant="secondary" title="Save notes" disabled={notes === (lead.notes ?? '')} onPress={() => patch({ notes: notes.trim() || undefined }, 'Notes saved.')} loading={update.isPending} />

      <SectionTitle>Email history</SectionTitle>
      <Card>
        {msgs.isLoading ? <Loading /> : msgs.isError ? <ErrorState message={errMsg(msgs.error)} onRetry={() => msgs.refetch()} /> : (msgs.data ?? []).length === 0 ? (
          <EmptyState title="No emails yet" text="Emails sent to or received from this lead will appear here." />
        ) : (
          [...(msgs.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((m) => (
            <ListRow key={m.id} bold={m.direction === 'inbound' && !m.read} title={m.subject || '(no subject)'} subtitle={`${m.direction === 'inbound' ? 'Received' : 'Sent'} · ${m.status} · ${formatDateTime(m.createdAt)}`} onPress={m.direction === 'inbound' ? () => router.push(`/replies/${m.id}`) : undefined} />
          ))
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <Button title="Edit" variant="secondary" onPress={() => router.push(`/leads/edit?id=${lead.id}`)} style={{ flex: 1 }} />
        <Button title="Delete" variant="danger" onPress={remove} loading={del.isPending} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
