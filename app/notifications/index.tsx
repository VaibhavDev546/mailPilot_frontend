import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Bell, CheckCircle2, Mail, PauseCircle } from 'lucide-react-native';
import { Button, EmptyState, ErrorState, Loading } from '@/components/ui';
import { colors } from '@/constants';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/queries';
import type { AppNotification } from '@/types';
import { errMsg, formatDateTime } from '@/utils/format';

const icon = (t: AppNotification['type']) => {
  switch (t) {
    case 'follow_up_due': return <Bell size={20} color={colors.warning} />;
    case 'reply_received': return <Mail size={20} color={colors.success} />;
    case 'campaign_completed': return <CheckCircle2 size={20} color={colors.accentLight} />;
    case 'send_failure': return <AlertTriangle size={20} color={colors.error} />;
    case 'sequence_paused': return <PauseCircle size={20} color={colors.warning} />;
    case 'campaign_failed':
    case 'sequence_failed':
    case 'email_bounced': return <AlertTriangle size={20} color={colors.error} />;
    case 'gmail_disconnected':
    case 'system': return <Bell size={20} color={colors.warning} />;
  }
};
const route = (t: NonNullable<AppNotification['target']>) => ({ lead: `/leads/${t.id}`, campaign: `/campaigns/${t.id}`, sequence: `/sequences/${t.id}`, reply: `/replies/${t.id}` }[t.type]);

export default function Notifications() {
  const router = useRouter();
  const q = useNotifications();
  const read = useMarkNotificationRead();
  const readAll = useMarkAllNotificationsRead();
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  const items = [...(q.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((n) => !n.read).length;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {unread > 0 && <View style={{ padding: 16, paddingBottom: 0 }}><Button small variant="secondary" title={`Mark all ${unread} as read`} onPress={() => readAll.mutate()} loading={readAll.isPending} /></View>}
      <FlatList
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        data={items}
        keyExtractor={(n) => n.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListEmptyComponent={<EmptyState title="No notifications" text="Follow-ups, replies, campaign results and failures will show up here." />}
        renderItem={({ item: n }) => (
          <Pressable
            onPress={() => { if (!n.read) read.mutate(n.id); if (n.target) router.push(route(n.target) as any); }}
            style={{ flexDirection: 'row', gap: 12, padding: 14, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: n.read ? colors.border : colors.accent + '88', backgroundColor: n.read ? colors.card : colors.accentBg }}
          >
            {icon(n.type)}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: n.read ? '500' : '700' }}>{n.title}</Text>
              {!!n.body && <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{n.body}</Text>}
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }}>{formatDateTime(n.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
