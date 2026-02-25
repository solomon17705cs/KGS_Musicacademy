import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'web') {
        return null;
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        // Project ID is needed for Expo Push Notifications in newer SDKs
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        try {
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            console.log('Error getting expo push token:', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export async function sendLocalNotification(title: string, body: string, data: any = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
        },
        trigger: null, // send immediately
    });
}

/**
 * Mocks sending a notification to a specific user.
 * In a real app, this would send a push notification via a server.
 * Here, we'll just log it and show a local notification for testing purposes 
 * if the app is currently running as that user (or for all during testing).
 */
export async function notifyUser(userId: string, title: string, body: string) {
    console.log(`[NOTIFICATION MOCK] To User: ${userId} | Title: ${title} | Body: ${body}`);

    // For training/demo purposes, we'll also trigger a local notification
    // so the user sees something happening on their screen.
    await sendLocalNotification(title, body, { userId });
}
