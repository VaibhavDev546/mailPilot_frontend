import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants';
import { initNotifications } from '@/utils/notifications';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

export default function RootLayout() {
  useEffect(() => {
    void initNotifications().catch((error: unknown) => {
      console.error('Failed to initialize notifications.', error);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (Platform.OS !== 'web') focusManager.setFocused(s === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="leads/[id]" options={{ title: 'Lead' }} />
          <Stack.Screen name="leads/edit" options={{ title: 'Lead' }} />
          <Stack.Screen name="leads/import" options={{ title: 'Import / export' }} />
          <Stack.Screen name="campaigns/new" options={{ title: 'New campaign' }} />
          <Stack.Screen name="campaigns/[id]" options={{ title: 'Campaign' }} />
          <Stack.Screen name="sequences/[id]" options={{ title: 'Sequence' }} />
          <Stack.Screen name="sequences/edit" options={{ title: 'Sequence' }} />
          <Stack.Screen name="templates/index" options={{ title: 'Templates' }} />
          <Stack.Screen name="templates/edit" options={{ title: 'Template' }} />
          <Stack.Screen name="documents/index" options={{ title: 'Documents' }} />
          <Stack.Screen name="replies/index" options={{ title: 'Replies' }} />
          <Stack.Screen name="replies/[id]" options={{ title: 'Conversation' }} />
          <Stack.Screen name="notifications/index" options={{ title: 'Notifications' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
