import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function NavigationGuard() {
  useProtectedRoute();
  return null;
}

function NotificationHandler() {
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    return () => sub.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    async function setupNavigationBar() {
      await NavigationBar.setVisibilityAsync("hidden");
    }
    setupNavigationBar();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationHandler />
        <NavigationGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
