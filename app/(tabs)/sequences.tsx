import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge, Card, EmptyState, ErrorState, Fab, Loading, ScreenHeader, st } from '@/components/ui';
import { colors } from '@/constants';
import { useSequences } from '@/hooks/queries';
import { cap, errMsg, formatDateTime } from '@/utils/format';

export const seqColor = { draft: '#64748b', active: '#10b981', paused: '#f59e0b', stopped: '#64748b' } as const;

export default function SequencesTab() {
  const router = useRouter();
  const q = useSequences();
  return (
    <SafeAreaView style={st.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Sequences" subtitle="Automated follow-ups, run by the backend" />
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, flexGrow: 1 }}
          data={q.data}
          keyExtractor={(s) => s.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={<EmptyState title="No sequences yet" text="Chain an enquiry and timed follow-ups, then enroll leads." actionLabel="Create sequence" onAction={() => router.push('/sequences/edit')} />}
          renderItem={({ item: s }) => (
            <Card onPress={() => router.push(`/sequences/${s.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }} numberOfLines={1}>{s.name}</Text>
                <Badge label={cap(s.status)} color={seqColor[s.status]} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>{s.steps.length} step(s) · {s.enrolledLeadIds.length} enrolled</Text>
              {!!s.nextRunAt && <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }}>Next step {formatDateTime(s.nextRunAt)}</Text>}
            </Card>
          )}
        />
      )}
      <Fab label="New sequence" onPress={() => router.push('/sequences/edit')} />
    </SafeAreaView>
  );
}
