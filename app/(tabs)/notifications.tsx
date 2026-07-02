import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { notificationService, studentService } from '@/lib/firestore';
import { Notification } from '@/types/database';
import { ArrowLeft, Bell, BellOff, Mail, Clock } from 'lucide-react-native';
import { updateBadgeCount } from '@/lib/notifications';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';

function parseDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (dateInput.toDate) return dateInput.toDate();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadNotifications();
  }, [profile, user]);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    updateBadgeCount(unreadCount);
  }, [notifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user])
  );

  async function loadNotifications() {
    if (!user) return;

    try {
      const userNotifications = await notificationService.getUserNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
  }

  async function markAsRead(notificationId: string) {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  function getTimeAgo(dateInput: any): string {
    const date = parseDate(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return <MusicalNotesLoading text="Loading notifications..." />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.filter(n => !n.read).length} unread
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/notification-manage')}>
          <BellOff size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} colors={[colors.primary]} onRefresh={onRefresh} />
        }>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              Your notifications will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard,
                ]}
                onPress={() => router.push(`/notification/${notification.id}`)}
                activeOpacity={0.7}>
                <View style={styles.notificationIcon}>
                  <Mail size={20} color={!notification.read ? colors.iconBlue : colors.textMuted} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read && styles.unreadTitle,
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationBody}>
                    {notification.body}
                  </Text>
                  <View style={styles.notificationFooter}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={styles.notificationTime}>
                      {getTimeAgo(notification.sent_at)}
                    </Text>
                  </View>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.headerBg,
      paddingTop: 0,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 48,
      marginTop: 48,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    notificationsList: {
      padding: 16,
      gap: 12,
    },
    notificationCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    unreadCard: {
      backgroundColor: colors.primaryBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    unreadTitle: {
      color: colors.primary,
      fontWeight: '700',
    },
    notificationBody: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    notificationFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    notificationTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      alignSelf: 'center',
    },
  });
}
