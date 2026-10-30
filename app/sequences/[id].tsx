import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Badge, Banner, Button, Card, ErrorState, KeyValue, ListRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants';
import { useDeleteSequence, useEnroll, useLeads, useSequence, useSequenceStatus, useTemplates } from '@/hooks/queries';
import { cap, errMsg, formatDateTime } from '@/utils/format';

const seqColor = { draft: '#64748b', active: '#10b981', paused: '#f59e0b', stopped: '#64748b' } as const;

export default function SequenceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useSequence(id);
  const leads = useLeads();
  const templates = useTemplates();
  const setStatus = useSequenceStatus();
  const enroll = useEnroll();
  const del = useDeleteSequence();
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const s = q.data;
  const tplName = (tid: string) => templates.data?.find((t) => t.id === tid)?.name ?? 'Missing template';
  const leadName = (lid: string) => leads.data?.find((l) => l.id === lid)?.recruiterName ?? 'Unknown lead';
  const dirty = picked.length > 0;

  const run = async (status: 'active' | 'paused') => {
    setMsg(undefined);
    try { await setStatus.mutateAsync({ id: s.id, status }); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const saveEnroll = async () => {
    setMsg(undefined);
    try {
      const result = await enroll.mutateAsync({ id: s.id, leadIds: picked });
      setPicked([]);
      await q.refetch();
      const skipped = result.skipped.length;
      setMsg({
        tone: skipped ? 'error' : 'success',
        text: skipped
          ? `Enrolled ${result.enrolled.length} lead(s); skipped ${skipped}. Some leads may already be enrolled, replied, or closed.`
          : `Enrolled ${result.enrolled.length} lead(s).`,
      });
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const remove = () => Alert.alert('Delete sequence?', 'Active enrollments will be stopped and the sequence deleted.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await del.mutateAsync(s.id); router.back(); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); } } },
  ]);

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>{s.name}</Text>
          <Badge label={cap(s.status)} color={seqColor[s.status]} />
        </View>
        <View style={{ marginTop: 10 }}>
          <KeyValue k="Next step" v={s.nextRunAt ? formatDateTime(s.nextRunAt) : 'Scheduled by the backend'} />
          <KeyValue k="Stop on reply" v={s.stopOnReply ? 'Yes' : 'No'} />
          <KeyValue k="Stop on closed lead" v="Yes" />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {s.status !== 'active' && s.status !== 'stopped' && <Button small title={s.status === 'paused' ? 'Resume' : 'Activate'} onPress={() => run('active')} loading={setStatus.isPending} />}
        {s.status === 'active' && <Button small variant="secondary" title="Pause" onPress={() => run('paused')} loading={setStatus.isPending} />}
        <Button small variant="secondary" title="Edit" onPress={() => router.push(`/sequences/edit?id=${s.id}`)} />
        <Button small variant="danger" title="Delete" onPress={remove} />
      </View>

      <SectionTitle>Steps</SectionTitle>
      <Card>
        {s.steps.map((st, i) => (
          <ListRow key={st.id} title={`${i + 1}. ${tplName(st.templateId)}`} subtitle={i === 0 ? `After ${st.delayDays} day(s) from enrollment` : `After ${st.delayDays} day(s) from previous step`} />
        ))}
      </Card>

      <SectionTitle right={<Text style={{ color: colors.accentLight, fontSize: 13 }}>{picked.length} selected to add</Text>}>Enrolled leads</SectionTitle>
      <Card>
        {(leads.data ?? []).length === 0 ? <Text style={{ color: colors.muted, fontSize: 13 }}>No leads available to enroll.</Text> : leads.data!.map((l) => {
          const enrollment = s.enrollments?.find((item) => item.leadId === l.id);
          const on = picked.includes(l.id);
          return (
            <ListRow key={l.id} title={l.recruiterName} subtitle={enrollment ? `Already enrolled · ${enrollment.status}` : `${l.companyName} · ${l.status}`}
              onPress={() => !enrollment && setPicked(on ? picked.filter((x) => x !== l.id) : [...picked, l.id])}
              right={enrollment
                ? <Text style={{ color: colors.muted, fontSize: 12 }}>{enrollment.nextRunAt ? formatDateTime(enrollment.nextRunAt) : cap(enrollment.status)}</Text>
                : <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={14} color="#fff" />}</View>} />
          );
        })}
      </Card>
      <Button small title="Enroll selected leads" onPress={saveEnroll} disabled={!dirty} loading={enroll.isPending} />

      <SectionTitle>Enrollment status</SectionTitle>
      <Card>
        {(s.enrollments ?? []).length === 0 ? <Text style={{ color: colors.muted, fontSize: 13 }}>No leads are enrolled.</Text> : (s.enrollments ?? []).map((enrollment) => (
          <ListRow key={enrollment.id} title={leadName(enrollment.leadId)} subtitle={`${cap(enrollment.status)}${enrollment.nextRunAt ? ` · Next run ${formatDateTime(enrollment.nextRunAt)}` : ''}`} />
        ))}
      </Card>
    </Screen>
  );
}
