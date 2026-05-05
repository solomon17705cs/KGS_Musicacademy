import { Platform } from 'react-native';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';
import { studentService, profileService, notificationService } from './firestore';
import { Student } from '@/types/database';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const messaging = getMessagingInstance();
  if (Platform.OS === 'web' || !messaging) {
    console.log('[NOTIFICATIONS] Push notifications not supported on this platform');
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY,
    });

    if (token) {
      console.log('[NOTIFICATIONS] FCM Token obtained:', token);
      return token;
    }

    console.log('[NOTIFICATIONS] No registration token available.');
    return null;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error getting FCM token:', error);
    return null;
  }
}

export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    await profileService.updateProfile(userId, { fcm_token: token });
    console.log('[NOTIFICATIONS] FCM token saved for user:', userId);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error saving FCM token:', error);
  }
}

export async function sendProgressNotification(
  student: Student,
  instructorName: string,
  instrument: string
): Promise<void> {
  const title = 'New Progress Update';
  const body = `Your instructor ${instructorName} has updated progress for ${instrument}. Check it out!`;

  if (student.user_id) {
    await notifyUser(student.user_id, title, body);
  }

  if (student.parent_email) {
    const allProfiles = await profileService.getAllProfiles();
    const parentProfiles = allProfiles.filter(p => p.email.toLowerCase() === student.parent_email!.toLowerCase());
    
    for (const parentProfile of parentProfiles) {
      await notifyUser(
        parentProfile.id,
        'Student Progress Update',
        `Update for ${student.full_name}: ${body}`
      );
    }
  }

  console.log('[NOTIFICATIONS] Progress notification sent for student:', student.full_name);
}

export async function notifyUser(userId: string, title: string, body: string, data: Record<string, any> = {}): Promise<void> {
  try {
    await notificationService.createNotification({
      userId,
      title,
      body,
      data,
      read: false,
    });

    console.log('[NOTIFICATIONS] Notification created for user:', userId, title, body);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error creating notification:', error);
  }
}

export async function sendBroadcastNotification(
  title: string,
  body: string,
  targetRole?: 'student' | 'admin'
): Promise<void> {
  console.log('[NOTIFICATIONS] Broadcast notification:', title, body, targetRole || 'all');
  
  const message = `Admin broadcast: ${body}`;
  const sentToEmails = new Set<string>();
  
  try {
    const profiles = await profileService.getAllProfiles();
    
    for (const profile of profiles) {
      if (targetRole && profile.role !== targetRole) continue;
      
      await notificationService.createNotification({
        userId: profile.id,
        title,
        body: message,
        read: false,
      });
    }

    if (targetRole === 'student' || targetRole === undefined) {
      const allStudents = await studentService.getAllStudents();
      for (const student of allStudents) {
        if (student.parent_email && !sentToEmails.has(student.parent_email)) {
          sentToEmails.add(student.parent_email);
          const parentProfiles = profiles.filter(p => p.email.toLowerCase() === student.parent_email!.toLowerCase());
          for (const parentProfile of parentProfiles) {
            await notificationService.createNotification({
              userId: parentProfile.id,
              title,
              body: message,
              read: false,
            });
          }
        }
      }
    }
    
    console.log('[NOTIFICATIONS] Broadcast notification sent');
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending broadcast:', error);
  }
}

export function setupForegroundNotificationListener() {
  const messaging = getMessagingInstance();
  if (Platform.OS === 'web' || !messaging) {
    console.log('[NOTIFICATIONS] Foreground listener not supported on web');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('[NOTIFICATIONS] Foreground message received:', payload);
  });
}
