import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, LogOut, ChevronRight, Bell, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
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
            colors={['#1e40af', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${profile.full_name}&background=fff&color=1e40af&size=128` }}
              style={styles.avatarImage}
            />
          </LinearGradient>

          <Text style={styles.userName}>{profile.full_name}</Text>
          <View style={styles.roleBadge}>
            <Shield size={14} color="#3b82f6" />
            <Text style={styles.roleText}>{getRoleLabel(profile.role)}</Text>
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
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <User size={20} color="#64748b" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Member Status</Text>
                <Text style={styles.infoValue}>Active Member</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Notifications', 'Push notifications are currently enabled for your account to keep you updated on student progress.')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#fdf2f8' }]}>
                <Bell size={20} color="#db2777" />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(
                'Help & Support',
                'Need assistance? Our support team is here to help.\n\n📧 Email: help@kgsacademy.com\n📞 Phone: +1 (555) 012-3456\n💬 WhatsApp: +1 (555) 987-6543\n\nHours: Mon-Fri, 9AM - 6PM'
              )}>
              <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                <HelpCircle size={20} color="#16a34a" />
              </View>
              <Text style={styles.menuText}>Support & Help</Text>
              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign Out from Academy</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>KGS Music Academy v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 32,
    marginBottom: 32,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    marginBottom: 20,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  infoList: {
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
});
