import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Copy, Trash2 } from 'lucide-react-native';
import { Banner, Button, Card, EmptyState, ErrorState, Fab, Loading, Screen } from '@/components/ui';
import { colors, STARTER_TEMPLATES } from '@/constants';
import { useCreateTemplate, useDeleteTemplate, useTemplates } from '@/hooks/queries';
import { errMsg } from '@/utils/format';

export default function Templates() {
  const router = useRouter();
  const q = useTemplates();
  const create = useCreateTemplate();
  const del = useDeleteTemplate();
  const [err, setErr] = useState<string>();

  const addStarters = async () => {
    setErr(undefined);
    try { for (const t of STARTER_TEMPLATES) await create.mutateAsync(t); } catch (e) { setErr(errMsg(e)); }
  };
  const duplicate = async (t: { name: string; subject: string; body: string }) => {
    setErr(undefined);
    try { await create.mutateAsync({ name: `${t.name} (copy)`, subject: t.subject, body: t.body }); } catch (e) { setErr(errMsg(e)); }
  };
  const remove = (id: string, name: string) => Alert.alert('Delete template?', name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { setErr(undefined); try { await del.mutateAsync(id); } catch (e) { setErr(errMsg(e)); } } },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching} contentStyle={{ paddingBottom: 100 }}>
        {!!err && <Banner tone="error" text={err} />}
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? (
          <>
            <EmptyState title="No templates yet" text="Create your own, or add three editable starters: enquiry, follow-up and final follow-up." actionLabel="Create template" onAction={() => router.push('/templates/edit')} />
            <Button variant="secondary" title="Add starter templates" onPress={addStarters} loading={create.isPending} />
          </>
        ) : (
          q.data!.map((t) => (
            <Card key={t.id} onPress={() => router.push(`/templates/edit?id=${t.id}`)}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }} numberOfLines={1}>{t.subject}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{t.body}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <Pressable onPress={() => duplicate(t)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Copy size={15} color={colors.accentLight} /><Text style={{ color: colors.accentLight, fontSize: 13 }}>Duplicate</Text></Pressable>
                <Pressable onPress={() => remove(t.id, t.name)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Trash2 size={15} color={colors.error} /><Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text></Pressable>
              </View>
            </Card>
          ))
        )}
      </Screen>
      <Fab label="New template" onPress={() => router.push('/templates/edit')} />
    </View>
  );
}
