import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Music2,
  Award,
  BookOpen,
  Target,
  GraduationCap,
  Star,
  CheckCircle2,
  TrendingUp,
  MapPin,
} from 'lucide-react-native';
import { studentService, progressService } from '@/lib/firestore';
import { Student, CompletedGrade } from '@/types/database';
import { useBottomPadding } from '@/hooks/useBottomPadding';
import { useTheme } from '@/contexts/ThemeContext';

type MilestoneType = 'enroll' | 'grade' | 'goal' | 'special';

interface MilestoneEvent {
  id: string;
  date: string;
  sortKey: string;
  rawDate: Date;
  isBig: boolean;
  type: MilestoneType;
  title: string;
  subtitle?: string;
  monthYear: string;
  isLast?: boolean;
}

function parseDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (dateInput.toDate) return dateInput.toDate();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatMonthYear(dateInput: any): string {
  return parseDate(dateInput).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateInput: any): string {
  return parseDate(dateInput).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getCurrentLevel(
  completedGrades: CompletedGrade[],
  type: 'theory' | 'practical'
): string {
  const filtered = completedGrades.filter(g => g.type === type);
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

function getTypeConfig(isDark: boolean): Record<MilestoneType, { Icon: any; nodeColor: string; nodeBorder: string; cardBg: string; cardBorder: string; iconBg: string; iconColor: string; labelBg: string; labelColor: string; label: string; }> {
  if (isDark) {
    return {
      enroll: { Icon: Star, nodeColor: '#f59e0b', nodeBorder: '#78350f', cardBg: '#451a03', cardBorder: '#78350f', iconBg: '#78350f', iconColor: '#fbbf24', labelBg: '#78350f', labelColor: '#fde68a', label: 'Enrolled' },
      grade: { Icon: GraduationCap, nodeColor: '#7c3aed', nodeBorder: '#4c1d95', cardBg: '#1e1b4b', cardBorder: '#312e81', iconBg: '#312e81', iconColor: '#a78bfa', labelBg: '#312e81', labelColor: '#c4b5fd', label: 'Grade' },
      goal: { Icon: CheckCircle2, nodeColor: '#16a34a', nodeBorder: '#14532d', cardBg: '#052e16', cardBorder: '#14532d', iconBg: '#14532d', iconColor: '#4ade80', labelBg: '#14532d', labelColor: '#86efac', label: 'Goal' },
      special: { Icon: Award, nodeColor: '#3b82f6', nodeBorder: '#1e3a5f', cardBg: '#172554', cardBorder: '#1e3a8a', iconBg: '#1e3a8a', iconColor: '#60a5fa', labelBg: '#1e3a8a', labelColor: '#93c5fd', label: 'Achievement' },
    };
  }
  return {
    enroll: { Icon: Star, nodeColor: '#fbbf24', nodeBorder: '#fde68a', cardBg: '#fffbeb', cardBorder: '#fde68a', iconBg: '#fef3c7', iconColor: '#d97706', labelBg: '#fef3c7', labelColor: '#92400e', label: 'Enrolled' },
    grade: { Icon: GraduationCap, nodeColor: '#7c3aed', nodeBorder: '#ddd6fe', cardBg: '#faf5ff', cardBorder: '#ddd6fe', iconBg: '#ede9fe', iconColor: '#7c3aed', labelBg: '#ede9fe', labelColor: '#5b21b6', label: 'Grade' },
    goal: { Icon: CheckCircle2, nodeColor: '#16a34a', nodeBorder: '#bbf7d0', cardBg: '#f0fdf4', cardBorder: '#bbf7d0', iconBg: '#dcfce7', iconColor: '#16a34a', labelBg: '#dcfce7', labelColor: '#14532d', label: 'Goal' },
    special: { Icon: Award, nodeColor: '#1e40af', nodeBorder: '#bfdbfe', cardBg: '#eff6ff', cardBorder: '#bfdbfe', iconBg: '#dbeafe', iconColor: '#1e40af', labelBg: '#dbeafe', labelColor: '#1e3a8a', label: 'Achievement' },
  };
}

function InstrumentIcon({ instrument, size, color }: { instrument: string; size: number; color: string }) {
  const n = instrument.toLowerCase();
  if (n.includes('theory') || n.includes('book')) return <BookOpen size={size} color={color} />;
  return <Music2 size={size} color={color} />;
}

const LINE_COL_WIDTH = 40;
const DATE_COL_WIDTH = 56;

function TimelineRow({ evt, isFirst, isLast, colors, isDark }: { evt: MilestoneEvent; isFirst: boolean; isLast: boolean; colors: any; isDark: boolean }) {
  const TYPE_CONFIG = getTypeConfig(isDark);
  const cfg = TYPE_CONFIG[evt.type] ?? TYPE_CONFIG.special;
  const { Icon } = cfg;
  const tl = useMemo(() => createTlStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={tl.row}>
      <View style={tl.dateCol}>
        <Text style={tl.dateDay}>{parseDate(evt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
        <Text style={tl.dateYear}>{parseDate(evt.date).getFullYear()}</Text>
      </View>
      <View style={tl.lineCol}>
        <View style={[tl.lineTop, isFirst && tl.lineInvisible]} />
        <View style={[tl.node, { backgroundColor: cfg.nodeColor, borderColor: cfg.nodeBorder }, evt.isBig && tl.nodeBig]}>
          {evt.isBig ? <Icon size={evt.type === 'enroll' ? 13 : 12} color="#fff" /> : <View style={tl.nodeDot} />}
        </View>
        <View style={[tl.lineBottom, isLast && tl.lineInvisible]} />
      </View>
      <View style={tl.cardCol}>
        {evt.isBig ? (
          <View style={[tl.card, { backgroundColor: cfg.cardBg, borderColor: cfg.cardBorder }]}>
            <View style={[tl.badge, { backgroundColor: cfg.labelBg }]}>
              <Icon size={10} color={cfg.iconColor} />
              <Text style={[tl.badgeText, { color: cfg.labelColor }]}>{cfg.label}</Text>
            </View>
            <Text style={tl.cardTitle}>{evt.title}</Text>
            {evt.subtitle ? <Text style={[tl.cardSub, { color: cfg.iconColor }]}>{evt.subtitle}</Text> : null}
          </View>
        ) : (
          <View style={tl.chip}>
            <Target size={12} color={isDark ? '#4ade80' : '#16a34a'} />
            <Text style={tl.chipText}>{evt.title}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MonthDividerRow({ label, isFirst, colors, isDark }: { label: string; isFirst: boolean; colors: any; isDark: boolean }) {
  const tl = useMemo(() => createTlStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={tl.row}>
      <View style={tl.dateCol} />
      <View style={tl.lineCol}>
        <View style={[tl.lineTop, isFirst && tl.lineInvisible]} />
        <View style={tl.monthNode} />
        <View style={tl.lineBottom} />
      </View>
      <View style={tl.cardCol}>
        <View style={tl.monthPill}>
          <Text style={tl.monthPillText}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

function TodayRow({ practicalLevel, theoryLevel, colors, isDark }: { practicalLevel: string; theoryLevel: string; colors: any; isDark: boolean }) {
  const tl = useMemo(() => createTlStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={tl.row}>
      <View style={tl.dateCol}>
        <Text style={tl.todayDateLabel}>Today</Text>
      </View>
      <View style={tl.lineCol}>
        <View style={tl.lineTop} />
        <View style={tl.todayNode}>
          <MapPin size={12} color="#fff" />
        </View>
      </View>
      <View style={tl.cardCol}>
        <View style={tl.todayCard}>
          <View style={tl.todayCardHeader}>
            <Award size={14} color={isDark ? '#60a5fa' : '#1e40af'} />
            <Text style={tl.todayCardTitle}>Current Level</Text>
          </View>
          <View style={tl.levelRow}>
            <View style={tl.levelChip}>
              <Text style={tl.levelChipLabel}>Practical</Text>
              <Text style={tl.levelChipValue}>{practicalLevel}</Text>
            </View>
            <View style={tl.levelChip}>
              <Text style={tl.levelChipLabel}>Theory</Text>
              <Text style={tl.levelChipValue}>{theoryLevel}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function createTlStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'stretch' },
    dateCol: { width: DATE_COL_WIDTH, alignItems: 'flex-end', paddingRight: 10, paddingTop: 10 },
    dateDay: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'right' },
    dateYear: { fontSize: 10, color: colors.textMuted, textAlign: 'right', marginTop: 1 },
    todayDateLabel: { fontSize: 11, fontWeight: '800', color: colors.primary, textAlign: 'right' },
    lineCol: { width: LINE_COL_WIDTH, alignItems: 'center' },
    lineTop: { width: 2, flex: 1, minHeight: 12, backgroundColor: colors.border, borderRadius: 1 },
    lineBottom: { width: 2, flex: 1, minHeight: 12, backgroundColor: colors.border, borderRadius: 1 },
    lineInvisible: { backgroundColor: 'transparent' },
    node: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    nodeBig: { width: 32, height: 32, borderRadius: 16 },
    nodeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    monthNode: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, borderWidth: 2, borderColor: colors.card, zIndex: 1 },
    todayNode: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    cardCol: { flex: 1, paddingLeft: 10, paddingTop: 6, paddingBottom: 12 },
    card: { borderRadius: 14, borderWidth: 1.5, padding: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 6 },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
    cardSub: { fontSize: 12, fontWeight: '600', marginTop: 3 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? '#052e16' : '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#14532d' : '#bbf7d0', paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start' },
    chipText: { fontSize: 12, fontWeight: '600', color: isDark ? '#86efac' : '#166534' },
    monthPill: { alignSelf: 'flex-start', backgroundColor: colors.skeleton, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, marginTop: 2, marginBottom: 2 },
    monthPillText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    todayCard: { backgroundColor: isDark ? '#172554' : '#eff6ff', borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? '#1e3a8a' : '#bfdbfe', padding: 12 },
    todayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    todayCardTitle: { fontSize: 12, fontWeight: '700', color: isDark ? '#60a5fa' : '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 },
    levelRow: { flexDirection: 'row', gap: 8 },
    levelChip: { flex: 1, backgroundColor: isDark ? '#1e3a8a' : '#dbeafe', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
    levelChipLabel: { fontSize: 10, color: isDark ? '#93c5fd' : '#3b82f6', fontWeight: '600', textTransform: 'uppercase' },
    levelChipValue: { fontSize: 14, fontWeight: '800', color: isDark ? '#dbeafe' : '#1e3a8a', marginTop: 2 },
  });
}

function StatCard({ value, label, accent, colors, isDark }: { value: string | number; label: string; accent: string; colors: any; isDark: boolean }) {
  const sc = useMemo(() => createScStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={[sc.box, { borderTopColor: accent }]}>
      <Text style={[sc.num, { color: accent }]}>{value}</Text>
      <Text style={sc.lbl}>{label}</Text>
    </View>
  );
}

function createScStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    box: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: colors.cardBorder },
    num: { fontSize: 24, fontWeight: '800' },
    lbl: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6 },
  });
}

export default function MilestoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomPadding(20);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [student, setStudent] = useState<Student | null>(null);
  const [milestones, setMilestones] = useState<MilestoneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const studentData = await studentService.getStudent(id);
        if (!studentData) { setLoading(false); return; }
        setStudent(studentData);
        const records = await progressService.getProgressRecords(id);
        const events: MilestoneEvent[] = [];
        const enrollDate = parseDate(studentData.enrollment_date);
        events.push({ id: 'enroll', date: studentData.enrollment_date, sortKey: enrollDate.toISOString(), rawDate: enrollDate, isBig: true, type: 'enroll', title: `Started ${studentData.instrument}`, subtitle: 'Enrolled at KGS Music Academy', monthYear: formatMonthYear(studentData.enrollment_date) });
        studentData.completed_grades?.forEach((grade: CompletedGrade, i: number) => {
          const gd = parseDate(grade.date);
          events.push({ id: `grade-${i}`, date: grade.date, sortKey: gd.toISOString(), rawDate: gd, isBig: true, type: 'grade', title: `Completed ${grade.grade} ${grade.type === 'theory' ? 'Theory' : 'Practical'}`, subtitle: grade.mark ? `Score: ${grade.mark}` : undefined, monthYear: formatMonthYear(grade.date) });
        });
        records?.filter(r => r.goal_status === 'achieved' && r.weekly_goal).forEach((r, i) => {
          const gd = parseDate(r.created_at);
          events.push({ id: `goal-${i}`, date: r.created_at, sortKey: gd.toISOString(), rawDate: gd, isBig: false, type: 'goal', title: r.weekly_goal, monthYear: formatMonthYear(r.created_at) });
        });
        events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        setMilestones(events);
      } catch (err) {
        console.error('Failed to load milestone data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Musical Journey</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Student not found</Text>
        </View>
      </View>
    );
  }

  const cg = student.completed_grades || [];
  const practicalLevel = getCurrentLevel(cg, 'practical');
  const theoryLevel = getCurrentLevel(cg, 'theory');
  const bigCount = milestones.filter(m => m.isBig).length;
  const smallCount = milestones.filter(m => !m.isBig).length;
  const monthsLearning = student.enrollment_date ? Math.floor((Date.now() - parseDate(student.enrollment_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 0;

  type TimelineItem = { kind: 'month'; label: string; key: string } | { kind: 'event'; evt: MilestoneEvent; key: string };
  const timelineItems: TimelineItem[] = [];
  let lastMonth = '';
  milestones.forEach(evt => {
    if (evt.monthYear !== lastMonth) {
      timelineItems.push({ kind: 'month', label: evt.monthYear, key: `month-${evt.monthYear}` });
      lastMonth = evt.monthYear;
    }
    timelineItems.push({ kind: 'event', evt, key: evt.id });
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Musical Journey</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPadding }]}>
        <LinearGradient colors={isDark ? [colors.gradientStart, colors.gradientEnd] : ['#1e40af', '#3b82f6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{student.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{student.full_name}</Text>
            <View style={styles.heroInstrumentRow}>
              <InstrumentIcon instrument={student.instrument} size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroInstrument}>{student.instrument}</Text>
            </View>
            <Text style={styles.heroLevels}>Practical {practicalLevel}  ·  Theory {theoryLevel}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard value={bigCount} label="Milestones" accent={isDark ? '#a78bfa' : '#7c3aed'} colors={colors} isDark={isDark} />
          <StatCard value={smallCount} label="Goals Hit" accent={isDark ? '#4ade80' : '#16a34a'} colors={colors} isDark={isDark} />
          <StatCard value={monthsLearning} label="Months" accent={colors.primary} colors={colors} isDark={isDark} />
        </View>

        {milestones.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Music2 size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No milestones yet</Text>
            <Text style={styles.emptyText}>Milestones will appear here as your child progresses.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, idx) => {
              if (item.kind === 'month') {
                return <MonthDividerRow key={item.key} label={item.label} isFirst={idx === 0} colors={colors} isDark={isDark} />;
              }
              return <TimelineRow key={item.key} evt={item.evt} isFirst={false} isLast={false} colors={colors} isDark={isDark} />;
            })}
            <TodayRow practicalLevel={practicalLevel} theoryLevel={theoryLevel} colors={colors} isDark={isDark} />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    scrollInner: { paddingBottom: 20 },
    header: { backgroundColor: colors.headerBg, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.skeleton, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
    heroBanner: { margin: 16, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    heroAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    heroAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
    heroInfo: { flex: 1 },
    heroName: { fontSize: 18, fontWeight: '800', color: '#fff' },
    heroInstrumentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    heroInstrument: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
    heroLevels: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 5, fontWeight: '600' },
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
    timelineContainer: { paddingHorizontal: 16, paddingTop: 4 },
    emptyBox: { alignItems: 'center', padding: 40, backgroundColor: colors.card, borderRadius: 20, margin: 16, borderWidth: 1, borderColor: colors.cardBorder },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.skeleton, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  });
}
