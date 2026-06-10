import { Platform } from 'react-native';
import { requestPushToken, onForegroundMessage } from './firebase';
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

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
      });
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync();
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
  if (!Notifications || !Device) {
    console.log('Push notifications require a development build');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    const fcmToken = await requestPushToken();
    if (fcmToken) {
      await pushTokenService.saveToken(userId, fcmToken, 'fcm');
    }

    let expoToken: string | null = null;
    try {
      const result = await Notifications.getExpoPushTokenAsync();
      expoToken = result?.data || null;
      if (expoToken) {
        await pushTokenService.saveToken(userId, expoToken, 'expo');
      }
    } catch (e) {
      console.log('Expo push token not available:', e);
    }

    console.log('Push tokens saved for user:', userId);
    return expoToken || fcmToken;
  } catch (e) {
    console.log('Failed to initialize push notifications:', e);
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
  try {
    const parentEmails = new Set<string>();
    if (student.father_email) parentEmails.add(student.father_email.toLowerCase().trim());
    if (student.mother_email) parentEmails.add(student.mother_email.toLowerCase().trim());

    if (parentEmails.size === 0) return;

    const title = `Progress Updated - ${student.full_name}`;
    const body = `${student.full_name}'s ${instrument} progress has been updated by ${staffName}. Check the app for details.`;

    for (const email of parentEmails) {
      const parentProfile = await profileService.getProfileByEmail(email);
      if (!parentProfile) continue;

      const pushEnabled = parentProfile.notification_settings?.push_enabled ?? false;

      await notificationService.createNotification({
        userId: parentProfile.id,
        title,
        body,
        data: { studentId: student.id, type: 'progress_update' },
        read: false,
      });

      if (pushEnabled) {
        try {
          const tokens = await pushTokenService.getTokensByUser(parentProfile.id);
          for (const token of tokens) {
            fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: token,
                title,
                body,
                data: { studentId: student.id, type: 'progress_update' },
              }),
            }).catch(() => {});
          }
        } catch (pushErr) {
          console.log('Failed to send push notification:', pushErr);
        }
      }
    }
  } catch (e) {
    console.log('Failed to send progress notification:', e);
  }
}