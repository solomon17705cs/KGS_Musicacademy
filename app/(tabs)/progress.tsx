import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { studentService, progressService, notificationService, attendanceService } from '@/lib/firestore';
import { Student, ProgressRecord } from '@/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';
import ProgressHistogram from '@/components/ProgressHistogram';
import { calculateProgressScore } from '@/lib/scoreCalculator';
import {
  Music2,
  TrendingUp,
  Search,
  Bell,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Flame,
  Star,
  X,
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

function getStudentImage(instrument: string) {
  return INSTRUMENT_IMAGES[instrument] || INSTRUMENT_IMAGES['Piano'];
}

function parseDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (dateInput.toDate) return dateInput.toDate();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(dateInput: any): string {
  return parseDate(dateInput).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#34c759';
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function calculateRealStreak(records: ProgressRecord[]): number {
  if (records.length === 0) return 0;

  const sorted = [...records].sort((a, b) =>
    parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime()
  );

  let streak = 1;
  const now = new Date();
  const lastUpdate = parseDate(sorted[0].created_at);
  const daysSinceLast = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));

  if (daysSinceLast > 8) return 0;

  for (let i = 1; i < sorted.length; i++) {
    const current = parseDate(sorted[i - 1].created_at);
    const previous = parseDate(sorted[i].created_at);
    const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 8) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

type StudentWithData = Student & { progress?: ProgressRecord; currentMonthAttendance?: string };

export default function ProgressScreen() {
  const { profile, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithData[]>([]);
  const [studentsHistory, setStudentsHistory] = useState<Map<string, ProgressRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showActivationBanner, setShowActivationBanner] = useState(true);

  useEffect(() => {
    if (!profile || !user) return;
    loadStudentProgress();
  }, [profile?.id, user?.email, user?.phoneNumber]);

  useEffect(() => {
    if (!user) return;
    notificationService.getUserNotifications(user.uid).then(notifications => {
      setUnreadCount(notifications.filter(n => !n.read).length);
    });
  }, [user]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedStudent) {
        setSelectedStudent(null);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [selectedStudent]);

  async function loadStudentProgress() {
    if (!profile || !user) return;

    try {
      setError('');
      let studentList: Student[] = [];

      if (profile.role === 'admin') {
        studentList = await studentService.getAllStudents();
      } else {
        let siblings: Student[] = [];
        console.log('🔍 User email:', user.email);
        console.log('🔍 User phone:', user.phoneNumber);
        console.log('🔍 Profile phone:', profile.phone);
        
        if (user.email) {
          siblings = await studentService.getStudentsByParentEmail(user.email);
          console.log('🔍 Found by email:', siblings.length);
        }
        if (siblings.length === 0 && user.phoneNumber) {
          siblings = await studentService.getStudentsByParentPhone(user.phoneNumber);
          console.log('🔍 Found by user phone:', siblings.length);
        }
        if (siblings.length === 0 && profile.phone) {
          siblings = await studentService.getStudentsByParentPhone(profile.phone);
          console.log('🔍 Found by profile phone:', siblings.length);
        }
        studentList = siblings;
        console.log('🔍 Total students found:', studentList.length);
      }

      const studentsWithProgress = await Promise.all(
        studentList.map(async (student) => {
          const progress = await progressService.getLatestProgress(student.id);
          const history = await progressService.getProgressRecords(student.id);
          const realStreak = calculateRealStreak(history);
          const currentMonthAttendance = await attendanceService.getCurrentMonthAttendance(student.id, student.summer_class);
          if (realStreak !== student.streak && (profile.role === 'admin' || profile.role === 'staff')) {
            try {
              await studentService.updateStudent(student.id, { streak: realStreak });
            } catch (_) {}
          }
          return { ...student, progress: progress || undefined, streak: realStreak, currentMonthAttendance };
        })
      );

      const historyMap = new Map<string, ProgressRecord[]>();
      await Promise.all(
        studentList.map(async (student) => {
          const history = await progressService.getProgressRecords(student.id);
          historyMap.set(student.id, history);
        })
      );

      setStudents(studentsWithProgress);
      setStudentsHistory(historyMap);
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
      case 'excellent': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'needs_improvement': return '#f59e0b';
      case 'struggling': return '#ef4444';
      default: return '#64748b';
    }
  }

  function getStatusLabel(status: string) {
    if (!status) return 'In Progress';
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  if (loading || authLoading) {
    return <MusicalNotesLoading text="Loading progress..." />;
  }

  if (!profile || !user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view progress</Text>
      </View>
    );
  }

  const userFirstName = (profile?.full_name || 'User').split(' ')[0];

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        {selectedStudent ? (
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => setSelectedStudent(null)}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>
            {selectedStudent ? <>{selectedStudent.full_name}{selectedStudent.summer_class ? ' ☀️' : ''}</> : `Hello, ${userFirstName}`}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {selectedStudent ? selectedStudent.instrument : 'Welcome back to KGS'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!selectedStudent && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/notifications')}>
              <View>
                <Bell size={24} color="#0f172a" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(tabs)/profile')}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${userFirstName}&background=1e40af&color=fff` }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {students.length === 0 && !loading && !selectedStudent && showActivationBanner && (
        <View style={styles.activationBanner}>
          <TouchableOpacity
            style={styles.activationBannerContent}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://share.google/NYSagURL03flH36By')}>
            <Text style={styles.activationBannerTitle}>Account Pending Activation</Text>
            <Text style={styles.activationBannerText}>
              Your account is not linked to a student profile yet.{'\n'}
              Please visit KGS Music Academy with your registered{'\n'}
              mobile number/ mail id to complete activation.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowActivationBanner(false)} style={styles.activationBannerClose}>
            <X size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} colors={['#1e40af']} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={selectedStudent ? styles.contentContainerSelected : undefined}>

        {selectedStudent ? (
          <View>
            {(() => {
              const history = studentsHistory.get(selectedStudent.id) || [];
              const sorted = [...history]
                .filter(r => (r.teacher_practice_rating > 0 || r.practice_score > 0 || r.homework_completion > 0))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const latest = sorted[sorted.length - 1];
              const latestScore = latest ? calculateProgressScore({
                teacherRating: latest.teacher_practice_rating,
                practiceScore: latest.practice_score ?? 0,
                homeworkCompletion: latest.homework_completion ?? 0,
              }).finalScore : null;

              return (
                <View style={styles.graphContainer}>
                  <LinearGradient
                    colors={['#1e40af', '#3b82f6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.graphCard}>
                    <View style={styles.graphHeader}>
                      <View>
                        <Text style={styles.graphTitle}>Progress Score</Text>
                        <Text style={styles.graphSubtitle}>Overall performance per report</Text>
                      </View>
                      {latest && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestScore}>{latestScore}</Text>
                          <Text style={styles.latestLabel}>Latest</Text>
                        </View>
                      )}
                    </View>
                    <ProgressHistogram records={history} />
                  </LinearGradient>
                </View>
              );
            })()}

            {selectedStudent.progress && (
              <>
                <Text style={styles.sectionHeading}>Weekly Report</Text>
                <View style={styles.weeklySummaryCard}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Attendance</Text>
                    <Text style={styles.summaryValue}>{selectedStudent.currentMonthAttendance || '0/8'}</Text>
                  </View>
                  <View style={[styles.summaryItem, styles.summaryBorder]}>
                    <Text style={styles.summaryLabel}>Homework</Text>
                    <Text style={styles.summaryValue}>{selectedStudent.progress.homework_completion || 100}%</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Practice</Text>
                    <View style={styles.practiceRow}>
                      <TrendingUp size={12} color={getScoreColor(selectedStudent.progress.practice_score || 85)} />
                      <Text style={[styles.summaryValue, { color: getScoreColor(selectedStudent.progress.practice_score || 85) }]}> {selectedStudent.progress.practice_score || 85}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.goalSection}>
                  <View style={styles.goalHeader}>
                    <Target size={18} color="#1e40af" />
                    <Text style={styles.goalTitle}>Weekly Goal</Text>
                    <View style={[styles.goalStatusBadge, {
                      backgroundColor: selectedStudent.progress.goal_status === 'achieved' ? '#f0fdf4' : selectedStudent.progress.goal_status === 'not_done' ? '#fef2f2' : '#fff7ed',
                    }]}>
                      <Text style={[styles.goalStatusText, {
                        color: selectedStudent.progress.goal_status === 'achieved' ? '#16a34a' : selectedStudent.progress.goal_status === 'not_done' ? '#ef4444' : '#f97316',
                      }]}>
                        {selectedStudent.progress.goal_status === 'achieved' ? 'Achieved' : selectedStudent.progress.goal_status === 'not_done' ? 'Not Done' : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.goalDescription}>{selectedStudent.progress.weekly_goal || 'Master the current lesson scales'}</Text>
                  {selectedStudent.progress?.goal_status === 'achieved' && (selectedStudent.progress?.teacher_practice_rating ?? 0) > 0 && (
                    <View style={styles.teacherRatingRow}>
                      <Text style={styles.teacherRatingLabel}>Teacher's Rating: </Text>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} fill={(selectedStudent.progress?.teacher_practice_rating ?? 0) >= s ? '#f59e0b' : '#d1d5db'} color={(selectedStudent.progress?.teacher_practice_rating ?? 0) >= s ? '#f59e0b' : '#d1d5db'} />
                      ))}
                      <Text style={styles.teacherRatingValue}>{selectedStudent.progress?.teacher_practice_rating ?? 0}/5</Text>
                    </View>
                  )}
                </View>

                <View style={styles.gradeDisplayArea}>
                  <View style={styles.gradeBox}>
                    <Text style={styles.gradeBoxLabel}>Theory Grade</Text>
                    <Text style={styles.gradeBoxValue}>
                      {selectedStudent.progress.theory_grade || 'Grade 1'}
                    </Text>
                  </View>
                  <View style={styles.gradeBox}>
                    <Text style={styles.gradeBoxLabel}>Practical Grade</Text>
                    <Text style={styles.gradeBoxValue}>
                      {selectedStudent.progress.practical_grade || 'Beginner'}
                    </Text>
                  </View>
                </View>

                {selectedStudent.progress.notes && (
                  <View style={styles.notesBox}>
                    <View style={styles.notesHeaderRow}>
                      <Text style={styles.notesTitle}>Latest Feedback</Text>
                      <Text style={styles.notesDate}>
                        {formatDate(selectedStudent.progress.updated_at)}
                      </Text>
                    </View>
                    <Text style={styles.notesTextContent} numberOfLines={3}>
                      {selectedStudent.progress.notes}
                    </Text>
                  </View>
                )}

                {studentsHistory.has(selectedStudent.id) && (
                  <View style={styles.reportsSection}>
                    <Text style={styles.reportsSectionTitle}>Progress Reports</Text>
                    {[...(studentsHistory.get(selectedStudent.id) || [])]
                      .sort((a, b) => parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime())
                      .slice(0, 5).map((record, idx) => (
                      <TouchableOpacity 
                        key={record.id} 
                        style={styles.reportBox}
                        activeOpacity={0.7}
                        onPress={() => router.push({ pathname: `/full-report/${selectedStudent.id}` as any, params: { recordId: record.id } })}>
                        <View style={styles.reportBoxHeader}>
                          <Text style={styles.reportBoxDate}>
                            {formatDate(record.created_at)}
                          </Text>
                          <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(record.theory_status) + '20' }]}>
                            <Text style={[styles.statusBadgeSmallText, { color: getStatusColor(record.theory_status) }]}>
                              {getStatusLabel(record.theory_status)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.reportBoxContent}>
                          <View style={styles.reportBoxRow}>
                            <View style={styles.reportBoxItem}>
                              <Text style={styles.reportBoxLabel}>Homework</Text>
                              <Text style={styles.reportBoxValue}>{record.homework_completion}%</Text>
                            </View>
                            <View style={styles.reportBoxItem}>
                              <Text style={styles.reportBoxLabel}>Practice</Text>
                              <Text style={styles.reportBoxValue}>{record.practice_score}</Text>
                            </View>
                          </View>
                          <View style={styles.reportBoxGrades}>
                            <View style={[styles.gradePill, { backgroundColor: getStatusColor(record.theory_status) + '15' }]}>
                              <Text style={[styles.gradePillText, { color: getStatusColor(record.theory_status) }]}>
                                T: {record.theory_grade || '-'}
                              </Text>
                            </View>
                            <View style={[styles.gradePill, { backgroundColor: getStatusColor(record.practical_status) + '15' }]}>
                              <Text style={[styles.gradePillText, { color: getStatusColor(record.practical_status) }]}>
                                P: {record.practical_grade || '-'}
                              </Text>
                            </View>
                          </View>
                          {record.notes && (
                            <Text style={styles.reportBoxNotes} numberOfLines={2}>{record.notes}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.viewReportButton} 
                  activeOpacity={0.8}
                  onPress={() => router.push(`/full-report/${selectedStudent.id}` as any)}>
                  <Text style={styles.viewReportText}>See Full Report</Text>
                  <View style={styles.reportArrowCircle}>
                    <ChevronRight size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : students.length === 1 ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Progress Report</Text>
            </View>
          {(() => {
            const history = studentsHistory.get(students[0].id) || [];
            return (
              <View style={styles.graphContainer}>
                <LinearGradient
                  colors={['#1e40af', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.graphCard}>
                  <View style={styles.graphHeader}>
                    <View>
                      <Text style={styles.graphTitle}>Progress Score</Text>
                      <Text style={styles.graphSubtitle}>Overall performance per report</Text>
                    </View>
                  </View>
                  <ProgressHistogram records={history} />
                </LinearGradient>
              </View>
            );
          })()}
          </View>
        ) : null}

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
        ) : !selectedStudent ? (
          <View style={styles.studentsList}>
            {students.map((student) => {
              const history = studentsHistory.get(student.id) || [];
              const realStreak = calculateRealStreak(history);

              return (
                <TouchableOpacity 
                  key={student.id} 
                  style={styles.modernCard}
                  onPress={() => setSelectedStudent(student)}
                  activeOpacity={0.8}>
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={getStudentImage(student.instrument)}
                      style={styles.cardBgImage}
                    />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardImageOverlay} />
                    <View style={styles.cardHeaderOverlay}>
                      <View style={styles.cardHeaderInfo}>
                        <Text style={styles.modernStudentName} numberOfLines={1}>{student.full_name}{student.summer_class ? ' ☀️' : ''}</Text>
                        <Text style={styles.modernInstrumentText}>{student.instrument}</Text>
                      </View>
                      <View style={styles.cardStatusRow}>
                        <View style={[styles.miniBadge, { backgroundColor: student.progress ? getStatusColor(student.progress.theory_status) : '#64748b' }]}>
                          <Text style={styles.miniBadgeText}>T: {student.progress ? getStatusLabel(student.progress.theory_status) : 'N/A'}</Text>
                        </View>
                        <View style={[styles.miniBadge, { backgroundColor: student.progress ? getStatusColor(student.progress.practical_status) : '#64748b' }]}>
                          <Text style={styles.miniBadgeText}>P: {student.progress ? getStatusLabel(student.progress.practical_status) : 'N/A'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    {student.progress ? (
                      <>
                        <View style={styles.weeklySummaryCard}>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Attendance</Text>
                            <Text style={styles.summaryValue}>{student.currentMonthAttendance || '0/8'}</Text>
                          </View>
                          <View style={[styles.summaryItem, styles.summaryBorder]}>
                            <Text style={styles.summaryLabel}>Homework</Text>
                            <Text style={styles.summaryValue}>{student.progress.homework_completion || 100}%</Text>
                          </View>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Practice</Text>
                            <View style={styles.practiceRow}>
                              <TrendingUp size={12} color={getScoreColor(student.progress.practice_score || 85)} />
                              <Text style={[styles.summaryValue, { color: getScoreColor(student.progress.practice_score || 85) }]}> {student.progress.practice_score || 85}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.goalSection}>
                          <View style={styles.goalHeader}>
                            <Target size={18} color="#1e40af" />
                            <Text style={styles.goalTitle}>Weekly Goal</Text>
                            <View style={[styles.goalStatusBadge, {
                              backgroundColor: student.progress.goal_status === 'achieved' ? '#f0fdf4' : student.progress.goal_status === 'not_done' ? '#fef2f2' : '#fff7ed',
                            }]}>
                              <Text style={[styles.goalStatusText, {
                                color: student.progress.goal_status === 'achieved' ? '#16a34a' : student.progress.goal_status === 'not_done' ? '#ef4444' : '#f97316',
                              }]}>
                                {student.progress.goal_status === 'achieved' ? 'Achieved' : student.progress.goal_status === 'not_done' ? 'Not Done' : 'In Progress'}
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
                            <Text style={styles.gradeBoxLabel}>Theory</Text>
                            <Text style={styles.gradeBoxValue}>
                              {student.progress.theory_grade || 'Grade 1'}
                            </Text>
                          </View>
                          <View style={styles.gradeBox}>
                            <Text style={styles.gradeBoxLabel}>Practical</Text>
                            <Text style={styles.gradeBoxValue}>
                              {student.progress.practical_grade || 'Beginner'}
                            </Text>
                          </View>
                          <View style={styles.streakBox}>
                            <Flame size={18} color="#f97316" />
                            <Text style={styles.streakBoxValue}>{realStreak}</Text>
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

                        <TouchableOpacity 
                          style={styles.viewReportButton} 
                          activeOpacity={0.8}
                          onPress={() => router.push(`/full-report/${student.id}` as any)}>
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
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contentContainerSelected: { paddingBottom: 100 },
  greetingText: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  welcomeSubtitle: { fontSize: 16, color: '#64748b', marginTop: 2 },
  activationBanner: { backgroundColor: '#fef2f2', borderRadius: 16, marginHorizontal: 24, marginBottom: 16, padding: 16, flexDirection: 'row', borderWidth: 1, borderColor: '#fecaca' },
  activationBannerContent: { flex: 1, marginRight: 8 },
  activationBannerTitle: { fontSize: 14, fontWeight: '700', color: '#ef4444', marginBottom: 4 },
  activationBannerText: { fontSize: 12, color: '#dc2626', fontWeight: '500', lineHeight: 18 },
  activationBannerClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 2, borderColor: '#f1f5f9' },
  avatarImage: { width: '100%', height: '100%' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24 },
  searchBar: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, height: 56 },
  searchText: { color: '#94a3b8', fontSize: 16, marginLeft: 12 },
  sectionHeaderRow: { marginBottom: 16 },
  sectionHeading: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  graphContainer: { marginBottom: 24 },
  graphCard: { borderRadius: 24, padding: 24, shadowColor: '#1e40af', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  graphTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  graphSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  growthBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  growthText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  latestBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  latestScore: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  latestLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  modernCard: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardImageContainer: { height: 160, position: 'relative' },
  cardBgImage: { width: '100%', height: '100%' },
  cardImageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  cardHeaderOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardHeaderInfo: { flex: 1, marginRight: 10 },
  modernStudentName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modernInstrumentText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },
  cardStatusRow: { flexDirection: 'row', gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cardBody: { padding: 20 },
  weeklySummaryCard: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  practiceRow: { flexDirection: 'row', alignItems: 'center' },
  goalSection: { marginBottom: 20, padding: 16, backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goalTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginLeft: 8, flex: 1 },
  goalStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  goalStatusText: { fontSize: 10, fontWeight: '800' },
  goalDescription: { fontSize: 14, color: '#334155', fontWeight: '600', lineHeight: 20, marginBottom: 16 },
  masteryContainer: { marginTop: 8 },
  masteryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  masteryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  masteryValue: { fontSize: 11, fontWeight: '800', color: '#1e40af' },
  masteryBarBg: { height: 8, backgroundColor: '#dbeafe', borderRadius: 4, overflow: 'hidden' },
  masteryBarFill: { height: '100%', borderRadius: 4 },
  masteryLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  masterySubLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  gradeDisplayArea: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  gradeBox: { flex: 1 },
  gradeBoxLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  gradeBoxValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  streakBox: { alignItems: 'flex-end' },
  streakBoxValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  streakBoxLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  notesBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16 },
  notesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notesTitle: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 2 },
  notesDate: { fontSize: 10, color: '#94a3b8' },
  notesTextContent: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  reportsSection: { marginTop: 8 },
  reportsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  reportBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 12 },
  reportBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reportBoxDate: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeSmallText: { fontSize: 10, fontWeight: '600' },
  reportBoxContent: {},
  reportBoxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportBoxItem: { alignItems: 'center' },
  reportBoxLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  reportBoxValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  reportBoxGrades: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  gradePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradePillText: { fontSize: 12, fontWeight: '600' },
  reportBoxNotes: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  viewReportButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 14, borderRadius: 14 },
  viewReportText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reportArrowCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  studentsList: { paddingBottom: 100 },
  errorContainer: { backgroundColor: '#fee2e2', borderRadius: 16, padding: 16, marginBottom: 24 },
  errorText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', padding: 40, backgroundColor: '#f8fafc', borderRadius: 24, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  noProgressContainer: { padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center' },
  noProgressText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  teacherRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 2 },
  teacherRatingLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  teacherRatingValue: { fontSize: 12, color: '#64748b', fontWeight: '700', marginLeft: 4 },
});
