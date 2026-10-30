import { Platform } from 'react-native';
import Constants from 'expo-constants';
type NotificationsModule = typeof import('expo-notifications');
let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  // Expo Go lacks the native module, so skip loading it there.
  if (Constants.appOwnership === 'expo') {
    cached = null;
    return cached;
  }
  try {
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export async function initNotifications() {
  const N = getNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      N.setNotificationChannelAsync('reminders', {
        name: 'Follow-up reminders',
        importance: N.AndroidImportance.DEFAULT,
      }).catch(() => {});
    }
  } catch {}
}

export type ReminderResult = 'scheduled' | 'denied' | 'past' | 'unavailable';

export async function scheduleFollowUpReminder(
  lead: { id: string; recruiterName: string; companyName: string },
  when: Date,
): Promise<ReminderResult> {
  if (when.getTime() <= Date.now()) return 'past';
  const N = getNotifications();
  if (!N) return 'unavailable';
  try {
    let perm = await N.getPermissionsAsync();
    if (!perm.granted) perm = await N.requestPermissionsAsync();
    if (!perm.granted) return 'denied';
    await N.scheduleNotificationAsync({
      identifier: `followup-${lead.id}`,
      content: {
        title: 'Follow-up due',
        body: `${lead.recruiterName} at ${lead.companyName}`,
        data: { leadId: lead.id },
      },
      trigger: { type: 'date', date: when, channelId: 'reminders' } as any,
    });
    return 'scheduled';
  } catch {
    return 'unavailable';
  }
}

export async function cancelFollowUpReminder(leadId: string) {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(`followup-${leadId}`);
  } catch {}
}