import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { profileService } from '@/lib/firestore';
import { ArrowLeft, Bell, Info } from 'lucide-react-native';

export default function NotificationManageScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(profile?.notification_settings?.push_enabled ?? true);
  const insets = useSafeAreaInsets();

  async function togglePush(value: boolean) {
    if (!user) return;
    setPushEnabled(value);
    try {
      await profileService.updateProfile(user.uid, {
        notification_settings: {
          push_enabled: value,
          email_enabled: false,
        },
      });
    } catch (err) {
      console.error('Failed to update push settings:', err);
      setPushEnabled(!value);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  }

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
                <Bell size={20} color={colors.iconBlue} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive alerts on your device</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: colors.border, true: colors.primaryBorder }}
              thumbColor={pushEnabled ? colors.primary : colors.skeleton}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Info size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Turning off notifications may cause you to miss important updates regarding classes, progress reports, and academy news.
          </Text>
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
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 16,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
