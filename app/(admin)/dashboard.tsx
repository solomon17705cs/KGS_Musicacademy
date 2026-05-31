import React, { useEffect, useState, useCallback } from 'react';
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
import { useRouter, useRootNavigationState, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, progressService, attendanceService } from '@/lib/firestore';
import { Student, ProgressRecord } from '@/types/database';
import {
  Users,
  LogOut,
  TrendingUp,
  Plus,
  ChevronRight,
  Award,
  Trophy,
  Bell,
  Calendar,
  Search,
  DollarSign,
} from 'lucide-react-native';

export default function AdminDashboard() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [students, setStudents] = useState<(Student & { progress?: ProgressRecord; attendancePct?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || !rootNavigationState?.key) return;

    if (profile?.role !== 'admin') {
      router.replace('/login');
      return;
    }
  }, [profile, authLoading, rootNavigationState?.key]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      setLoading(true);
      loadStudents();
    }
  }, [rootNavigationState?.key, profile?.role]);

  async function loadStudents() {
    try {
      setError('');
      const allStudents = await studentService.getAllStudents();

      const studentsWithProgress = await Promise.all(
        allStudents.map(async (student) => {
          const [progress, summary] = await Promise.all([
            progressService.getLatestProgress(student.id),
            attendanceService.getAttendanceSummary(student.id, student.enrollment_date),
          ]);
          return { ...student, progress: progress || undefined, attendancePct: summary.percentage };
        })
      );

      setStudents(studentsWithProgress);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStudents();
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleArea}>
            <Text style={styles.headerTitle} numberOfLines={1}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              KGS Music Academy
            </Text>
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
              style={[styles.quickActionBtn, { backgroundColor: '#1e40af' }]}
              onPress={() => router.push('/(admin)/add-student')}>
              <Plus size={20} color="#fff" />
              <Text style={styles.quickActionText}>Add Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => router.push('/(admin)/notifications')}>
              <Bell size={20} color="#fff" />
              <Text style={styles.quickActionText}>Notifications</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#0891b2' }]}
              onPress={() => router.push('/(admin)/attendance')}>
              <Calendar size={20} color="#fff" />
              <Text style={styles.quickActionText}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: '#b45309' }]}
              onPress={() => router.push('/(admin)/fee-payments')}>
              <DollarSign size={20} color="#fff" />
              <Text style={styles.quickActionText}>Fee Payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Users size={24} color="#1e40af" />
            <Text style={styles.statNumber}>{students.length}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#fef3c7' }]}
            onPress={() => router.push('/(admin)/leaderboard')}>
            <Trophy size={24} color="#b45309" />
            <Text style={[styles.statNumber, { color: '#b45309' }]}>
              {students.length > 0
                ? Math.max(...students.map((s) => s.streak || 0))
                : 0}
            </Text>
            <Text style={[styles.statLabel, { color: '#b45309' }]}>
              Best Streak
            </Text>
          </TouchableOpacity>
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
              Add students to start tracking their progress
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
                    router.push(`/(admin)/edit-progress/${student.id}`)
                  }>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name}</Text>
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
                            styles.feeStatusBadgeText,
                            {
                              color: student.fee_status === 'paid' ? '#16a34a' : student.fee_status === 'pending' ? '#f97316' : '#ef4444',
                            }
                          ]}>
                            Fee: {student.fee_status || 'pending'}
                          </Text>
                        </View>
                      </View>
                      {student.completed_grades && student.completed_grades.length > 0 && (
                        <View style={styles.achievementsBadge}>
                          <Award size={12} color="#1e40af" />
                          <Text style={styles.achievementsText}>
                            {student.completed_grades.length} Grades
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {student.progress ? (
                    <View style={styles.progressPreview}>
                      <View style={styles.gradeItem}>
                        <Text style={styles.gradeLabel}>Theory</Text>
                        <View style={styles.gradeInfo}>
                          <Text style={styles.gradeValue}>
                            {student.progress.theory_grade || 'N/A'}
                          </Text>
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: getStatusColor(
                                  student.progress.theory_status
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.gradeItem}>
                        <Text style={styles.gradeLabel}>Practical</Text>
                        <View style={styles.gradeInfo}>
                          <Text style={styles.gradeValue}>
                            {student.progress.practical_grade || 'N/A'}
                          </Text>
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: getStatusColor(
                                  student.progress.practical_status
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noProgressBadge}>
                      <Text style={styles.noProgressText}>No progress yet</Text>
                    </View>
                  )}

                  {student.progress && (
                    <View style={styles.updateInfo}>
                      <TrendingUp size={12} color="#64748b" />
                      <Text style={styles.updateText}>
                        {(() => {
                          const dateStr = student.progress!.updated_at;
                          const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate();
                          if (isNaN(d.getTime())) return 'never';
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const yesterday = new Date(today);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const progressDate = new Date(d);
                          progressDate.setHours(0, 0, 0, 0);
                          if (progressDate.getTime() === today.getTime()) return 'Updated today';
                          if (progressDate.getTime() === yesterday.getTime()) return 'Updated yesterday';
                          return `Updated ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                        })()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View >
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
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleArea: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  quickActions: {
    gap: 10,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e40af',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
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
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  studentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  studentCardWrapper: {
    width: '48%',
  },
  studentCard: {
    width: '100%',
    minHeight: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
    width: '100%',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentDetails: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  feeStatusRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  feeStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  feeStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  attendanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  attendanceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  progressPreview: {
    flexDirection: 'column',
    gap: 6,
    paddingVertical: 8,
  },
  gradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  gradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  noProgressBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  noProgressText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  updateText: {
    fontSize: 11,
    color: '#64748b',
  },
  achievementsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  achievementsText: {
    fontSize: 9,
    color: '#1e40af',
    fontWeight: '600',
  },
});
