import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/database';
import { StudentWithProgress } from '@/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Music2,
  TrendingUp,
  BookOpen,
  Award,
  Trophy,
  Crown,
  Flame,
  Search,
  ChevronRight,
  Bell,
  Target
} from 'lucide-react-native';

const INSTRUMENT_IMAGES: { [key: string]: any } = {
  'Piano': require('../../Images/Piano.jpeg'),
  'Violin': require('../../Images/Violin.jpeg'),
  'Guitar': require('../../Images/Pluctrum Guitar.jpeg'),
  'Classical Guitar': require('../../Images/Classical Guitar.png'),
  'Bass Guitar': require('../../Images/Bass Guitar.jpeg'),
  'Keyboard': require('../../Images/Keyboard.jpg'),
  'Drum Kit': require('../../Images/Drum Kit.jpeg'),
  'Drums': require('../../Images/Drum Kit.jpeg'),
  'Flute': require('../../Images/Flute.jpeg'),
  'Pluctrum Guitar': require('../../Images/Pluctrum Guitar.jpeg'),
  'Plectrum Guitar': require('../../Images/Pluctrum Guitar.jpeg'),
  'Theory': require('../../Images/Theory Of Music.jpeg'),
};

function getStudentImage(instrument: string, tab: string) {
  if (tab === 'Theory') return INSTRUMENT_IMAGES['Theory'];
  return INSTRUMENT_IMAGES[instrument] || INSTRUMENT_IMAGES['Piano'];
}

