import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge, Card, EmptyState, ErrorState, Fab, Loading, ScreenHeader, st } from '@/components/ui';
import { campaignStatusColor, colors } from '@/constants';
import { useCampaigns } from '@/hooks/queries';
import { cap, errMsg, formatDate, formatDateTime } from '@/utils/format';

export default function CampaignsTab() {
  const router = useRouter();
  const q = useCampaigns();
  return (
    <SafeAreaView style={st.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Campaigns" subtitle={q.data ? `${q.data.length} total` : undefined} />
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, flexGrow: 1 }}
          data={q.data}
          keyExtractor={(c) => c.id}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={<EmptyState title="No campaigns yet" text="Pick leads, write one email, and send or schedule it." actionLabel="Create campaign" onAction={() => router.push('/campaigns/new')} />}
          renderItem={({ item: c }) => (
            <Card onPress={() => router.push(`/campaigns/${c.id}`)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }} numberOfLines={1}>{c.name}</Text>
                <Badge label={cap(c.status)} color={campaignStatusColor[c.status]} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                {c.recipientCount ?? c.recipients.length} recipient(s) · Created {formatDate(c.createdAt)}
              </Text>
              {!!c.scheduledAt && <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Scheduled {formatDateTime(c.scheduledAt)}</Text>}
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>
                Sent {c.stats.sent} · Bounced {c.stats.bounced} · Replied {c.stats.replied}
              </Text>
            </Card>
          )}
        />
      )}
      <Fab label="New campaign" onPress={() => router.push('/campaigns/new')} />
    </SafeAreaView>
  );
}
