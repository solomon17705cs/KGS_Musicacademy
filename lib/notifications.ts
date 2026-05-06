import { Platform } from 'react-native';
import { requestPushToken, onForegroundMessage } from './firebase';
import { pushTokenService } from './firestore';

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

    const token = await requestPushToken();
    if (token) {
      await pushTokenService.saveToken(userId, token);
      console.log('Push token saved for user:', userId);
    }
    return token;
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
  if (!Notifications) {
    console.log('Push notifications require a development build');
    return;
  }
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Progress Updated - ${student.full_name}`,
        body: `Your ${instrument} progress has been updated by ${staffName}. Check the app for details.`,
        data: { studentId: student.id },
      },
      trigger: null,
    });
  } catch (e) {
    console.log('Failed to send progress notification:', e);
  }
}