import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/lib/firestore';
import { User, Mail, LogOut, ChevronRight, Bell, HelpCircle, Music, Award, Clock, TrendingUp } from 'lucide-react-native';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const insets = useSafeAreaInsets();
  const [linkedStudents, setLinkedStudents] = useState<number | null>(null);

  useEffect(() => {
    if (!profile || !user) return;
    checkLinkedStudents();
  }, [profile?.id, user?.email, user?.phoneNumber]);

  async function checkLinkedStudents() {
    try {
      let students: any[] = [];
      if (user?.email) {
        students = await studentService.getStudentsByParentEmail(user.email);
      }
      if (students.length === 0 && user?.phoneNumber) {
        students = await studentService.getStudentsByParentPhone(user.phoneNumber);
      }
      if (students.length === 0 && profile?.phone) {
        students = await studentService.getStudentsByParentPhone(profile.phone);
      }
      setLinkedStudents(students.length);
    } catch {
      setLinkedStudents(0);
    }
  }

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
    return <MusicalNotesLoading text="Loading profile..." />;
  }

  return (
    <View style={styles.container(isMobile)}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>

        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${profile.full_name}&background=1e40af&color=fff&size=128` }}
              style={styles.avatarImage}
            />
          </View>
          <Text style={styles.userName}>{profile.full_name}</Text>
          <View style={styles.roleBadge}>
            <User size={12} color="#3b82f6" />
            <Text style={styles.roleText}>{getRoleLabel(profile.role)}</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Mail size={18} color="#1e40af" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            disabled={linkedStudents === null || linkedStudents > 0}
            onPress={() => Linking.openURL('https://share.google/NYSagURL03flH36By')}>
            <View style={[styles.infoIconContainer, { backgroundColor: linkedStudents === null ? '#f1f5f9' : linkedStudents > 0 ? '#f0fdf4' : '#fef2f2' }]}>
              <Award size={18} color={linkedStudents === null ? '#94a3b8' : linkedStudents > 0 ? '#16a34a' : '#ef4444'} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              {linkedStudents === null ? (
                <Text style={[styles.infoValue, { color: '#94a3b8' }]}>Checking...</Text>
              ) : linkedStudents > 0 ? (
                <Text style={[styles.infoValue, { color: '#16a34a' }]}>Active</Text>
              ) : (
                <>
                  <Text style={[styles.infoValue, { color: '#ef4444' }]}>Account Pending Activation</Text>
                  <Text style={styles.inactiveHint}>Your account is not linked to a student profile yet.</Text>
                  <Text style={styles.inactiveHint}>Please visit KGS Music Academy with your registered mobile number/ mail id to complete activation.</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {profile.role === 'parent' && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#eff6ff' }]}>
                <Music size={18} color="#1e40af" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Instrument</Text>
                <Text style={styles.infoValue}>{profile.instrument || 'Not assigned'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notification-manage')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#fdf2f8' }]}>
              <Bell size={20} color="#db2777" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuSubtext}>Manage alerts</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/support')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
              <HelpCircle size={20} color="#16a34a" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Support & Help</Text>
              <Text style={styles.menuSubtext}>Get assistance</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>KGS Music Academy v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: (isMobile: boolean) => ({
    flex: 1,
    backgroundColor: '#f8fafc',
  }),
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#1e40af',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  inactiveHint: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 1,
    lineHeight: 15,
  },
  menuSection: {
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
});