export default function ProgressScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<'Practical' | 'Theory'>('Practical');
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
    if (!status) return 'In Progress';
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

  const userFirstName = profile?.full_name?.split(' ')[0] || 'Vanessa';

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greetingText}>Hello, {userFirstName}</Text>
          <Text style={styles.welcomeSubtitle}>Welcome back to KGS</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => Alert.alert('Notifications', 'No new notifications at this time.')}>
            <Bell size={24} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${userFirstName}&background=1e40af&color=fff` }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} colors={['#1e40af']} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
          <Search size={20} color="#64748b" />
          <Text style={styles.searchText}>Search progress report...</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Progress Report</Text>
        </View>

        <View style={styles.tabContainer}>
          {(['Practical', 'Theory'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Session-Based Progress Graph */}
        <View style={styles.graphContainer}>
          <LinearGradient
            colors={['#1e40af', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <View>
                <Text style={styles.graphTitle}>{activeTab} Growth (Monthly)</Text>
                <Text style={styles.graphSubtitle}>Performance across 2 sessions per week</Text>
              </View>
              <View style={styles.growthBadge}>
                <TrendingUp size={12} color="#22c55e" />
                <Text style={styles.growthText}>+12%</Text>
              </View>
            </View>

            <View style={styles.chartArea}>
              {[1, 2, 3, 4].map((week) => (
                <View key={week} style={styles.weekGroup}>
                  <View style={styles.sessionPair}>
                    <View style={[styles.chartBar, { height: (week * 10 + 30), backgroundColor: 'rgba(255,255,255,0.8)' }]} />
                    <View style={[styles.chartBar, { height: (week * 12 + 35), backgroundColor: '#fbbf24' }]} />
                  </View>
                  <Text style={styles.chartDayText}>W{week}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.graphFooter}>
              <Text style={styles.seeMoreText}>Past Session History</Text>
              <ChevronRight size={16} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

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
                    <Text style={styles.leaderboardStudentName}>{student.full_name}</Text>
                    <Text style={styles.leaderboardStudentPoints}>{student.points || 0} XP</Text>
                  </View>
                  {index === 0 && (
                    <View style={styles.topStreakBadge}>
                      <Flame size={12} color="#f97316" />
                      <Text style={styles.topStreakText}>{student.streak || 0}</Text>
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
            <Text style={styles.emptyText}>No students linked to your account yet.</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {students.map((student) => (
              <View key={student.id} style={styles.modernCard}>
                <View style={styles.cardImageContainer}>
                  <Image
                    source={getStudentImage(student.instrument, activeTab)}
                    style={styles.cardBgImage}
                  />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardImageOverlay} />
                  <View style={styles.cardHeaderOverlay}>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.modernStudentName} numberOfLines={1}>{student.full_name}</Text>
                      <Text style={styles.modernInstrumentText}>{student.instrument}</Text>
                    </View>
                    <View style={[
                      styles.modernStatusBadge,
                      {
                        backgroundColor: student.progress
                          ? getStatusColor(activeTab === 'Theory' ? student.progress.theory_status : student.progress.practical_status)
                          : '#64748b'
                      }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {student.progress
                          ? getStatusLabel(activeTab === 'Theory' ? student.progress.theory_status : student.progress.practical_status)
                          : 'No Data'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {student.progress ? (
                    <>
                      {/* Weekly Summary Row */}
                      <View style={styles.weeklySummaryCard}>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Attendance</Text>
                          <Text style={styles.summaryValue}>{student.progress.attendance || '2/2'} ✅</Text>
                        </View>
                        <View style={[styles.summaryItem, styles.summaryBorder]}>
                          <Text style={styles.summaryLabel}>Homework</Text>
                          <Text style={styles.summaryValue}>{student.progress.homework_completion || 100}%</Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Practice</Text>
                          <View style={styles.practiceRow}>
                            <TrendingUp size={12} color="#22c55e" />
                            <Text style={styles.summaryValue}> {student.progress.practice_score || 85}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Goal Tracking Section */}
                      <View style={styles.goalSection}>
                        <View style={styles.goalHeader}>
                          <Target size={18} color="#1e40af" />
                          <Text style={styles.goalTitle}>Weekly Goal</Text>
                          <View style={[styles.goalStatusBadge, { backgroundColor: student.progress.goal_status === 'achieved' ? '#f0fdf4' : '#fff7ed' }]}>
                            <Text style={[styles.goalStatusText, { color: student.progress.goal_status === 'achieved' ? '#16a34a' : '#f97316' }]}>
                              {student.progress.goal_status === 'achieved' ? 'Achieved' : 'In Progress'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.goalDescription}>{student.progress.weekly_goal || 'Master the current lesson scales'}</Text>

                        <View style={styles.masteryContainer}>
                          <View style={styles.masteryHeader}>
                            <Text style={styles.masteryLabel}>Skill Mastery Meter</Text>
                            <Text style={styles.masteryValue}>{student.progress.mastery_level || 0}%</Text>
                          </View>
                          <View style={styles.masteryBarBg}>
                            <LinearGradient
                              colors={['#3b82f6', '#1e40af']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.masteryBarFill, { width: `${student.progress.mastery_level || 0}%` }]}
                            />
                          </View>
                          <View style={styles.masteryLabels}>
                            <Text style={styles.masterySubLabel}>Beginner</Text>
                            <Text style={styles.masterySubLabel}>Intermediate</Text>
                            <Text style={styles.masterySubLabel}>Advanced</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.gradeDisplayArea}>
                        <View style={styles.gradeBox}>
                          <Text style={styles.gradeBoxLabel}>Current Grade</Text>
                          <Text style={styles.gradeBoxValue}>
                            {activeTab === 'Theory'
                              ? (student.progress.theory_grade || 'Grade 1')
                              : (student.progress.practical_grade || 'Beginner')}
                          </Text>
                        </View>
                        <View style={styles.streakBox}>
                          <Flame size={18} color="#f97316" />
                          <Text style={styles.streakBoxValue}>{student.streak || 0}</Text>
                          <Text style={styles.streakBoxLabel}>Streak</Text>
                        </View>
                      </View>

                      {student.progress.notes && (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesTitle}>Latest Feedback</Text>
                          <Text style={styles.notesTextContent} numberOfLines={2}>
                            {student.progress.notes}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity style={styles.viewReportButton} activeOpacity={0.8}>
                        <Text style={styles.viewReportText}>See Full Report</Text>
                        <View style={styles.reportArrowCircle}>
                          <ChevronRight size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.noProgressContainer}>
                      <Text style={styles.noProgressText}>No progress recorded yet</Text>
                    </View>
                  )}
                </View>
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
    backgroundColor: '#fff',
  },
  topHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchBar: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    height: 56,
  },
  searchText: {
    color: '#94a3b8',
    fontSize: 16,
    marginLeft: 12,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 6,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabButtonText: {
    color: '#0f172a',
  },
  graphContainer: {
    marginBottom: 24,
  },
  graphCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  graphSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  growthBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 10,
  },
  weekGroup: {
    alignItems: 'center',
    gap: 8,
  },
  sessionPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  chartBar: {
    width: 10,
    borderRadius: 5,
  },
  chartDayText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
  },
  graphFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  seeMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modernCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageContainer: {
    height: 160,
    position: 'relative',
  },
  cardBgImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  cardHeaderOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 10,
  },
  modernStudentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modernInstrumentText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  modernStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 20,
  },
  weeklySummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
  },
  goalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goalStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  goalDescription: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  masteryContainer: {
    marginTop: 8,
  },
  masteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  masteryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  masteryValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e40af',
  },
  masteryBarBg: {
    height: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  masteryLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  masterySubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  gradeDisplayArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gradeBox: {
    flex: 1,
  },
  gradeBoxLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gradeBoxValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  streakBox: {
    alignItems: 'flex-end',
  },
  streakBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  streakBoxLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  notesTextContent: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  viewReportButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 14,
  },
  viewReportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  reportArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentsList: {
    paddingBottom: 100,
  },
  leaderboardContainer: {
    marginBottom: 24,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  leaderboardStudentInfo: {
    flex: 1,
  },
  leaderboardStudentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  leaderboardStudentPoints: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
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
  },
  topStreakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f97316',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  noProgressContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  noProgressText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
