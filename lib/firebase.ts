import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

let messagingInstance: any = null;
export const getMessagingInstance = async () => {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!messagingInstance) {
    try {
      const { getMessaging } = await import('firebase/messaging');
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn('Firebase messaging not supported:', e);
      return null;
    }
  }
  return messagingInstance;
};

export async function requestPushToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    
    const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (e) {
    console.warn('Failed to get push token:', e);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  getMessagingInstance().then(messaging => {
    if (messaging) {
      onMessage(messaging, callback);
    }
  });
}