import { Tabs } from 'expo-router';
import { User, Bell } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, useWindowDimensions, View, Text, StyleSheet } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/lib/firestore';

function NotificationIcon({ color, size }: { color: string; size: number }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(() => {
    if (!user) return;
    notificationService.getUserNotifications(user.uid).then(notifications => {
      setUnreadCount(notifications.filter(n => !n.read).length);
    });
  }, [user]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  useFocusEffect(
    useCallback(() => {
      loadCount();
    }, [loadCount])
  );

  return (
    <View>
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    async function setupNavigationBar() {
      await NavigationBar.setVisibilityAsync("hidden");
    }
    if (Platform.OS !== 'web') {
      setupNavigationBar();
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          position: isMobile ? 'relative' : 'absolute',
          bottom: isMobile ? 0 : 24,
          left: isMobile ? 0 : 24,
          right: isMobile ? 0 : 24,
          height: isMobile ? 70 : 80,
          borderTopLeftRadius: isMobile ? 20 : 40,
          borderTopRightRadius: isMobile ? 20 : 40,
          borderBottomLeftRadius: isMobile ? 0 : 40,
          borderBottomRightRadius: isMobile ? 0 : 40,
          borderTopWidth: 0,
          borderTopColor: '#1e293b',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
      }}>
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons name="music-clef-treble" size={size * 1.3} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ size, color }) => <NotificationIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
