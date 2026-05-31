import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/lib/firestore';
import { ArrowLeft, Bell, Info } from 'lucide-react-native';

export default function NotificationManageScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(profile?.notification_settings?.push_enabled ?? true);

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
      setPushEnabled(!value); // Rollback
      Alert.alert('Error', 'Failed to update notification settings');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                <Bell size={20} color="#1e40af" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive alerts on your device</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={pushEnabled ? '#1e40af' : '#f8fafc'}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Info size={20} color="#64748b" />
          <Text style={styles.infoText}>
            Turning off notifications may cause you to miss important updates regarding classes, progress reports, and academy news.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
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
    borderBottomColor: '#f1f5f9',
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
    color: '#1e293b',
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
