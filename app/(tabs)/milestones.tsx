import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { studentService } from '@/lib/firestore';
import { useBottomPadding } from '@/hooks/useBottomPadding';
import { Student } from '@/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import MusicalNotesLoading from '@/components/MusicalNotesLoading';
import {
  Award,
  ChevronRight,
  Music2,
  BookOpen,
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
  if (!instrument) return INSTRUMENT_IMAGES['Piano'];
  const key = Object.keys(INSTRUMENT_IMAGES).find(
    k => k.toLowerCase() === instrument.trim().toLowerCase()
  );
  if (key) return INSTRUMENT_IMAGES[key];
  const partial = Object.keys(INSTRUMENT_IMAGES).find(
    k => instrument.toLowerCase().includes(k.toLowerCase())
  );
  return partial ? INSTRUMENT_IMAGES[partial] : INSTRUMENT_IMAGES['Piano'];
}

function parseDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (dateInput.toDate) return dateInput.toDate();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
}

function getCurrentLevel(completedGrades: any[], type: 'theory' | 'practical'): string {
  const filtered = completedGrades.filter((g: any) => g.type === type);
  if (!filtered.length) return 'Basic';
  let maxNum = 0;
  let hasInitial = false;
  for (const g of filtered) {
    const gs = (g.grade || '').trim();
    if (/^ini/i.test(gs)) { hasInitial = true; continue; }
    const match = gs.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  if (maxNum === 0 && hasInitial) return 'Grade 1';
  if (maxNum === 0) return 'Basic';
  return `Grade ${maxNum + 1}`;
}

function getMilestoneCount(student: Student): number {
  let count = 1; // enrollment
  count += (student.completed_grades || []).length;
  return count;
}

function getMonthsLearning(enrollmentDate: any): number {
  if (!enrollmentDate) return 0;
  return Math.floor((Date.now() - parseDate(enrollmentDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

export default function MilestonesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user, loading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bottomPadding = useBottomPadding(0);

  useEffect(() => {
    if (!profile || !user) return;
    loadStudents();
  }, [profile?.id, user?.email, user?.phoneNumber]);

  async function loadStudents() {
    if (!profile || !user) return;
    try {
      let studentList: Student[] = [];
      if (profile.role === 'admin') {
        studentList = await studentService.getAllStudents();
      } else {
        if (user.email) {
          studentList = await studentService.getStudentsByParentEmail(user.email);
        }
        if (studentList.length === 0 && user.phoneNumber) {
          studentList = await studentService.getStudentsByParentPhone(user.phoneNumber);
        }
        if (studentList.length === 0 && profile.phone) {
          studentList = await studentService.getStudentsByParentPhone(profile.phone);
        }
      }
      setStudents(studentList);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStudents();
  }

  const userFirstName = (profile?.full_name || 'User').split(' ')[0];

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (loading || authLoading) {
    return <MusicalNotesLoading text="Loading milestones..." />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>Hello, {userFirstName}</Text>
          <Text style={styles.welcomeSubtitle}>Track your musical journey</Text>
        </View>
        <View style={styles.headerIcon}>
          <Award size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} colors={[colors.primary]} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding }]}>

        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Award size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>No students linked to your account yet.</Text>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {students.map((student) => {
              const cg = student.completed_grades || [];
              const practicalLevel = getCurrentLevel(cg, 'practical');
              const theoryLevel = getCurrentLevel(cg, 'theory');
              const milestoneCount = getMilestoneCount(student);
              const monthsLearning = getMonthsLearning(student.enrollment_date);

              return (
                <TouchableOpacity
                  key={student.id}
                  style={styles.card}
                  onPress={() => router.push(`/milestone/${student.id}` as any)}
                  activeOpacity={0.8}>
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={getStudentImage(student.instrument)}
                      style={styles.cardBgImage}
                    />
                    <LinearGradient colors={['transparent', isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)']} style={styles.cardImageOverlay} />
                    <View style={styles.cardHeaderOverlay}>
                      <View style={styles.cardHeaderInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>{student.full_name}</Text>
                        <Text style={styles.instrumentText}>{student.instrument}</Text>
                      </View>
                      <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.levelRow}>
                      <View style={styles.levelChip}>
                        <Music2 size={12} color={colors.primary} />
                        <Text style={styles.levelChipLabel}>Practical</Text>
                        <Text style={styles.levelChipValue}>{practicalLevel}</Text>
                      </View>
                      <View style={styles.levelChip}>
                        <BookOpen size={12} color={colors.primaryLight} />
                        <Text style={styles.levelChipLabel}>Theory</Text>
                        <Text style={styles.levelChipValue}>{theoryLevel}</Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{milestoneCount}</Text>
                        <Text style={styles.statLabel}>Milestones</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{monthsLearning}</Text>
                        <Text style={styles.statLabel}>Months</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{cg.length}</Text>
                        <Text style={styles.statLabel}>Grades</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: Record<string, string>, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topHeader: {
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    greetingText: { fontSize: 28, fontWeight: '800', color: colors.text },
    welcomeSubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 2 },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 20 },
    studentsList: {},
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    cardImageContainer: { height: 140, position: 'relative' },
    cardBgImage: { width: '100%', height: '100%' },
    cardImageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
    cardHeaderOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    cardHeaderInfo: { flex: 1, marginRight: 10 },
    studentName: { fontSize: 20, fontWeight: '800', color: '#fff' },
    instrumentText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },
    cardBody: { padding: 16 },
    levelRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    levelChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.statBg,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    levelChipLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', flex: 1 },
    levelChipValue: { fontSize: 13, fontWeight: '800', color: colors.text },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.statBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: colors.border, alignSelf: 'stretch' },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.skeleton,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  });
}
