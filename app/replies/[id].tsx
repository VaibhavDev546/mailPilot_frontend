import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Banner, Button, Card, Chip, ChipRow, DateField, ErrorState, KeyValue, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors, leadStatusColor, LEAD_STATUSES } from '@/constants';
import { reminderMessage, useLeads, useMarkRead, useMessageThread, useMessages, useSetFollowUp, useUpdateLead } from '@/hooks/queries';
import { errMsg, formatDateTime } from '@/utils/format';

export default function ReplyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const all = useMessages();
  const leads = useLeads();
  const m = all.data?.find((x) => x.id === id);
  const threadQuery = useMessageThread(m?.threadId);
  const markRead = useMarkRead();
  const updateLead = useUpdateLead();
  const follow = useSetFollowUp();
  const [fu, setFu] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();
  const marked = useRef(false);

  const lead = leads.data?.find((l) => l.id === m?.leadId);

  useEffect(() => {
    if (m && !m.read && !marked.current) { marked.current = true; markRead.mutate(m.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id]);

  if (all.isLoading) return <Loading />;
  if (all.isError) return <ErrorState message={errMsg(all.error)} onRetry={() => all.refetch()} />;
  if (!m) return <ErrorState message="Message not found." />;

  const thread = m.threadId ? threadQuery.data ?? [] : [m];
  const setStatus = async (status: (typeof LEAD_STATUSES)[number]) => {
    if (!lead) return;
    setMsg(undefined);
    try { await updateLead.mutateAsync({ id: lead.id, patch: { status } }); setMsg({ tone: 'success', text: `Lead set to ${status}.` }); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const saveFollow = async () => {
    if (!lead) return;
    setMsg(undefined);
    try { const r = await follow.mutateAsync({ lead, date: fu }); setMsg({ tone: 'success', text: reminderMessage(r.reminder) }); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };

  return (
    <Screen>
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{m.subject || '(no subject)'}</Text>
        <View style={{ marginTop: 8 }}>
          <KeyValue k="From" v={m.fromEmail} />
          <KeyValue k="Date" v={formatDateTime(m.createdAt)} />
          <KeyValue k="Lead" v={lead ? `${lead.recruiterName}, ${lead.companyName}` : '—'} />
        </View>
        {!m.read && <Button small variant="secondary" title="Mark as read" onPress={() => markRead.mutate(m.id)} loading={markRead.isPending} style={{ marginTop: 8 }} />}
      </Card>

      <SectionTitle>Conversation</SectionTitle>
      {threadQuery.isError && <ErrorState message={errMsg(threadQuery.error)} onRetry={() => threadQuery.refetch()} />}
      {threadQuery.isLoading ? <Loading /> : thread.map((x) => (
        <Card key={x.id} style={x.direction === 'outbound' ? { borderColor: colors.accent + '66' } : undefined}>
          <Text style={{ color: colors.faint, fontSize: 12, marginBottom: 6 }}>{x.direction === 'inbound' ? 'Received' : 'Sent'} · {formatDateTime(x.createdAt)}</Text>
          <Text style={{ color: x.body ? colors.text : colors.muted, lineHeight: 21 }} selectable>{x.body || 'Message content is not available in the backend record.'}</Text>
        </Card>
      ))}

      {lead ? (
        <>
          <SectionTitle>Update lead status</SectionTitle>
          <ChipRow>{LEAD_STATUSES.map((s) => <Chip key={s} label={s} color={leadStatusColor[s]} active={lead.status === s} onPress={() => lead.status !== s && setStatus(s)} />)}</ChipRow>
          <SectionTitle>Follow-up reminder</SectionTitle>
          <Card>
            <DateField label="Follow-up date" value={fu} onChange={setFu} />
            <Button title="Create reminder" onPress={saveFollow} disabled={!fu} loading={follow.isPending} />
          </Card>
          <Button variant="secondary" title="Open lead" onPress={() => router.push(`/leads/${lead.id}`)} />
        </>
      ) : (
        <Banner tone="info" text="This message is not linked to a lead, so status and reminders are unavailable." />
      )}
    </Screen>
  );
}
