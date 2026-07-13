import React, { useEffect, useState } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Icon & color config ──────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  MilestoneType,
  {
    Icon: any;
    nodeColor: string;        // timeline node circle color
    nodeBorder: string;
    cardBg: string;
    cardBorder: string;
    iconBg: string;
    iconColor: string;
    labelBg: string;
    labelColor: string;
    label: string;
  }
> = {
  enroll: {
    Icon: Star,
    nodeColor: '#fbbf24',
    nodeBorder: '#fde68a',
    cardBg: '#fffbeb',
    cardBorder: '#fde68a',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    labelBg: '#fef3c7',
    labelColor: '#92400e',
    label: 'Enrolled',
  },
  grade: {
    Icon: GraduationCap,
    nodeColor: '#7c3aed',
    nodeBorder: '#ddd6fe',
    cardBg: '#faf5ff',
    cardBorder: '#ddd6fe',
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    labelBg: '#ede9fe',
    labelColor: '#5b21b6',
    label: 'Grade',
  },
  goal: {
    Icon: CheckCircle2,
    nodeColor: '#16a34a',
    nodeBorder: '#bbf7d0',
    cardBg: '#f0fdf4',
    cardBorder: '#bbf7d0',
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    labelBg: '#dcfce7',
    labelColor: '#14532d',
    label: 'Goal',
  },
  special: {
    Icon: Award,
    nodeColor: '#1e40af',
    nodeBorder: '#bfdbfe',
    cardBg: '#eff6ff',
    cardBorder: '#bfdbfe',
    iconBg: '#dbeafe',
    iconColor: '#1e40af',
    labelBg: '#dbeafe',
    labelColor: '#1e3a8a',
    label: 'Achievement',
  },
};

function InstrumentIcon({ instrument, size, color }: { instrument: string; size: number; color: string }) {
  const n = instrument.toLowerCase();
  if (n.includes('theory') || n.includes('book')) return <BookOpen size={size} color={color} />;
  return <Music2 size={size} color={color} />;
}

// ─── Timeline Row ─────────────────────────────────────────────────────────────
//
//  Layout:
//
//  [date col]  [line+node col]  [card col]
//
//  10 Jun         ●──────────  ┌──────────────┐
//  2025           │            │  Card title  │
//                 │            │  subtitle    │
//                 │            └──────────────┘
//                 │
//

const LINE_COL_WIDTH = 40;   // width of the column that holds the vertical line + node
const DATE_COL_WIDTH = 56;   // width of the date column on the left

