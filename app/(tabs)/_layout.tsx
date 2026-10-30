import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Menu, Repeat, Send, Users } from 'lucide-react-native';
import { colors } from '@/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accentLight,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: ({ color, size }) => <Send color={color} size={size} /> }} />
      <Tabs.Screen name="sequences" options={{ title: 'Sequences', tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }} />
    </Tabs>
  );
}
