import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/database';
import { StudentWithProgress } from '@/types/database';
import { Music2, TrendingUp, BookOpen, Award, Trophy, Crown, Flame } from 'lucide-react-native';

export default function ProgressScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudentProgress();
  }, [profile]);

  async function loadStudentProgress() {
    if (!profile) return;

    try {
      setError('');
      let query = supabase.from('students').select(`
          *,
          progress:progress_records(*)
        `);

      if (profile.role === 'student') {
        query = query.eq('user_id', profile.id);
      } else if (profile.role === 'parent') {
        query = query.eq('parent_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const studentsWithLatestProgress = data?.map((student: any) => ({
        ...student,
        progress: student.progress?.[student.progress.length - 1] || null,
      }));

      setStudents(studentsWithLatestProgress || []);

      // If parent, also load top 3 students for leaderboard
      if (profile.role === 'parent') {
        const { data: topData, error: topError } = await supabase
          .from('students')
          .select('*')
          .order('points', { ascending: false })
          .limit(3);

        if (!topError) {
          setTopStudents(topData || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStudentProgress();
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

  function getStatusLabel(status: string) {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        <Image
          source={require('../../Images/logo1.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>KGS Music Academy</Text>
        <Text style={styles.headerSubtitle}>
          {profile?.role === 'parent'
            ? 'Track your child\'s musical journey'
            : 'Track your musical journey'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {profile?.role === 'parent' && topStudents.length > 0 && (
          <View style={styles.leaderboardContainer}>
            <View style={styles.leaderboardHeader}>
              <Trophy size={20} color="#fbbf24" />
              <Text style={styles.leaderboardTitle}>KGS Top Performers</Text>
            </View>
            <View style={styles.leaderboardList}>
              {topStudents.map((student, index) => (
                <View key={student.id} style={styles.leaderboardItem}>
                  <View style={styles.rankBadge}>
                    {index === 0 ? (
                      <Crown size={16} color="#fbbf24" />
                    ) : (
                      <Text style={styles.rankText}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.leaderboardStudentInfo}>
                    <Text style={styles.leaderboardStudentName}>
                      {student.full_name}
                    </Text>
                    <Text style={styles.leaderboardStudentPoints}>
                      {student.points || 0} XP
                    </Text>
                  </View>
                  {index === 0 && (
                    <View style={styles.topStreakBadge}>
                      <Flame size={12} color="#f97316" />
                      <Text style={styles.topStreakText}>
                        {student.streak || 0}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music2 size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Progress Records</Text>
            <Text style={styles.emptyText}>
              {profile?.role === 'parent'
                ? 'Your child has not been enrolled yet. Please contact the academy.'
                : 'You have not been enrolled yet. Please contact the academy.'}
            </Text>
          </View>
        ) : (
          students.map((student) => (
            <View key={student.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.full_name}</Text>
                  <Text style={styles.instrument}>{student.instrument}</Text>
                </View>
                <View style={styles.enrollmentBadge}>
                  <Text style={styles.enrollmentText}>
                    Since {new Date(student.enrollment_date).getFullYear()}
                  </Text>
                </View>
              </View>

              {student.progress ? (
                <View style={styles.progressContainer}>
                  <View style={styles.gradeSection}>
                    <View style={styles.gradeHeader}>
                      <BookOpen size={20} color="#1e40af" />
                      <Text style={styles.gradeTitle}>Theory</Text>
                    </View>
                    <Text style={styles.gradeLevel}>
                      {student.progress.theory_grade || 'Not assigned'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(student.progress.theory_status) +
                            '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(
                              student.progress.theory_status
                            ),
                          },
                        ]}>
                        {getStatusLabel(student.progress.theory_status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.gradeSection}>
                    <View style={styles.gradeHeader}>
                      <Award size={20} color="#1e40af" />
                      <Text style={styles.gradeTitle}>Practical</Text>
                    </View>
                    <Text style={styles.gradeLevel}>
                      {student.progress.practical_grade || 'Not assigned'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(student.progress.practical_status) +
                            '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(
                              student.progress.practical_status
                            ),
                          },
                        ]}>
                        {getStatusLabel(student.progress.practical_status)}
                      </Text>
                    </View>
                  </View>

                  {student.progress.notes ? (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>Instructor Notes</Text>
                        <Text style={styles.notesText}>
                          {student.progress.notes}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  <View style={styles.updateInfo}>
                    <TrendingUp size={14} color="#64748b" />
                    <Text style={styles.updateText}>
                      Last updated{' '}
                      {new Date(
                        student.progress.updated_at
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noProgressContainer}>
                  <Text style={styles.noProgressText}>
                    No progress recorded yet
                  </Text>
                </View>
              )}
            </View>
          ))
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
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  instrument: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  enrollmentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  enrollmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  progressContainer: {
    gap: 16,
  },
  gradeSection: {
    gap: 8,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  gradeLevel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  notesSection: {
    gap: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#64748b',
  },
  noProgressContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noProgressText: {
    fontSize: 14,
    color: '#64748b',
  },
  leaderboardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  leaderboardStudentInfo: {
    flex: 1,
  },
  leaderboardStudentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  leaderboardStudentPoints: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
    marginTop: 2,
  },
  topStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  topStreakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f97316',
  },
});