function TimelineRow({
  evt,
  isFirst,
  isLast,
}: {
  evt: MilestoneEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const cfg = TYPE_CONFIG[evt.type] ?? TYPE_CONFIG.special;
  const { Icon } = cfg;

  return (
    <View style={tlStyles.row}>

      {/* ── Left: date ── */}
      <View style={tlStyles.dateCol}>
        <Text style={tlStyles.dateDay}>
          {parseDate(evt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </Text>
        <Text style={tlStyles.dateYear}>
          {parseDate(evt.date).getFullYear()}
        </Text>
      </View>

      {/* ── Centre: vertical line + node ── */}
      <View style={tlStyles.lineCol}>
        {/* Top connector line — hidden for first item */}
        <View style={[tlStyles.lineTop, isFirst && tlStyles.lineInvisible]} />

        {/* Node circle */}
        <View style={[
          tlStyles.node,
          { backgroundColor: cfg.nodeColor, borderColor: cfg.nodeBorder },
          evt.isBig && tlStyles.nodeBig,
        ]}>
          {evt.isBig
            ? <Icon size={evt.type === 'enroll' ? 13 : 12} color="#fff" />
            : <View style={tlStyles.nodeDot} />
          }
        </View>

        {/* Bottom connector line — hidden for last item */}
        <View style={[tlStyles.lineBottom, isLast && tlStyles.lineInvisible]} />
      </View>

      {/* ── Right: card ── */}
      <View style={tlStyles.cardCol}>
        {evt.isBig ? (
          // Big milestone — full card
          <View style={[
            tlStyles.card,
            { backgroundColor: cfg.cardBg, borderColor: cfg.cardBorder },
          ]}>
            {/* Type label badge */}
            <View style={[tlStyles.badge, { backgroundColor: cfg.labelBg }]}>
              <Icon size={10} color={cfg.iconColor} />
              <Text style={[tlStyles.badgeText, { color: cfg.labelColor }]}>
                {cfg.label}
              </Text>
            </View>

            <Text style={tlStyles.cardTitle}>{evt.title}</Text>

            {evt.subtitle ? (
              <Text style={[tlStyles.cardSub, { color: cfg.iconColor }]}>
                {evt.subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          // Small goal — compact chip
          <View style={tlStyles.chip}>
            <Target size={12} color="#16a34a" />
            <Text style={tlStyles.chipText}>{evt.title}</Text>
          </View>
        )}
      </View>

    </View>
  );
}

// Month divider row — no card, just a label on the line
function MonthDividerRow({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <View style={tlStyles.row}>
      <View style={tlStyles.dateCol} />

      <View style={tlStyles.lineCol}>
        <View style={[tlStyles.lineTop, isFirst && tlStyles.lineInvisible]} />
        <View style={tlStyles.monthNode} />
        <View style={tlStyles.lineBottom} />
      </View>

      <View style={tlStyles.cardCol}>
        <View style={tlStyles.monthPill}>
          <Text style={tlStyles.monthPillText}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

// Today node — terminal
function TodayRow({ practicalLevel, theoryLevel }: { practicalLevel: string; theoryLevel: string }) {
  return (
    <View style={tlStyles.row}>
      <View style={tlStyles.dateCol}>
        <Text style={tlStyles.todayDateLabel}>Today</Text>
      </View>

      <View style={tlStyles.lineCol}>
        <View style={tlStyles.lineTop} />
        <View style={tlStyles.todayNode}>
          <MapPin size={12} color="#fff" />
        </View>
        {/* No bottom line — this is the end */}
      </View>

      <View style={tlStyles.cardCol}>
        <View style={tlStyles.todayCard}>
          <View style={tlStyles.todayCardHeader}>
            <Award size={14} color="#1e40af" />
            <Text style={tlStyles.todayCardTitle}>Current Level</Text>
          </View>
          <View style={tlStyles.levelRow}>
            <View style={tlStyles.levelChip}>
              <Text style={tlStyles.levelChipLabel}>Practical</Text>
              <Text style={tlStyles.levelChipValue}>{practicalLevel}</Text>
            </View>
            <View style={tlStyles.levelChip}>
              <Text style={tlStyles.levelChipLabel}>Theory</Text>
              <Text style={tlStyles.levelChipValue}>{theoryLevel}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  // Date column
  dateCol: {
    width: DATE_COL_WIDTH,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 10,
  },
  dateDay: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'right' },
  dateYear: { fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 1 },
  todayDateLabel: { fontSize: 11, fontWeight: '800', color: '#1e40af', textAlign: 'right' },

  // Line + node column
  lineCol: {
    width: LINE_COL_WIDTH,
    alignItems: 'center',
  },
  lineTop: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
  lineBottom: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
  lineInvisible: { backgroundColor: 'transparent' },

  // Regular node
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeBig: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  // Month divider node
  monthNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    zIndex: 1,
  },

  // Today node
  todayNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e40af',
    borderWidth: 3,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Card column
  cardCol: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 6,
    paddingBottom: 12,
  },

  // Big milestone card
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  cardSub: { fontSize: 12, fontWeight: '600', marginTop: 3 },

  // Small goal chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  // Month pill (divider)
  monthPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 2,
    marginBottom: 2,
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Today card
  todayCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    padding: 12,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  todayCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelChip: {
    flex: 1,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  levelChipLabel: { fontSize: 10, color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' },
  levelChipValue: { fontSize: 14, fontWeight: '800', color: '#1e3a8a', marginTop: 2 },
});

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <View style={[scStyles.box, { borderTopColor: accent }]}>
      <Text style={[scStyles.num, { color: accent }]}>{value}</Text>
      <Text style={scStyles.lbl}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  num: { fontSize: 24, fontWeight: '800' },
  lbl: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MilestoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

        // 1 — Enrollment
        const enrollDate = parseDate(studentData.enrollment_date);
        events.push({
          id: 'enroll',
          date: studentData.enrollment_date,
          sortKey: enrollDate.toISOString(),
          rawDate: enrollDate,
          isBig: true,
          type: 'enroll',
          title: `Started ${studentData.instrument}`,
          subtitle: 'Enrolled at KGS Music Academy',
          monthYear: formatMonthYear(studentData.enrollment_date),
        });

        // 2 — Completed grades
        studentData.completed_grades?.forEach((grade: CompletedGrade, i: number) => {
          const gd = parseDate(grade.date);
          events.push({
            id: `grade-${i}`,
            date: grade.date,
            sortKey: gd.toISOString(),
            rawDate: gd,
            isBig: true,
            type: 'grade',
            title: `Completed ${grade.grade} ${grade.type === 'theory' ? 'Theory' : 'Practical'}`,
            subtitle: grade.mark ? `Score: ${grade.mark}` : undefined,
            monthYear: formatMonthYear(grade.date),
          });
        });

        // 3 — Goals achieved
        records
          ?.filter(r => r.goal_status === 'achieved' && r.weekly_goal)
          .forEach((r, i) => {
            const gd = parseDate(r.created_at);
            events.push({
              id: `goal-${i}`,
              date: r.created_at,
              sortKey: gd.toISOString(),
              rawDate: gd,
              isBig: false,
              type: 'goal',
              title: r.weekly_goal,
              monthYear: formatMonthYear(r.created_at),
            });
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
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Musical Journey</Text>
        </View>
        <View style={styles.center}>
          <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600' }}>Student not found</Text>
        </View>
      </View>
    );
  }

  const cg = student.completed_grades || [];
  const practicalLevel = getCurrentLevel(cg, 'practical');
  const theoryLevel = getCurrentLevel(cg, 'theory');
  const bigCount = milestones.filter(m => m.isBig).length;
  const smallCount = milestones.filter(m => !m.isBig).length;
  const monthsLearning = student.enrollment_date
    ? Math.floor((Date.now() - parseDate(student.enrollment_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0;

  // Build flat list of timeline items with month dividers injected
  type TimelineItem =
    | { kind: 'month'; label: string; key: string }
    | { kind: 'event'; evt: MilestoneEvent; key: string };

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Musical Journey</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollInner}>

        {/* Hero */}
        <LinearGradient
          colors={['#1e40af', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {student.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{student.full_name}</Text>
            <View style={styles.heroInstrumentRow}>
              <InstrumentIcon instrument={student.instrument} size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroInstrument}>{student.instrument}</Text>
            </View>
            <Text style={styles.heroLevels}>
              Practical {practicalLevel}  ·  Theory {theoryLevel}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={bigCount} label="Milestones" accent="#7c3aed" />
          <StatCard value={smallCount} label="Goals Hit" accent="#16a34a" />
          <StatCard value={monthsLearning} label="Months" accent="#1e40af" />
        </View>

        {/* Timeline */}
        {milestones.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Music2 size={36} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No milestones yet</Text>
            <Text style={styles.emptyText}>
              Milestones will appear here as your child progresses.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, idx) => {
              if (item.kind === 'month') {
                // Find whether there's a line above this — yes unless it's the very first item
                return (
                  <MonthDividerRow
                    key={item.key}
                    label={item.label}
                    isFirst={idx === 0}
                  />
                );
              }
              // Find if this is the very last event item (before today node)
              const isLastEvent = idx === timelineItems.length - 1;
              const isFirstEvent = idx === 0 || timelineItems[idx - 1].kind === 'month';
              return (
                <TimelineRow
                  key={item.key}
                  evt={item.evt}
                  isFirst={false}   // month dividers handle the top gap
                  isLast={false}    // today node always follows
                />
              );
            })}

            {/* Today — terminal node */}
            <TodayRow
              practicalLevel={practicalLevel}
              theoryLevel={theoryLevel}
            />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Page styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 20 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#1e293b' },

  heroBanner: {
    margin: 16, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroInstrumentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  heroInstrument: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroLevels: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 5, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },

  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  emptyBox: {
    alignItems: 'center', padding: 40,
    backgroundColor: '#fff', borderRadius: 20, margin: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
});