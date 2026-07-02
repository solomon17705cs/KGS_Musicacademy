import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { notificationService } from '@/lib/firestore';
import { Notification } from '@/types/database';
import { ArrowLeft, Calendar, Mail } from 'lucide-react-native';
import { updateBadgeCount } from '@/lib/notifications';

function formatDate(dateInput: any): string {
  if (!dateInput) return '';
  if (dateInput.toDate) {
    const d = dateInput.toDate();
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function loadNotification() {
      if (!id) return;
      try {
        const data = await notificationService.getNotificationById(id);
        if (data) {
          setNotification(data);
          if (!data.read) {
            await notificationService.markAsRead(id);
            updateBadgeCount(0);
          }
        }
      } catch (err) {
        console.error('Failed to load notification:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotification();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (notification && !notification.read) {
          updateBadgeCount(0);
        }
      };
    }, [notification])
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notification...</Text>
        </View>
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Notification not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Mail size={24} color={colors.iconBlue} />
            </View>
            <Text style={styles.title}>{notification.title}</Text>
          </View>

          <View style={styles.dateRow}>
            <Calendar size={16} color={colors.textMuted} />
            <Text style={styles.dateText}>{formatDate(notification.sent_at)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>{notification.body}</Text>
        </View>
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
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dateText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    body: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 24,
    },
  });
}
