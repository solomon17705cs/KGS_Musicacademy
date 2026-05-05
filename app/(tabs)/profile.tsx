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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Student Portal</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>

        <View style={styles.profileSection}>
          {/* Left Column */}
          <View style={styles.column}>
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

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Account Info</Text>
              <View style={styles.infoItem}>
                <Mail size={18} color="#64748b" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile.email}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <User size={18} color="#64748b" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, { color: '#16a34a' }]}>Active</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            <View style={styles.menuCard}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/(tabs)/notifications')}>
                <View style={[styles.menuIconBox, { backgroundColor: '#fdf2f8' }]}>
                  <Bell size={20} color="#db2777" />
                </View>
                <Text style={styles.menuText}>Notifications</Text>
                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/(tabs)/support')}>
                <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <HelpCircle size={20} color="#16a34a" />
                </View>
                <Text style={styles.menuText}>Support & Help</Text>
                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.cardTitle}>Quick Stats</Text>
              <View style={styles.statRow}>
                <View style={[styles.statBox, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.statNumber, { color: '#1e40af' }]}>--</Text>
                  <Text style={styles.statLabel}>Rank</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[styles.statNumber, { color: '#16a34a' }]}>--</Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.versionText}>KGS Music Academy v1.0.0</Text>
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  profileSection: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarGradient: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
});
