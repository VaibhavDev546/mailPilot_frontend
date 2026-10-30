import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banner, Button, ChipRow, Chip, DateField, ErrorState, FormInput, Loading, Screen } from '@/components/ui';
import { colors, LEAD_STATUSES } from '@/constants';
import { useCreateLead, useLead, useLeads, useSetFollowUp, useUpdateLead } from '@/hooks/queries';
import type { LeadStatus } from '@/types';
import { errMsg } from '@/utils/format';

const url = z.string().trim().refine((v) => !v || /^https?:\/\/\S+\.\S+/i.test(v), 'Enter a full URL starting with http:// or https://');
const schema = z.object({
  recruiterName: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  companyName: z.string().trim().min(1, 'Company is required'),
  companyWebsite: url,
  jobTitle: z.string(),
  jobUrl: url,
  linkedinUrl: url,
  notes: z.string(),
  status: z.enum(LEAD_STATUSES as [LeadStatus, ...LeadStatus[]]),
  nextFollowUpAt: z.string(),
});
type FormValues = z.infer<typeof schema>;
const blank: FormValues = { recruiterName: '', email: '', companyName: '', companyWebsite: '', jobTitle: '', jobUrl: '', linkedinUrl: '', notes: '', status: 'New', nextFollowUpAt: '' };

export default function LeadForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const existing = useLead(id);
  const all = useLeads();
  const create = useCreateLead();
  const update = useUpdateLead();
  const followUp = useSetFollowUp();
  const [serverError, setServerError] = useState<string>();
  const { control, handleSubmit, reset, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });

  useEffect(() => {
    if (existing.data) {
      const l = existing.data;
      reset({ recruiterName: l.recruiterName, email: l.email, companyName: l.companyName, companyWebsite: l.companyWebsite ?? '', jobTitle: l.jobTitle ?? '', jobUrl: l.jobUrl ?? '', linkedinUrl: l.linkedinUrl ?? '', notes: l.notes ?? '', status: l.status, nextFollowUpAt: l.nextFollowUpAt ?? '' });
    }
  }, [existing.data, reset]);

  if (id && existing.isLoading) return <Loading />;
  if (id && existing.isError) return <ErrorState message={errMsg(existing.error)} onRetry={() => existing.refetch()} />;

  const onSubmit = handleSubmit(async (v) => {
    setServerError(undefined);
    const dup = (all.data ?? []).find((l) => l.id !== id && l.email.toLowerCase() === v.email.trim().toLowerCase());
    if (dup) return setError('email', { message: `Already saved for ${dup.recruiterName} at ${dup.companyName}` });
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const input = {
      recruiterName: v.recruiterName.trim(), email: v.email.trim(), companyName: v.companyName.trim(),
      companyWebsite: opt(v.companyWebsite), jobTitle: opt(v.jobTitle), jobUrl: opt(v.jobUrl), linkedinUrl: opt(v.linkedinUrl),
      notes: opt(v.notes), status: v.status, nextFollowUpAt: v.nextFollowUpAt || null,
    };
    try {
      const saved = id ? await update.mutateAsync({ id, patch: input }) : await create.mutateAsync({ ...input, lastContactedAt: null });
      if (saved.nextFollowUpAt !== (existing.data?.nextFollowUpAt ?? null) || !id) {
        if (saved.nextFollowUpAt) await followUp.mutateAsync({ lead: saved, date: saved.nextFollowUpAt }).catch(() => {});
      }
      router.back();
    } catch (e) {
      setServerError(errMsg(e));
    }
  });

  const status = watch('status');
  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit lead' : 'New lead' }} />
      {!!serverError && <Banner tone="error" text={serverError} />}
      <FormInput control={control} name="recruiterName" label="Recruiter / contact name *" error={errors.recruiterName?.message} autoCapitalize="words" />
      <FormInput control={control} name="email" label="Email *" error={errors.email?.message} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
      <FormInput control={control} name="companyName" label="Company *" error={errors.companyName?.message} autoCapitalize="words" />
      <FormInput control={control} name="companyWebsite" label="Company website" error={errors.companyWebsite?.message} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      <FormInput control={control} name="jobTitle" label="Job title" error={errors.jobTitle?.message} autoCapitalize="words" />
      <FormInput control={control} name="jobUrl" label="Job posting URL" error={errors.jobUrl?.message} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      <FormInput control={control} name="linkedinUrl" label="LinkedIn URL (optional)" error={errors.linkedinUrl?.message} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Status</Text>
      <ChipRow>
        {LEAD_STATUSES.map((s) => <Chip key={s} label={s} active={status === s} onPress={() => setValue('status', s)} />)}
      </ChipRow>
      <Text />
      <DateField label="Next follow-up" value={watch('nextFollowUpAt')} onChange={(iso) => setValue('nextFollowUpAt', iso)} />
      <FormInput control={control} name="notes" label="Notes" error={errors.notes?.message} multiline />
      <Button title={id ? 'Save changes' : 'Add lead'} onPress={onSubmit} loading={isSubmitting} />
    </Screen>
  );
}
