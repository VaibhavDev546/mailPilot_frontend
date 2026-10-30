import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';
import { z } from 'zod';
import { Banner, Button, Card, Chip, ChipRow, ErrorState, Input, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants';
import { useCreateSequence, useSequence, useTemplates, useUpdateSequence } from '@/hooks/queries';
import { errMsg } from '@/utils/format';

type StepState = { id: string; templateId: string; delay: string };
let n = 0;
const newStep = (delay = '3'): StepState => ({ id: `step_${Date.now().toString(36)}${n++}`, templateId: '', delay });

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a sequence name.'),
  steps: z.array(z.object({ templateId: z.string().min(1, 'Choose a template for every step.'), delay: z.string().regex(/^(?:[0-9]|[1-8][0-9]|90)$/, 'Delays must be whole days (0–90).') })).min(1, 'Add at least one step.'),
});

export default function SequenceEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const existing = useSequence(id);
  const templates = useTemplates();
  const create = useCreateSequence();
  const update = useUpdateSequence();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<StepState[]>([newStep('0')]);
  const [stopOnReply, setStopOnReply] = useState(true);
  const [error, setError] = useState<string>();
  const loaded = useRef(false);

  useEffect(() => {
    if (existing.data && !loaded.current) {
      loaded.current = true;
      const s = existing.data;
      setName(s.name); setStopOnReply(s.stopOnReply);
      setSteps(s.steps.map((x) => ({ id: x.id, templateId: x.templateId, delay: String(x.delayDays) })));
    }
  }, [existing.data]);

  if (id && existing.isLoading) return <Loading />;
  if (id && existing.isError) return <ErrorState message={errMsg(existing.error)} onRetry={() => existing.refetch()} />;

  const patchStep = (i: number, p: Partial<StepState>) => setSteps(steps.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= steps.length) return;
    const c = [...steps]; [c[i], c[j]] = [c[j], c[i]]; setSteps(c);
  };

  const save = async () => {
    const r = schema.safeParse({ name, steps: steps.map((s) => ({ templateId: s.templateId, delay: s.delay })) });
    if (!r.success) return setError(r.error.issues[0].message);
    setError(undefined);
    const input = { name: name.trim(), stopOnReply, steps: steps.map((s) => ({ id: s.id, templateId: s.templateId, delayDays: Number(s.delay) })) };
    try {
      if (id) { await update.mutateAsync({ id, input }); router.back(); }
      else { const s = await create.mutateAsync(input); router.replace(`/sequences/${s.id}`); }
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit sequence' : 'New sequence' }} />
      {!!error && <Banner tone="error" text={error} />}
      <Input label="Sequence name" value={name} onChangeText={setName} placeholder="e.g. Standard enquiry" />
      <SectionTitle>Steps</SectionTitle>
      {(templates.data ?? []).length === 0 && !templates.isLoading && (
        <Banner text="You need templates to build steps. Create them under More → Templates first." />
      )}
      {steps.map((s, i) => (
        <Card key={s.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Step {i + 1}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={{ padding: 8, opacity: i === 0 ? 0.3 : 1 }}><ArrowUp size={18} color={colors.text} /></Pressable>
              <Pressable onPress={() => move(i, 1)} disabled={i === steps.length - 1} style={{ padding: 8, opacity: i === steps.length - 1 ? 0.3 : 1 }}><ArrowDown size={18} color={colors.text} /></Pressable>
              <Pressable onPress={() => setSteps(steps.filter((_, k) => k !== i))} disabled={steps.length === 1} style={{ padding: 8, opacity: steps.length === 1 ? 0.3 : 1 }}><Trash2 size={18} color={colors.error} /></Pressable>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Template</Text>
          <ChipRow>
            {(templates.data ?? []).map((t) => <Chip key={t.id} label={t.name} active={s.templateId === t.id} onPress={() => patchStep(i, { templateId: t.id })} />)}
          </ChipRow>
          <View style={{ height: 12 }} />
          <Input label={i === 0 ? 'Send after (days from enrollment)' : 'Send after (days since previous step)'} value={s.delay} onChangeText={(delay) => patchStep(i, { delay: delay.replace(/[^0-9]/g, '') })} keyboardType="number-pad" style={{ marginBottom: 0 }} />
        </Card>
      ))}
      <Button small variant="secondary" title="Add step" onPress={() => setSteps([...steps, newStep()])} />

      <SectionTitle>Stop rules</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: colors.text, flex: 1, paddingRight: 12 }}>Stop when a reply is received</Text>
          <Switch value={stopOnReply} onValueChange={setStopOnReply} trackColor={{ true: colors.accent, false: colors.cardAlt }} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Sequences automatically stop for leads marked Rejected, Hired or Archived.</Text>
      </Card>
      <Button title="Save sequence" onPress={save} loading={create.isPending || update.isPending} />
    </Screen>
  );
}
