import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, FileUp, Plus, Send } from 'lucide-react-native';
import { Badge, Banner, Button, Card, ListRow, MockBanner, Screen, ScreenHeader, SectionTitle, StatCard } from '@/components/ui';
import { campaignStatusColor, CLOSED_STATUSES, colors } from '@/constants';
import { useCampaigns, useLeads, useMessages, useNotifications } from '@/hooks/queries';
import { cap, errMsg, formatDate, formatDateTime, isDueByToday } from '@/utils/format';

export default function Home() {
  const router = useRouter();
  const leads = useLeads();
  const campaigns = useCampaigns();
  const messages = useMessages();
  const notifs = useNotifications();

  const refetchAll = () => Promise.all([leads.refetch(), campaigns.refetch(), messages.refetch(), notifs.refetch()]);
  const refreshing = leads.isRefetching || campaigns.isRefetching || messages.isRefetching;
  const error = leads.error ?? campaigns.error ?? messages.error;
  const loading = leads.isLoading || messages.isLoading;

  const L = leads.data ?? [];
  const M = messages.data ?? [];
  const open = L.filter((l) => !CLOSED_STATUSES.includes(l.status));
  const stat = (n: number) => (loading || error ? '—' : n);
  const upcoming = open.filter((l) => l.nextFollowUpAt).sort((a, b) => a.nextFollowUpAt!.localeCompare(b.nextFollowUpAt!)).slice(0, 5);
  const replies = M.filter((m) => m.direction === 'inbound').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentCampaigns = (campaigns.data ?? []).slice(0, 3);
  const unread = (notifs.data ?? []).filter((n) => !n.read).length;

  return (
    <Screen edges={['top', 'left', 'right']} onRefresh={refetchAll} refreshing={refreshing} contentStyle={{ paddingTop: 0 }}>
      <ScreenHeader
        title="MailPilot"
        subtitle="Your job outreach at a glance"
        right={
          <Pressable onPress={() => router.push('/notifications')} style={{ padding: 8 }} accessibilityLabel="Notifications">
            <Bell color={colors.text} size={22} />
            {unread > 0 && (
              <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        }
      />
      <MockBanner />
      {!!error && <Banner tone="error" text={`Could not load data. ${errMsg(error)} Pull down to retry.`} />}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '8', marginBottom: 6 }}>
        <StatCard label="Total leads" value={stat(L.length)} />
        <StatCard label="Emails sent" value={stat(M.filter((m) => m.direction === 'outbound' && m.status === 'sent').length)} />
        <StatCard label="Replies received" value={stat(M.filter((m) => m.direction === 'inbound').length)} color={colors.success} />
        <StatCard label="Awaiting response" value={stat(L.filter((l) => l.status === 'Contacted').length)} color={colors.warning} />
        <StatCard label="Follow-ups due" value={stat(open.filter((l) => isDueByToday(l.nextFollowUpAt)).length)} color={colors.accentLight} />
      </View>

      <SectionTitle>Quick actions</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button small variant="secondary" title="Add lead" icon={<Plus size={16} color={colors.text} />} onPress={() => router.push('/leads/edit')} style={{ flex: 1 }} />
        <Button small variant="secondary" title="Campaign" icon={<Send size={16} color={colors.text} />} onPress={() => router.push('/campaigns/new')} style={{ flex: 1 }} />
        <Button small variant="secondary" title="Resume" icon={<FileUp size={16} color={colors.text} />} onPress={() => router.push('/documents')} style={{ flex: 1 }} />
      </View>

      <SectionTitle>Upcoming follow-ups</SectionTitle>
      <Card>
        {upcoming.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No follow-ups scheduled.</Text>
        ) : (
          upcoming.map((l) => (
            <ListRow
              key={l.id}
              title={l.recruiterName}
              subtitle={l.companyName}
              onPress={() => router.push(`/leads/${l.id}`)}
              right={<Text style={{ color: isDueByToday(l.nextFollowUpAt) ? colors.warning : colors.muted, fontSize: 12 }}>{formatDate(l.nextFollowUpAt)}</Text>}
            />
          ))
        )}
      </Card>

      <SectionTitle right={<Pressable onPress={() => router.push('/replies')}><Text style={{ color: colors.accentLight, fontSize: 13 }}>View all</Text></Pressable>}>
        Recent recruiter replies
      </SectionTitle>
      <Card>
        {replies.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No replies yet. Replies appear after the backend syncs your mailbox.</Text>
        ) : (
          replies.map((m) => (
            <ListRow key={m.id} bold={!m.read} title={m.subject || '(no subject)'} subtitle={`${m.fromEmail} · ${formatDateTime(m.createdAt)}`} onPress={() => router.push(`/replies/${m.id}`)} />
          ))
        )}
      </Card>

      <SectionTitle right={<Pressable onPress={() => router.push('/campaigns')}><Text style={{ color: colors.accentLight, fontSize: 13 }}>View all</Text></Pressable>}>
        Recent campaigns
      </SectionTitle>
      <Card>
        {recentCampaigns.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No campaigns yet.</Text>
        ) : (
          recentCampaigns.map((c) => (
            <ListRow key={c.id} title={c.name} subtitle={`${c.recipientCount ?? c.recipients.length} recipients · ${formatDate(c.createdAt)}`} onPress={() => router.push(`/campaigns/${c.id}`)} right={<Badge label={cap(c.status)} color={campaignStatusColor[c.status]} />} />
          ))
        )}
      </Card>
    </Screen>
  );
}
