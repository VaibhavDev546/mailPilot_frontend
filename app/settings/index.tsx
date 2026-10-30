import React, { useEffect, useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banner, Button, Card, FormInput, Input, KeyValue, Loading, MockBanner, Screen, SectionTitle } from '@/components/ui';
import { API_URL, colors, DATA_SOURCE } from '@/constants';
import { useConnectGmail, useDisconnectGmail, useHealth, useSettings, useUpdateSettings } from '@/hooks/queries';
import { tokenStore } from '@/services';
import { errMsg } from '@/utils/format';

const int = (min: number, max: number, label: string) => z.string().regex(/^\d+$/, `${label} must be a whole number`).refine((v) => +v >= min && +v <= max, `${label} must be ${min}–${max}`);
const schema = z.object({
  senderName: z.string().trim().max(120, 'Your name must be 120 characters or fewer'),
  signature: z.string().max(2000, 'Signature must be 2,000 characters or fewer'),
  timezone: z.string().trim().min(1, 'Enter a time zone'),
  sendWindowStartHour: int(0, 23, 'Start hour'),
  sendWindowEndHour: int(1, 24, 'End hour'),
  defaultFollowUpDays: int(1, 60, 'Follow-up delay'),
  dailySendLimit: int(1, 500, 'Daily limit'),
  sendIntervalSeconds: int(5, 3600, 'Send interval'),
});
type V = z.infer<typeof schema>;

