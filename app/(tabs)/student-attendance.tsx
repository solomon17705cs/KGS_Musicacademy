import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { studentService, attendanceService } from '@/lib/firestore';
import { Student, AttendanceRecord } from '@/types/database';
import { ArrowLeft, Calendar, Check, X, AlertTriangle, HelpCircle } from 'lucide-react-native';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';

function getMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month - 1] || '';
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'present': return <Check size={14} color="#16a34a" />;
    case 'absent': return <X size={14} color="#dc2626" />;
    case 'late': return <AlertTriangle size={14} color="#d97706" />;
    case 'excused': return <HelpCircle size={14} color="#2563eb" />;
    default: return <HelpCircle size={14} color="#94a3b8" />;
  }
}

function getStatusBg(status: string, colors: Record<string, string>) {
  switch (status) {
    case 'present': return colors.successBg;
    case 'absent': return colors.errorBg;
    case 'late': return colors.warningBg;
    case 'excused': return colors.primaryBg;
    default: return colors.statBg;
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

export default function StudentAttendanceScreen() {
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const insets = useSafeAreaInsets();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Map<string, { month: string; records: AttendanceRecord[] }[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !user) return;
    loadData();
  }, [profile?.id, user?.email, user?.phoneNumber]);

  async function loadData() {
    try {
      const seen = new Map<string, Student>();
      const lookups: Promise<Student[]>[] = [];
      if (user?.email) {
        lookups.push(studentService.getStudentsByParentEmail(user.email));
      }
      if (user?.phoneNumber) {
        lookups.push(studentService.getStudentsByParentPhone(user.phoneNumber));
      }
      if (profile?.phone) {
        lookups.push(studentService.getStudentsByParentPhone(profile.phone));
      }
      const results = await Promise.all(lookups);
      for (const students of results) {
        for (const s of students) {
          seen.set(s.id, s);
        }
      }
      const studentList = Array.from(seen.values());
      setStudents(studentList);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
      }

      const monthsToFetch = [
        { year: prevYear, month: prevMonth },
        { year: currentYear, month: currentMonth },
      ];

      const dataMap = new Map<string, { month: string; records: AttendanceRecord[] }[]>();

      await Promise.all(
        studentList.map(async (student) => {
          const monthData = await Promise.all(
            monthsToFetch.map(async ({ year, month }) => {
              const records = await attendanceService.getMonthAttendanceForStudent(student.id, year, month);
              records.sort((a, b) => a.date.localeCompare(b.date));
              return { month: `${getMonthName(month)} ${year}`, records };
            })
          );
          dataMap.set(student.id, monthData);
        })
      );

      setAttendanceData(dataMap);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  }

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return <MusicalNotesLoading text="Loading attendance..." />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>
        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>
              Your account is not linked to any student profiles.
            </Text>
          </View>
        ) : (
          students.map((student) => {
            const monthsData = attendanceData.get(student.id) || [];
            return (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentInstrument}>{student.instrument}</Text>
                  </View>
                </View>

                {monthsData.map((monthData) => {
                  const presentCount = monthData.records.filter(r => r.status === 'present').length;
                  const isHighlight = presentCount > 8;
                  const accentColor = isHighlight ? '#ea580c' : colors.primary;

                  let orangeThreshold = monthData.records.length;
                  if (isHighlight) {
                    let seen = 0;
                    for (let i = 0; i < monthData.records.length; i++) {
                      if (monthData.records[i].status === 'present') {
                        seen++;
                        if (seen === 9) {
                          orangeThreshold = i;
                          break;
                        }
                      }
                    }
                  }

                  return (
                  <View key={monthData.month} style={styles.monthSection}>
                    <View style={styles.monthHeader}>
                      <Calendar size={16} color={accentColor} />
                      <Text style={[styles.monthTitle, isHighlight && styles.monthTitleHighlight]}>{monthData.month}</Text>
                    </View>

                    {monthData.records.length === 0 ? (
                      <Text style={styles.noRecords}>No attendance records</Text>
                    ) : (
                      <>
                        <View style={styles.summaryRow}>
                          {['present', 'absent', 'late', 'excused'].map((status) => {
                            const count = monthData.records.filter(r => r.status === status).length;
                            if (count === 0) return null;
                            const isPresentHighlight = status === 'present' && isHighlight;
                            return (
                              <View key={status} style={[styles.summaryBadge, { backgroundColor: getStatusBg(status, colors) }]}>
                                {isPresentHighlight ? <Check size={14} color="#ea580c" /> : getStatusIcon(status)}
                                <Text style={[styles.summaryText, { color: isPresentHighlight ? colors.warning : status === 'absent' ? colors.error : status === 'late' ? colors.warning : colors.primary }]}>
                                  {count} {getStatusLabel(status)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>

                        <View style={styles.recordsGrid}>
                          {monthData.records.map((record, idx) => {
                            const isExtra = idx >= orangeThreshold;
                            return (
                            <View key={record.id} style={[styles.recordItem, { backgroundColor: isExtra ? colors.warningBg : getStatusBg(record.status, colors) }]}>
                              <Text style={[styles.recordDay, isExtra && styles.recordExtraText]}>{getDayName(record.date)}</Text>
                              <Text style={[styles.recordDate, isExtra && styles.recordExtraText]}>{formatDateDisplay(record.date)}</Text>
                              <View style={styles.recordStatus}>
                                {isExtra && record.status === 'present' ? <Check size={14} color="#ea580c" /> : getStatusIcon(record.status)}
                              </View>
                            </View>
                          )})}
                        </View>
                      </>
                    )}
                  </View>
                )})}
              </View>
            );
          })
        )}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.headerBg,
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
      maxWidth: 260,
    },
    studentCard: {
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
    studentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    studentAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    studentAvatarText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    studentInstrument: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    monthSection: {
      marginBottom: 4,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    monthTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    monthTitleHighlight: {
      color: '#ea580c',
    },
    noRecords: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    summaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    summaryText: {
      fontSize: 12,
      fontWeight: '600',
    },
    recordsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    recordItem: {
      width: 72,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 10,
      alignItems: 'center',
      gap: 2,
    },
    recordDay: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    recordDate: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    recordExtraText: {
      color: '#ea580c',
    },
    recordStatus: {
      marginTop: 2,
    },
  });
}
