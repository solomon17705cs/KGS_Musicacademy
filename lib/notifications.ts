import { Platform } from 'react-native';
import { onForegroundMessage } from './firebase';
import { profileService, notificationService, pushTokenService } from './firestore';

let Notifications: any = null;
let Device: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log('expo-notifications not available in Expo Go');
}

async function ensureAndroidChannel() {
  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1e40af',
      sound: 'default',
    });
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) {
    console.log('Push notifications require a development build');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    await ensureAndroidChannel();

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: 'bfd160cc-5071-4f86-93b6-dec7d9a291a0',
    });
    return expoPushToken.data;
  } catch (e) {
    console.log('Failed to register for push notifications:', e);
    return null;
  }
}

export async function updateBadgeCount(count: number): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (e) {
    console.log('Failed to update badge count:', e);
  }
}

export async function getBadgeCount(): Promise<number> {
  if (!Notifications) return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (e) {
    return 0;
  }
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function initializePushNotifications(userId: string): Promise<string | null> {
  console.log('[Push] Starting initialization for user:', userId);

  if (!Notifications || !Device) {
    console.log('[Push] ❌ Notifications module not available');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] ❌ Not a physical device');
    return null;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('[Push] Permission status:', status);
    if (status !== 'granted') {
      console.log('[Push] ❌ Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
        sound: 'default',
      });
      console.log('[Push] ✅ Android channel created');
    }

    const result = await Notifications.getExpoPushTokenAsync({
      projectId: 'bfd160cc-5071-4f86-93b6-dec7d9a291a0',
    });
    const expoToken = result?.data || null;
    console.log('[Push] Expo token:', expoToken);

    if (expoToken) {
      await pushTokenService.saveToken(userId, expoToken, 'expo');
      console.log('[Push] ✅ Token saved to Firestore');
    }

    console.log('[Push] ✅ Initialized for user:', userId);
    return expoToken;
  } catch (e) {
    console.log('[Push] ❌ Error:', e);
    return null;
  }
}

export function listenForForegroundMessages(callback: (notification: any) => void) {
  onForegroundMessage(callback);
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string): Promise<void> {
  if (!Notifications) {
    console.log('Push notifications require a development build');
    return;
  }
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (e) {
    console.log('Failed to send notification:', e);
  }
}

export async function sendProgressNotification(
  student: any,
  staffName: string,
  instrument: string
): Promise<void> {
  console.log('[Push] 🚀 sendProgressNotification called for:', student?.full_name);
  try {
    const parentIds = new Set<string>();
    const parentLookups: Promise<{ id: string; pushEnabled: boolean } | null>[] = [];

    if (student.father_email) {
      parentLookups.push(
        profileService.getProfileByEmail(student.father_email.toLowerCase().trim())
          .then(p => p ? { id: p.id, pushEnabled: p.notification_settings?.push_enabled ?? false } : null)
      );
    }
    if (student.mother_email) {
      parentLookups.push(
        profileService.getProfileByEmail(student.mother_email.toLowerCase().trim())
          .then(p => p ? { id: p.id, pushEnabled: p.notification_settings?.push_enabled ?? false } : null)
      );
    }
    if (student.father_phone) {
      parentLookups.push(
        profileService.getProfileByPhone(student.father_phone)
          .then(p => p ? { id: p.id, pushEnabled: p.notification_settings?.push_enabled ?? false } : null)
      );
    }
    if (student.mother_phone) {
      parentLookups.push(
        profileService.getProfileByPhone(student.mother_phone)
          .then(p => p ? { id: p.id, pushEnabled: p.notification_settings?.push_enabled ?? false } : null)
      );
    }

    const results = await Promise.all(parentLookups);
    const parentProfiles = results.filter(Boolean) as { id: string; pushEnabled: boolean }[];

    if (parentProfiles.length === 0) {
      console.log('[Push] ❌ No parent profiles found for student:', student.full_name);
      return;
    }

    const title = `Progress Updated - ${student.full_name}`;
    const body = `${student.full_name}'s ${instrument} progress has been updated by ${staffName}. Check the app for details.`;

    for (const { id: parentId, pushEnabled } of parentProfiles) {
      if (parentIds.has(parentId)) continue;
      parentIds.add(parentId);
      console.log('[Push] Parent ID:', parentId, 'Push enabled:', pushEnabled);

      await notificationService.createNotification({
        userId: parentId,
        title,
        body,
        data: { studentId: student.id, type: 'progress_update' },
        read: false,
      });

      if (pushEnabled) {
        try {
          const tokens = await pushTokenService.getTokensByUser(parentId);
          console.log('[Push] Tokens for parent', parentId, ':', tokens);

          const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
          console.log('[Push] Sending to', expoTokens.length, 'Expo tokens');

          const results = await Promise.allSettled(
            expoTokens.map(token => {
              console.log('[Push] 📤 Sending to Expo API:', { to: token, title, body });
              return fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: token,
                  title,
                  body,
                  data: { studentId: student.id, type: 'progress_update' },
                  sound: 'default',
                  priority: 'high',
                  channelId: 'default',
                }),
              })
            })
          );
          results.forEach((r, i) => {
            if (r.status === 'rejected') {
              console.log('[Push] ❌ Send failed for token', i, ':', r.reason);
            } else {
              console.log('[Push] ✅ Send result for token', i, ':', r.value.status);
            }
          });
        } catch (pushErr) {
          console.log('Failed to send push notification:', pushErr);
        }
      }
    }
  } catch (e) {
    console.log('Failed to send progress notification:', e);
  }
}

export async function sendBroadcastNotification(
  title: string,
  body: string,
  targetRole?: string
): Promise<void> {
  const profiles = await profileService.getAllProfiles();

  const filtered = targetRole
    ? profiles.filter(p => p.role === targetRole)
    : profiles;

  await Promise.allSettled(
    filtered.map(async profile => {
      await notificationService.createNotification({
        userId: profile.id,
        title,
        body,
        data: { type: 'broadcast' },
        read: false,
      });

      const tokens = await pushTokenService.getTokensByUser(profile.id);
      await Promise.allSettled(
        tokens
          .filter(t => t.startsWith('ExponentPushToken'))
          .map(token =>
            fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: token,
                title,
                body,
                data: { type: 'broadcast' },
                sound: 'default',
                priority: 'high',
                channelId: 'default',
              }),
            })
          )
      );
    })
  );
}