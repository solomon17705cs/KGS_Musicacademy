import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { studentService } from '@/lib/firestore';
import { User, Mail, LogOut, ChevronRight, Bell, HelpCircle, Music, Award, Clock, TrendingUp, Calendar, Moon, Sun } from 'lucide-react-native';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';

const APP_VERSION = require('../../package.json').version;

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
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

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!profile) {
    return <MusicalNotesLoading text="Loading profile..." />;
  }

  return (
    <View style={styles.container}>
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
            <User size={12} color={colors.iconBlue} />
            <Text style={styles.roleText}>{getRoleLabel(profile.role)}</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
              <Mail size={18} color={colors.iconBlue} />
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
            <View style={[styles.infoIconContainer, { backgroundColor: linkedStudents === null ? colors.borderLight : linkedStudents > 0 ? colors.successBg : colors.errorBg }]}>
              <Award size={18} color={linkedStudents === null ? colors.textMuted : linkedStudents > 0 ? colors.success : colors.error} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              {linkedStudents === null ? (
                <Text style={[styles.infoValue, { color: colors.textMuted }]}>Checking...</Text>
              ) : linkedStudents > 0 ? (
                <Text style={[styles.infoValue, { color: colors.success }]}>Active</Text>
              ) : (
                <>
                  <Text style={[styles.infoValue, { color: colors.error }]}>Account Pending Activation</Text>
                  <Text style={styles.inactiveHint}>Your account is not linked to a student profile yet.</Text>
                  <Text style={styles.inactiveHint}>Please visit KGS Music Academy with your registered mobile number/ mail id to complete activation.</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {profile.role === 'parent' && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                <Music size={18} color={colors.iconBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Instrument</Text>
                <Text style={styles.infoValue}>{profile.instrument || 'Not assigned'}</Text>
              </View>
            </View>
          )}
        </View>

        {profile.role === 'parent' && linkedStudents !== null && linkedStudents > 0 && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Student Detail</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/student-attendance')}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.successBg }]}>
                <Calendar size={20} color={colors.success} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Attendance</Text>
                <Text style={styles.menuSubtext}>View attendance records</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notification-manage')}>
            <View style={[styles.menuIconBox, { backgroundColor: colors.primaryBg }]}>
              <Bell size={20} color={colors.iconBlue} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuSubtext}>Manage alerts</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/support')}>
            <View style={[styles.menuIconBox, { backgroundColor: colors.successBg }]}>
              <HelpCircle size={20} color={colors.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Support & Help</Text>
              <Text style={styles.menuSubtext}>Get assistance</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <View style={[styles.menuIconBox, { backgroundColor: colors.warningBg }]}>
              {isDark ? <Sun size={20} color={colors.warning} /> : <Moon size={20} color={colors.warning} />}
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Theme</Text>
              <Text style={styles.menuSubtext}>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>KGS Music Academy v{APP_VERSION}</Text>
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
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      backgroundColor: colors.headerBg,
      paddingTop: 0,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      shadowColor: colors.shadow,
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
      borderColor: colors.primary,
    },
    userName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primaryBg,
      borderRadius: 20,
      marginTop: 8,
    },
    roleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryLight,
    },
    accountCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    infoIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginTop: 2,
    },
    inactiveHint: {
      fontSize: 11,
      color: colors.error,
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
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: colors.shadow,
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
      color: colors.text,
    },
    menuSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 10,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.error,
    },
    versionText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },
  });
}
