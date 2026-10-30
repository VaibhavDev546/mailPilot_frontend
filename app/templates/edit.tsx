import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banner, Button, Card, Chip, ChipRow, ErrorState, FormInput, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors, TEMPLATE_VARIABLES } from '@/constants';
import { useCreateTemplate, useLeads, useSettings, useTemplates, useUpdateTemplate } from '@/hooks/queries';
import { errMsg } from '@/utils/format';
import { buildVars, render, unresolved } from '@/utils/template';

const schema = z.object({ name: z.string().trim().min(1, 'Name is required'), subject: z.string().trim().min(1, 'Subject is required'), body: z.string().trim().min(1, 'Message is required') });
type V = z.infer<typeof schema>;

export default function TemplateEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const list = useTemplates();
  const leads = useLeads();
  const settings = useSettings();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const [focus, setFocus] = useState<'subject' | 'body'>('body');
  const [previewLead, setPreviewLead] = useState<string>();
  const [err, setErr] = useState<string>();
  const { control, handleSubmit, reset, setValue, getValues, watch, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { name: '', subject: '', body: '' } });

  const existing = list.data?.find((t) => t.id === id);
  useEffect(() => { if (existing) reset({ name: existing.name, subject: existing.subject, body: existing.body }); }, [existing, reset]);

  if (id && list.isLoading) return <Loading />;
  if (list.isError) return <ErrorState message={errMsg(list.error)} onRetry={() => list.refetch()} />;
  if (id && !existing) return <ErrorState message="Template not found." />;

  const insert = (v: string) => setValue(focus, `${getValues(focus)}{{${v}}}`, { shouldDirty: true });
  const save = handleSubmit(async (v) => {
    setErr(undefined);
    try {
      if (id) await update.mutateAsync({ id, input: v }); else await create.mutateAsync(v);
      router.back();
    } catch (e) { setErr(errMsg(e)); }
  });

  const subject = watch('subject');
  const body = watch('body');
  const lead = leads.data?.find((l) => l.id === previewLead);
  const vars = buildVars(lead, settings.data);
  const gaps = lead ? [...new Set([...unresolved(subject, vars), ...unresolved(body, vars)])] : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit template' : 'New template' }} />
      {!!err && <Banner tone="error" text={err} />}
      <FormInput control={control} name="name" label="Template name" error={errors.name?.message} />
      <FormInput control={control} name="subject" label="Subject" error={errors.subject?.message} onFocus={() => setFocus('subject')} />
      <FormInput control={control} name="body" label="Message" error={errors.body?.message} multiline style={{ minHeight: 200 }} onFocus={() => setFocus('body')} />
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Insert variable into {focus}</Text>
      <ChipRow>{TEMPLATE_VARIABLES.map((v) => <Chip key={v} label={`{{${v}}}`} onPress={() => insert(v)} />)}</ChipRow>

      <SectionTitle>Preview</SectionTitle>
      {(leads.data ?? []).length === 0 ? (
        <Text style={{ color: colors.faint, fontSize: 12, marginBottom: 10 }}>Add a lead to preview this template personalized for them.</Text>
      ) : (
        <>
          <ChipRow>
            <Chip label="No lead" active={!previewLead} onPress={() => setPreviewLead(undefined)} />
            {leads.data!.map((l) => <Chip key={l.id} label={l.recruiterName} active={previewLead === l.id} onPress={() => setPreviewLead(l.id)} />)}
          </ChipRow>
          <Text />
        </>
      )}
      {gaps.length > 0 && <Banner text={`No value for: ${gaps.map((g) => `{{${g}}}`).join(', ')}. Fill these on the lead or in Settings.`} />}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>{render(subject, vars) || '—'}</Text>
        <Text style={{ color: colors.text, lineHeight: 21 }}>{render(body, vars) || '—'}</Text>
      </Card>
      <Button title="Save template" onPress={save} loading={isSubmitting || create.isPending || update.isPending} />
    </Screen>
  );
}
