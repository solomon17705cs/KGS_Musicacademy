import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useRootNavigationState, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StudentWithProgress } from '@/types/database';
import {
  Music2,
  UserPlus,
  Users,
  LogOut,
  Edit,
  TrendingUp,
  Plus,
  ChevronRight,
  Award,
  Trophy,
} from 'lucide-react-native';

export default function AdminDashboard() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait until auth state is resolved and navigation is ready before checking role
    if (authLoading || !rootNavigationState?.key) return;

    if (profile?.role !== 'admin') {
      router.replace('/login');
      return;
    }
  }, [profile, authLoading, rootNavigationState?.key]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role === 'admin') {
        loadStudents();
      }
    }, [profile?.role])
  );

  async function loadStudents() {
    try {
      setError('');
      const { data, error } = await supabase.from('students').select(`
          *,
          progress:progress_records(*)
        `);

      if (error) throw error;

      const studentsWithLatestProgress = data?.map((student: any) => ({
        ...student,
        progress: student.progress?.[student.progress.length - 1] || null,
      }));

      setStudents(studentsWithLatestProgress || []);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>KGS Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              KGS Music Academy Management
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(admin)/add-student')}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}>
              <LogOut size={20} color="#dc2626" />
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
        ) : (
          <View style={styles.studentsList}>
            {students.map((student) => (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onPress={() =>
                  router.push(`/(admin)/edit-progress/${student.id}`)
                }>
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentDetails}>
                      {student.instrument} • Joined {student.enrollment_date}
                    </Text>
                    {student.completed_grades && student.completed_grades.length > 0 && (
                      <View style={styles.achievementsBadge}>
                        <Award size={12} color="#1e40af" />
                        <Text style={styles.achievementsText}>
                          {student.completed_grades.length} Grades Completed
                          {student.completed_grades.length > 0 &&
                            ` (Latest: ${student.completed_grades[student.completed_grades.length - 1].grade})`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={20} color="#64748b" />
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
                      Updated{' '}
                      {new Date(
                        student.progress.updated_at
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    padding: 16,
    gap: 12,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentDetails: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  progressPreview: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
  },
  gradeItem: {
    flex: 1,
    gap: 6,
  },
  gradeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  gradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    width: 1,
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
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  achievementsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
  },
});
