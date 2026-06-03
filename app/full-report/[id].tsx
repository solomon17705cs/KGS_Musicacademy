import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { studentService, progressService, attendanceService } from '@/lib/firestore';
import { Student, ProgressRecord } from '@/types/database';
import { ArrowLeft, Flame, Calendar, Award } from 'lucide-react-native';

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

function getStudentImage(instrument: string | null) {
  if (!instrument) return INSTRUMENT_IMAGES['Piano'];
  const key = Object.keys(INSTRUMENT_IMAGES).find(k => 
    instrument.toLowerCase().includes(k.toLowerCase())
  );
  return key ? INSTRUMENT_IMAGES[key] : INSTRUMENT_IMAGES['Piano'];
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
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
  });
}

export default function FullReportScreen() {
  const { id, recordId } = useLocalSearchParams<{ id: string; recordId?: string }>();
  const router = useRouter();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [currentMonthAttendance, setCurrentMonthAttendance] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        const studentData = await studentService.getStudent(id as string);
        setStudent(studentData);
        
        const [records, attendance] = await Promise.all([
          progressService.getProgressRecords(id as string),
          attendanceService.getCurrentMonthAttendance(id as string),
        ]);
        setCurrentMonthAttendance(attendance);
        const sorted = [...records].sort((a, b) =>
          parseDate(a.created_at).getTime() - parseDate(b.created_at).getTime()
        );
        
        if (recordId) {
          const filtered = sorted.filter(r => r.id === recordId);
          setProgressRecords(filtered.length > 0 ? filtered : sorted);
        } else {
          setProgressRecords(sorted);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Full Report</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Student not found</Text>
        </View>
      </View>
    );
  }

  const latestProgress = progressRecords[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Full Report</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.studentCard}>
          <View style={styles.studentImageContainer}>
            <Image
              source={getStudentImage(student.instrument)}
              style={styles.studentImage}
            />
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.full_name}</Text>
            <Text style={styles.studentInstrument}>{student.instrument}</Text>
            <View style={styles.streakBadge}>
              <Flame size={14} color="#f97316" />
              <Text style={styles.streakText}>{student.streak || 0} day streak</Text>
            </View>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>{student.points || 0}</Text>
            <Text style={styles.pointsLabel}>Points</Text>
          </View>
        </View>

        {latestProgress && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Summary</Text>
              
              <View style={styles.gradeRow}>
                <View style={[styles.gradeBox, { backgroundColor: getStatusColor(latestProgress.theory_status) + '15' }]}>
                  <Award size={20} color={getStatusColor(latestProgress.theory_status)} />
                  <Text style={styles.gradeLabel}>Theory Grade</Text>
                  <Text style={[styles.gradeValue, { color: getStatusColor(latestProgress.theory_status) }]}>{latestProgress.theory_grade || 'N/A'}</Text>
                </View>
                <View style={[styles.gradeBox, { backgroundColor: getStatusColor(latestProgress.practical_status) + '15' }]}>
                  <Award size={20} color={getStatusColor(latestProgress.practical_status)} />
                  <Text style={styles.gradeLabel}>Practical Grade</Text>
                  <Text style={[styles.gradeValue, { color: getStatusColor(latestProgress.practical_status) }]}>{latestProgress.practical_grade || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusBox}>
                  <Text style={styles.statusLabel}>Theory Status</Text>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(latestProgress.theory_status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(latestProgress.theory_status) }]}>
                    {getStatusLabel(latestProgress.theory_status)}
                  </Text>
                </View>
                <View style={styles.statusBox}>
                  <Text style={styles.statusLabel}>Practical Status</Text>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(latestProgress.practical_status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(latestProgress.practical_status) }]}>
                    {getStatusLabel(latestProgress.practical_status)}
                  </Text>
                </View>
              </View>
            </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Progress</Text>
                
                <View style={styles.gradeRow}>
                  <View style={styles.statItem}>
                    <Calendar size={18} color="#1e40af" />
                    <Text style={styles.statLabel}>Attendance</Text>
                    <Text style={styles.statValue}>{currentMonthAttendance || 'N/A'}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Homework</Text>
                    <Text style={styles.statValue}>{latestProgress.homework_completion || 0}%</Text>
                  </View>
                </View>
                <View style={[styles.gradeRow, { marginTop: 12 }]}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Practice Score</Text>
                    <Text style={styles.statValue}>{latestProgress.practice_score || 0}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Mastery</Text>
                    <Text style={styles.statValue}>{latestProgress.mastery_level || 0}%</Text>
                  </View>
                </View>
              </View>

            {latestProgress.weekly_goal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Goal</Text>
                <View style={styles.goalCard}>
                  <Text style={styles.goalText}>{latestProgress.weekly_goal}</Text>
                  <View style={[
                    styles.goalStatus,
                    {
                      backgroundColor: latestProgress.goal_status === 'achieved' ? '#dcfce7' : latestProgress.goal_status === 'not_done' ? '#fef2f2' : '#fef3c7',
                    }
                  ]}>
                    <Text style={[
                      styles.goalStatusText,
                      { color: latestProgress.goal_status === 'achieved' ? '#16a34a' : latestProgress.goal_status === 'not_done' ? '#ef4444' : '#d97706' }
                    ]}>
                      {latestProgress.goal_status === 'achieved' ? 'Achieved' : latestProgress.goal_status === 'not_done' ? 'Not Done' : 'In Progress'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {latestProgress.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructor Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{latestProgress.notes}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {progressRecords.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {progressRecords.slice(-5).reverse().map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <View style={styles.historyDate}>
                  <Text style={styles.historyDateText}>
                    {formatDate(record.created_at)}
                  </Text>
                </View>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyGrade}>
                    T: {record.theory_grade || '-'} | P: {record.practical_grade || '-'}
                  </Text>
                  <Text style={styles.historyStatus}>
                    HW: {record.homework_completion}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  studentImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 12,
  },
  studentImage: {
    width: '100%',
    height: '100%',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentInstrument: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  pointsBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e40af',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  section: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gradeBox: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 6,
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  statusRow: {
    gap: 8,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
  },
  goalText: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 10,
  },
  goalStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyDate: {
    width: 60,
  },
  historyDateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  historyDetails: {
    flex: 1,
  },
  historyGrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyStatus: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});