export default function SettingsScreen() {
  const q = useSettings();
  const health = useHealth();
  const save = useUpdateSettings();
  const connect = useConnectGmail();
  const disconnect = useDisconnectGmail();
  const [sendOnWeekends, setSendOnWeekends] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { senderName: '', signature: '', timezone: 'UTC', sendWindowStartHour: '9', sendWindowEndHour: '18', defaultFollowUpDays: '5', dailySendLimit: '50', sendIntervalSeconds: '20' },
  });

  useEffect(() => {
    tokenStore.get().then((t) => setHasToken(!!t)).catch((error: unknown) => {
      setMsg({ tone: 'error', text: `Could not read the saved API token. ${errMsg(error)}` });
    });
  }, []);
  useEffect(() => {
    if (q.data) {
      const s = q.data;
      reset({
        senderName: s.senderName,
        signature: s.signature,
        timezone: s.timezone,
        sendWindowStartHour: String(s.sendWindowStartHour),
        sendWindowEndHour: String(s.sendWindowEndHour),
        defaultFollowUpDays: String(s.defaultFollowUpDays),
        dailySendLimit: String(s.dailySendLimit),
        sendIntervalSeconds: String(s.sendIntervalSeconds),
      });
      setSendOnWeekends(s.sendOnWeekends);
    }
  }, [q.data, reset]);

  const gmail = q.data?.gmail;

  const onSave = handleSubmit(async (v) => {
    setMsg(undefined);
    try {
      await save.mutateAsync({
        senderName: v.senderName.trim(),
        signature: v.signature,
        timezone: v.timezone.trim(),
        sendWindowStartHour: +v.sendWindowStartHour,
        sendWindowEndHour: +v.sendWindowEndHour,
        sendOnWeekends,
        defaultFollowUpDays: +v.defaultFollowUpDays,
        dailySendLimit: +v.dailySendLimit,
        sendIntervalSeconds: +v.sendIntervalSeconds,
      });
      setMsg({ tone: 'success', text: 'Settings saved.' });
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  });

  const doConnect = async () => {
    setMsg(undefined);
    try {
      const { authUrl } = await connect.mutateAsync(undefined as never);
      await Linking.openURL(authUrl);
      setMsg({ tone: 'success', text: 'Finish signing in with Google in your browser, then return here and pull to refresh.' });
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const doDisconnect = async () => {
    setMsg(undefined);
    try { await disconnect.mutateAsync(undefined as never); setMsg({ tone: 'success', text: 'Gmail disconnected.' }); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const saveToken = async () => {
    try {
      if (token.trim()) { await tokenStore.set(token.trim()); setHasToken(true); }
      else { await tokenStore.clear(); setHasToken(false); }
      setToken('');
      setMsg({ tone: 'success', text: 'API token updated on this device.' });
      void health.refetch();
      void q.refetch();
    }
    catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };

  return (
    <Screen onRefresh={() => { q.refetch(); health.refetch(); }} refreshing={q.isRefetching}>
      <MockBanner />
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}

      {q.isLoading && <Loading />}
      {q.isError && <Banner tone="error" text={`${errMsg(q.error)} Save or update your API token below, then retry.`} />}

      {q.data && (
        <>
          <SectionTitle>Sender</SectionTitle>
          <FormInput control={control} name="senderName" label="Your name" error={errors.senderName?.message} autoCapitalize="words" />
          <FormInput control={control} name="signature" label="Email signature" error={errors.signature?.message} multiline />

          <SectionTitle>Sending</SectionTitle>
          <FormInput control={control} name="timezone" label="IANA time zone" error={errors.timezone?.message} autoCapitalize="none" placeholder="e.g. Asia/Kolkata" />
          <FormInput control={control} name="sendWindowStartHour" label="Send window start hour (0–23)" error={errors.sendWindowStartHour?.message} keyboardType="number-pad" />
          <FormInput control={control} name="sendWindowEndHour" label="Send window end hour (1–24)" error={errors.sendWindowEndHour?.message} keyboardType="number-pad" />
          <FormInput control={control} name="defaultFollowUpDays" label="Default follow-up delay (days)" error={errors.defaultFollowUpDays?.message} keyboardType="number-pad" />
          <FormInput control={control} name="dailySendLimit" label="Daily sending limit" error={errors.dailySendLimit?.message} keyboardType="number-pad" />
          <FormInput control={control} name="sendIntervalSeconds" label="Send interval (seconds)" error={errors.sendIntervalSeconds?.message} keyboardType="number-pad" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, flex: 1 }}>Send on weekends</Text>
              <Switch value={sendOnWeekends} onValueChange={setSendOnWeekends} trackColor={{ true: colors.accent, false: colors.cardAlt }} />
            </View>
          </Card>
          <Button title="Save settings" onPress={onSave} loading={isSubmitting || save.isPending} />

          <SectionTitle>Gmail</SectionTitle>
          <Card>
            <KeyValue k="Status" v={gmail?.connected ? 'Connected' : 'Not connected'} />
            {!!gmail?.email && <KeyValue k="Account" v={gmail.email} />}
            <Text style={{ color: colors.faint, fontSize: 12, marginVertical: 8 }}>Sign-in happens in your browser through the backend. Google tokens and client secrets never reach this app.</Text>
            {gmail?.connected ? (
              <Button variant="danger" title="Disconnect Gmail" onPress={doDisconnect} loading={disconnect.isPending} />
            ) : (
              <Button title="Connect Gmail" onPress={doConnect} loading={connect.isPending} />
            )}
          </Card>
        </>
      )}
      <SectionTitle>Backend</SectionTitle>
      <Card>
        <KeyValue k="Data source" v={DATA_SOURCE === 'api' ? 'Real API' : 'Mock (in memory)'} />
        <KeyValue k="API URL" v={API_URL || 'Not set'} />
        <KeyValue k="Connection" v={health.isLoading ? 'Checking…' : health.isError ? `Unreachable: ${errMsg(health.error)}` : 'Reachable'} />
        <KeyValue k="API token" v={hasToken ? 'Saved on this device' : 'None'} />
        <View style={{ height: 8 }} />
        <Input label="Set API token (leave empty and save to remove)" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button small variant="secondary" title="Save token" onPress={saveToken} style={{ flex: 1 }} />
          <Button small variant="secondary" title="Recheck" onPress={() => health.refetch()} style={{ flex: 1 }} />
        </View>
      </Card>
    </Screen>
  );
}
