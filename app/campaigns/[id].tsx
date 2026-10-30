import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Banner, Button, Card, ErrorState, KeyValue, ListRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { campaignStatusColor, colors } from '@/constants';
import { useCampaign, useCampaignAction, useLeads, useMessages } from '@/hooks/queries';
import type { RecipientStatus } from '@/types';
import { cap, errMsg, formatDate, formatDateTime } from '@/utils/format';

const recColor: Record<RecipientStatus, string> = {
  pending: colors.faint, sending: colors.accent, sent: colors.success, bounced: colors.warning,
  replied: colors.accentLight, failed: colors.error, skipped: colors.muted, cancelled: colors.muted,
};

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useCampaign(id);
  const leads = useLeads();
  const msgs = useMessages();
  const act = useCampaignAction();
  const [err, setErr] = useState<string>();

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const c = q.data;
  const name = (leadId: string) => leads.data?.find((l) => l.id === leadId)?.recruiterName ?? 'Unknown lead';
  const history = (msgs.data ?? []).filter((m) => m.campaignId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canPause = ['scheduled', 'queued', 'sending'].includes(c.status);
  const canCancel = canPause || c.status === 'paused';

  const run = async (action: 'pause' | 'resume' | 'cancel') => {
    setErr(undefined);
    try { await act.mutateAsync({ id: c.id, action }); } catch (e) { setErr(errMsg(e)); }
  };
  const cancel = () => Alert.alert('Cancel campaign?', 'Emails not yet sent will not be sent.', [
    { text: 'Keep', style: 'cancel' }, { text: 'Cancel campaign', style: 'destructive', onPress: () => run('cancel') },
  ]);

  return (
    <Screen onRefresh={() => { q.refetch(); msgs.refetch(); }} refreshing={q.isRefetching}>
      {!!err && <Banner tone="error" text={err} />}
      {c.status === 'queued' && <Banner text="Queued. No email is marked as sent until the backend confirms it." />}
      {c.status === 'scheduled' && <Banner tone="info" text="Scheduled. The backend sends it at the chosen time." />}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>{c.name}</Text>
          <Badge label={cap(c.status)} color={campaignStatusColor[c.status]} />
        </View>
        <View style={{ marginTop: 10 }}>
          <KeyValue k="Created" v={formatDate(c.createdAt)} />
          <KeyValue k="Scheduled" v={c.scheduledAt ? formatDateTime(c.scheduledAt) : 'Send as soon as possible'} />
          <KeyValue k="Recipients" v={String(c.recipientCount ?? c.recipients.length)} />
          <KeyValue k="Sent / bounced / replied" v={`${c.stats.sent} / ${c.stats.bounced} / ${c.stats.replied}`} />
          <KeyValue k="Subject" v={c.subject} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {canPause && <Button small variant="secondary" title="Pause" onPress={() => run('pause')} loading={act.isPending} />}
        {c.status === 'paused' && <Button small title="Resume" onPress={() => run('resume')} loading={act.isPending} />}
        {canCancel && <Button small variant="danger" title="Cancel" onPress={cancel} disabled={act.isPending} />}
        <Button small variant="secondary" title="Duplicate" onPress={() => router.push(`/campaigns/new?from=${c.id}`)} />
      </View>

      <SectionTitle>Recipients</SectionTitle>
      <Card>
        {c.recipients.map((r) => (
          <ListRow key={r.leadId} title={name(r.leadId)} subtitle={r.error} onPress={() => router.push(`/leads/${r.leadId}`)} right={<Badge label={cap(r.status)} color={recColor[r.status]} />} />
        ))}
      </Card>

      <SectionTitle>Email history</SectionTitle>
      <Card>
        {history.length === 0 ? <Text style={{ color: colors.muted, fontSize: 13 }}>No emails recorded for this campaign yet.</Text> : history.map((m) => (
          <ListRow key={m.id} title={m.subject || '(no subject)'} subtitle={`${m.toEmail} · ${m.status} · ${formatDateTime(m.createdAt)}`} />
        ))}
      </Card>
    </Screen>
  );
}
