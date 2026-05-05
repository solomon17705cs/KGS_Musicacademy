import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, LogOut, ChevronRight, Bell, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function StaffProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  function getRoleLabel(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  const userFirstName = profile?.full_name?.split(' ')[0] || 'User';

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>

        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#7c3aed', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${profile.full_name}&background=fff&color=7c3aed&size=128` }}
              style={styles.avatarImage}
            />
          </LinearGradient>

          <Text style={styles.userName}>{profile.full_name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: '#f3e8ff' }]}>
            <Shield size={14} color="#7c3aed" />
            <Text style={[styles.roleText, { color: '#7c3aed' }]}>{getRoleLabel(profile.role)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Mail size={20} color="#64748b" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
              <ChevronRight size={18} color="#cbd5e1" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(staff)/notifications')}>
            <View style={styles.menuIconBox}>
              <Bell size={20} color="#7c3aed" />
            </View>
            <Text style={styles.menuText}>Notification Settings</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(staff)/edit-student')}>
            <View style={styles.menuIconBox}>
              <HelpCircle size={20} color="#7c3aed" />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>KGS Music Academy</Text>
          <Text style={styles.versionText}>v1.0.0 • Staff Portal</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarGradient: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoList: {
    gap: 0,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  signOutText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 4,
  },
});
