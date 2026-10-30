import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Card, EmptyState, ErrorState, ListRow, Loading } from '@/components/ui';
import { Badge } from '@/components/ui';
import { colors, DATA_SOURCE } from '@/constants';
import { useLeads, useMessages, useSyncMessages } from '@/hooks/queries';
import { errMsg, formatDateTime } from '@/utils/format';

export default function Replies() {
  const router = useRouter();
  const q = useMessages();
  const leads = useLeads();
  const sync = useSyncMessages();
  const [syncError, setSyncError] = useState<string>();

  const refresh = async () => {
    setSyncError(undefined);
    if (DATA_SOURCE === 'api') {
      try { await sync.mutateAsync(); } catch (e) { setSyncError(errMsg(e)); }
    }
    await q.refetch();
  };
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const replies = (q.data ?? []).filter((m) => m.direction === 'inbound').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!!syncError && <Banner tone="error" text={`Mailbox sync failed. ${syncError}`} />}
      <FlatList
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        data={replies}
        keyExtractor={(m) => m.id}
        refreshing={q.isRefetching || sync.isPending}
        onRefresh={refresh}
        ListEmptyComponent={<EmptyState title="No replies yet" text="Replies from your connected mailbox appear here once the backend syncs them." />}
        renderItem={({ item: m }) => {
          const lead = leads.data?.find((l) => l.id === m.leadId);
          return (
            <Card>
              <ListRow bold={!m.read} title={m.subject || '(no subject)'} subtitle={`${m.fromEmail}${lead ? ` · ${lead.recruiterName}, ${lead.companyName}` : ''}\n${formatDateTime(m.createdAt)}`} onPress={() => router.push(`/replies/${m.id}`)} right={!m.read ? <Badge label="Unread" color={colors.accent} /> : undefined} />
            </Card>
          );
        }}
      />
    </View>
  );
}
