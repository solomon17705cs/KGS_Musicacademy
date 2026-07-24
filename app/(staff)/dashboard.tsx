import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useRootNavigationState, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, progressService, attendanceService } from '@/lib/firestore';
import { Student, ProgressRecord } from '@/types/database';
import {
  LogOut,
  TrendingUp,
  ChevronRight,
  Award,
  Trophy,
  Bell,
  Calendar,
  Search,
  Layers,
  DollarSign,
  Users,
} from 'lucide-react-native';

export default function StaffDashboard() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [students, setStudents] = useState<(Student & { progress?: ProgressRecord; attendancePct?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (authLoading || !rootNavigationState?.key) return;

    if (profile?.role !== 'staff') {
      router.replace('/login');
      return;
    }
  }, [profile, authLoading, rootNavigationState?.key]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role === 'staff') {
        loadStudents(!hasLoaded.current);
        hasLoaded.current = true;
      }
    }, [rootNavigationState?.key, profile?.role])
  );

  async function loadStudents(showLoader: boolean) {
    if (showLoader) setLoading(true);
    try {
      setError('');
      const allStudents = await studentService.getAllStudents();

      const studentsWithProgress = await Promise.all(
        allStudents.map(async (student) => {
          const [progress, summary] = await Promise.all([
            progressService.getLatestProgress(student.id),
            attendanceService.getAttendanceSummary(student.id, student.enrollment_date, student.summer_class),
          ]);
          return { ...student, progress: progress || undefined, attendancePct: summary.percentage };
        })
      );

      setStudents(studentsWithProgress);
    } catch (err: any) {
      if (showLoader) setError(err.message || 'Failed to load students');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStudents(true);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'excellent':
        return '#22c55e';
      case 'good':
        return '#3b82f6';
      case 'needs_improvement':
        return '#f59e0b';
      case 'struggling':
        return '#ef4444';
      default:
        return '#64748b';
    }
  }

  const filteredStudents = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleArea}>
            <Text style={styles.headerTitle} numberOfLines={1}>Staff Dashboard</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitle}>KGS Music Academy</Text>
              <Text style={styles.studentCount}>({students.length} students)</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => router.push('/(staff)/notifications')}>
              <Bell size={20} color="#fff" />
              <Text style={styles.quickActionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#0891b2' }]}
              onPress={() => router.push('/(staff)/attendance')}>
              <Calendar size={20} color="#fff" />
              <Text style={styles.quickActionText}>Attendance</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#059669' }]}
              onPress={() => router.push('/(staff)/class-days')}>
              <Layers size={20} color="#fff" />
              <Text style={styles.quickActionText}>Class Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.streakChip, { backgroundColor: '#fef3c7' }]}
              onPress={() => router.push('/(staff)/leaderboard')}>
              <Trophy size={16} color="#b45309" />
              <Text style={[styles.streakChipNumber, { color: '#b45309' }]}>
                {students.length > 0
                  ? Math.max(...students.map((s) => s.streak || 0))
                  : 0}
              </Text>
              <Text style={[styles.streakChipLabel, { color: '#b45309' }]}>
                Best Streak
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      {students.length > 0 && (
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Students Yet</Text>
            <Text style={styles.emptyText}>
              Students will appear here once added
            </Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>No student matches "{search}"</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {filteredStudents.map((student, idx) => (
              <View
                key={student.id}
                style={styles.studentCardWrapper}>
                <TouchableOpacity
                  style={styles.studentCard}
                  onPress={() =>
                    router.push(`/(staff)/edit-progress/${student.id}`)
                  }>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name}{student.summer_class ? ' ☀️' : ''}</Text>
                      <Text style={styles.studentDetails}>
                        {student.instrument} • {student.enrollment_date}
                      </Text>
                      <View style={styles.feeStatusRow}>
                        <View style={[
                          styles.feeStatusBadge,
                          {
                            backgroundColor: student.fee_status === 'paid' ? '#f0fdf4' : student.fee_status === 'pending' ? '#fff7ed' : '#fee2e2',
                          }
                        ]}>
                          <Text style={[
                            styles.feeStatusText,
                            {
                              color: student.fee_status === 'paid' ? '#16a34a' : student.fee_status === 'pending' ? '#ea580c' : '#dc2626',
                            }
                          ]}>
                            {student.fee_status === 'paid' ? 'Paid' : student.fee_status === 'pending' ? 'Pending' : 'Overdue'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.studentStats}>
                      <View style={styles.attendanceBadge}>
                        <Text style={styles.attendanceText}>
                          {student.attendancePct?.toFixed(0) || 0}%
                        </Text>
                        <Text style={styles.attendanceLabel}>Attendance</Text>
                      </View>
                    </View>
                  </View>

                  {student.progress ? (
                    <View style={styles.progressPreview}>
                      <View style={styles.gradeRow}>
                        <Text style={styles.gradeLabel}>Theory:</Text>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.progress.theory_status) }]} />
                        <Text style={styles.gradeText}>{student.progress.theory_grade || 'N/A'}</Text>
                        <Text style={styles.gradeSpacer}>|</Text>
                        <Text style={styles.gradeLabel}>Practical:</Text>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.progress.practical_status) }]} />
                        <Text style={styles.gradeText}>{student.progress.practical_grade || 'N/A'}</Text>
                      </View>
                      {student.progress.notes ? (
                        <Text style={styles.notesPreview} numberOfLines={2}>
                          {student.progress.notes}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.noProgress}>
                      <Text style={styles.noProgressText}>No progress recorded yet</Text>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={styles.streakText}>
                      <Text style={{ fontWeight: '700' }}>Streak: </Text>
                      {student.streak || 0} weeks
                    </Text>
                    <ChevronRight size={18} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleArea: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  studentCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  streakChipNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  streakChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    gap: 8,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  studentsList: {
    padding: 16,
    gap: 12,
  },
  studentCardWrapper: {
    width: '100%',
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentDetails: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  feeStatusRow: {
    marginTop: 6,
  },
  feeStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  feeStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  studentStats: {
    alignItems: 'center',
  },
  attendanceBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  attendanceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
  },
  attendanceLabel: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '500',
  },
  progressPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gradeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  gradeText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  gradeSpacer: {
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notesPreview: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  noProgress: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  noProgressText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  streakText: {
    fontSize: 13,
    color: '#64748b',
  },
});
