import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, FileText, Inbox, LayoutTemplate, Settings as Cog } from 'lucide-react-native';
import { Card, MockBanner, Screen, ScreenHeader } from '@/components/ui';
import { colors } from '@/constants';
import { useMessages, useNotifications } from '@/hooks/queries';

export default function More() {
  const router = useRouter();
  const msgs = useMessages();
  const notifs = useNotifications();
  const unreadReplies = (msgs.data ?? []).filter((m) => m.direction === 'inbound' && !m.read).length;
  const unreadNotifs = (notifs.data ?? []).filter((n) => !n.read).length;
  const items = [
    { label: 'Templates', icon: LayoutTemplate, to: '/templates', count: 0 },
    { label: 'Documents', icon: FileText, to: '/documents', count: 0 },
    { label: 'Replies', icon: Inbox, to: '/replies', count: unreadReplies },
    { label: 'Notifications', icon: Bell, to: '/notifications', count: unreadNotifs },
    { label: 'Settings', icon: Cog, to: '/settings', count: 0 },
  ];
  return (
    <Screen edges={['top', 'left', 'right']} contentStyle={{ paddingTop: 0 }}>
      <ScreenHeader title="More" />
      <MockBanner />
      <Card style={{ paddingVertical: 4 }}>
        {items.map((it, i) => (
          <Card key={it.label} onPress={() => router.push(it.to as any)} style={{ borderWidth: 0, marginBottom: 0, paddingHorizontal: 0, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderRadius: 0, backgroundColor: 'transparent', borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <it.icon size={20} color={colors.accentLight} />
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{it.label}</Text>
              {it.count > 0 && <View style={{ backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{it.count}</Text></View>}
              <ChevronRight size={18} color={colors.faint} />
            </View>
          </Card>
        ))}
      </Card>
    </Screen>
  );
}
