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
import { studentService, progressService } from '@/lib/firestore';
import { Student, CompletedGrade } from '@/types/database';
import { ArrowLeft, Music2, Award, Sparkles } from 'lucide-react-native';

interface MilestoneEvent {
  date: string;
  sortKey: string;
  isBig: boolean;
  title: string;
  subtitle?: string;
  icon: string;
  monthYear: string;
  rawDate: Date;
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
  const d = parseDate(dateInput);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function getInstrumentEmoji(instrument: string): string {
  const map: Record<string, string> = {
    Piano: '🎹', Keyboard: '🎹', Guitar: '🎸',
    'Classical Guitar': '🎸', 'Bass Guitar': '🎸',
    'Pluctrum Guitar': '🎸', 'Plectrum Guitar': '🎸',
    Violin: '🎻', Drums: '🥁', 'Drum Kit': '🥁',
    Flute: '🪈', Theory: '📝',
  };
  return map[instrument] || '🎵';
}

function sortGroups(a: { monthYear: string }, b: { monthYear: string }) {
  const dateA = new Date(a.monthYear + ' 1');
  const dateB = new Date(b.monthYear + ' 1');
  return dateA.getTime() - dateB.getTime();
}

function getCurrentLevel(completedGrades: CompletedGrade[], type: 'theory' | 'practical'): string {
  const filtered = completedGrades.filter(g => g.type === type);
  if (filtered.length === 0) return 'Basic';

  let maxNum = 0;
  let hasInitial = false;

  for (const g of filtered) {
    const gs = (g.grade || '').trim();
    if (/^ini/i.test(gs)) {
      hasInitial = true;
      continue;
    }
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

        const enrollDate = parseDate(studentData.enrollment_date);
        events.push({
          date: studentData.enrollment_date,
          sortKey: enrollDate.toISOString(),
          rawDate: enrollDate,
          isBig: true,
          title: `Started ${studentData.instrument}`,
          subtitle: 'Enrolled at KGS Music Academy',
          icon: getInstrumentEmoji(studentData.instrument),
          monthYear: formatMonthYear(studentData.enrollment_date),
        });

        if (studentData.completed_grades?.length) {
          studentData.completed_grades.forEach((grade: CompletedGrade) => {
            const gd = parseDate(grade.date);
            events.push({
              date: grade.date,
              sortKey: gd.toISOString(),
              rawDate: gd,
              isBig: true,
              title: `Completed ${grade.grade} ${grade.type === 'theory' ? 'Theory' : 'Practical'}`,
              subtitle: grade.mark ? `Mark: ${grade.mark}` : undefined,
              icon: '🎓',
              monthYear: formatMonthYear(grade.date),
            });
          });
        }

        if (records?.length) {
          records.filter(r => r.goal_status === 'achieved' && r.weekly_goal).forEach(r => {
            const gd = parseDate(r.created_at);
            events.push({
              date: r.created_at,
              sortKey: gd.toISOString(),
              rawDate: gd,
              isBig: false,
              title: r.weekly_goal,
              icon: '🎯',
              monthYear: formatMonthYear(r.created_at),
            });
          });
        }

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

  const groupMap = new Map<string, MilestoneEvent[]>();
  for (const m of milestones) {
    if (!groupMap.has(m.monthYear)) groupMap.set(m.monthYear, []);
    groupMap.get(m.monthYear)!.push(m);
  }
  const grouped = Array.from(groupMap.entries())
    .map(([monthYear, events]) => ({ monthYear, events }))
    .sort(sortGroups);

  const bigCount = milestones.filter(m => m.isBig).length;
  const smallCount = milestones.filter(m => !m.isBig).length;

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#1e40af" /></View>;
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Musical Journey</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Student not found</Text>
        </View>
      </View>
    );
  }

  const initial = student.full_name.charAt(0).toUpperCase();
  const cg = student.completed_grades || [];
  const practicalLevel = getCurrentLevel(cg, 'practical');
  const theoryLevel = getCurrentLevel(cg, 'theory');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Musical Journey</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initial}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{student.full_name}</Text>
            <Text style={styles.heroInstrument}>{getInstrumentEmoji(student.instrument)} {student.instrument}</Text>
            <Text style={styles.heroLevels}>
              Practical {practicalLevel} · Theory {theoryLevel}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statNum}>{bigCount}</Text><Text style={styles.statLbl}>Milestones</Text></View>
          <View style={styles.statBox}><Text style={styles.statNum}>{smallCount}</Text><Text style={styles.statLbl}>Goals Hit</Text></View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {student.enrollment_date
                ? Math.floor((Date.now() - parseDate(student.enrollment_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
                : 0}
            </Text>
            <Text style={styles.statLbl}>Months</Text>
          </View>
        </View>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music2 size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No milestones yet</Text>
            <Text style={styles.emptyText}>Milestones will appear here as your child progresses.</Text>
          </View>
        ) : (
          <View style={styles.timelineOuter}>
            {grouped.map((group, groupIdx) => {
              const bigEvents = group.events.filter(e => e.isBig);
              const smallEvents = group.events.filter(e => !e.isBig);

              return (
                <View key={group.monthYear}>
                  {/* ──●── Month label */}
                  <View style={styles.sectionRow}>
                    <Text style={styles.dateLabel}>{group.monthYear}</Text>
                    <View style={styles.dotWrap}>
                      <View style={styles.dotLineLeft} />
                      <View style={styles.dot} />
                    </View>
                    <View style={styles.dotLineRight} />
                  </View>

                  {/* Big milestones */}
                  {bigEvents.map((evt, ei) => (
                    <View key={`big-${ei}`}>
                      <View style={styles.eventRow}>
                        <View style={styles.eventDateCol}>
                          <Text style={styles.eventDate}>
                            {parseDate(evt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                        <View style={styles.eventDotCol}>
                          <View style={styles.eventDotLine} />
                        </View>
                        <View style={styles.eventContentCol}>
                          <Text style={styles.eventText}>
                            {evt.icon}  {evt.title}
                          </Text>
                          {evt.subtitle ? (
                            <Text style={styles.eventSub}>{evt.subtitle}</Text>
                          ) : null}
                        </View>
                      </View>
                      {/* Separator line after every big milestone */}
                      <View style={styles.bigSeparator}>
                        <View style={styles.sepDateCol} />
                        <View style={styles.sepDotCol}>
                          <View style={styles.sepDot} />
                        </View>
                        <View style={styles.sepLine} />
                      </View>
                    </View>
                  ))}

                  {/* Small milestones */}
                  {smallEvents.map((evt, si) => (
                    <View key={`small-${si}`} style={styles.eventRowSmall}>
                      <View style={styles.eventDateCol}>
                        <Text style={styles.eventDateSmall}>
                          {parseDate(evt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                      <View style={styles.eventDotCol}>
                        {si === 0 && bigEvents.length > 0 ? (
                          <View style={styles.eventDotLine} />
                        ) : si === 0 && bigEvents.length === 0 ? (
                          <View style={styles.eventDotLine} />
                        ) : (
                          <View style={styles.eventDotLine} />
                        )}
                      </View>
                      <View style={styles.eventContentCol}>
                        <Text style={styles.eventTextSmall}>{evt.icon}  {evt.title}</Text>
                      </View>
                    </View>
                  ))}

                  {/* Connecting tail to next month */}
                  {groupIdx < grouped.length - 1 && <View style={styles.tailLine} />}
                </View>
              );
            })}

            {/* Today */}
            <View style={styles.sectionRow}>
              <Text style={[styles.dateLabel, styles.dateLabelToday]}>Today</Text>
              <View style={styles.dotWrap}>
                <View style={styles.dotLineLeft} />
                <View style={[styles.dot, styles.dotToday]} />
              </View>
              <View style={styles.dotLineRight} />
            </View>
            <View style={styles.eventRow}>
              <View style={styles.eventDateCol} />
              <View style={styles.eventDotCol}>
                <View style={styles.eventDotLine} />
              </View>
              <View style={styles.eventContentCol}>
                <View style={styles.todayRow}>
                  <Award size={18} color="#1e40af" />
                  <Text style={styles.todayText}>
                    {student.full_name} is currently{' '}
                    <Text style={styles.todayBold}>Practical {practicalLevel}</Text>
                    {' '}and{' '}
                    <Text style={styles.todayBold}>Theory {theoryLevel}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingTop: 0, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  scrollInner: { paddingBottom: 40 },
  content: { flex: 1 },
  errorText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
  },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e40af',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  heroInstrument: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '600' },
  heroLevels: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1e40af' },
  statLbl: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Timeline outer
  timelineOuter: { paddingHorizontal: 20 },

  // Section header: "Jan 2025   ──●──"
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  dateLabel: {
    fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 1, width: 72, textAlign: 'right', marginRight: 12,
  },
  dateLabelToday: { color: '#1e40af', fontSize: 13, letterSpacing: 0 },
  dotWrap: { flexDirection: 'row', alignItems: 'center' },
  dotLineLeft: { width: 16, height: 2, backgroundColor: '#cbd5e1', borderRadius: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#94a3b8', marginHorizontal: 0 },
  dotToday: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1e40af' },
  dotLineRight: { flex: 1, height: 2, backgroundColor: '#cbd5e1', borderRadius: 1, marginLeft: 8 },

  // Event row: date | dot | content
  eventRow: { flexDirection: 'row', marginLeft: 0 },
  eventRowSmall: { flexDirection: 'row', marginLeft: 0 },
  eventDateCol: { width: 72, marginRight: 12, alignItems: 'flex-end', paddingTop: 0 },
  eventDotCol: { width: 10, alignItems: 'center', marginRight: 10 },
  eventContentCol: { flex: 1, paddingBottom: 8 },

  eventDate: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  eventDateSmall: { fontSize: 10, fontWeight: '500', color: '#b0b8c4' },
  eventDotLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', minHeight: 20 },

  eventText: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  eventSub: { fontSize: 12, color: '#64748b', marginTop: 2, paddingLeft: 24 },
  eventTextSmall: { fontSize: 12, fontWeight: '600', color: '#64748b', fontStyle: 'italic', lineHeight: 18 },

  tailLine: { height: 16, marginLeft: 84, width: 2, backgroundColor: '#e2e8f0' },

  // Big milestone separator
  bigSeparator: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 0 },
  sepDateCol: { width: 72, marginRight: 12 },
  sepDotCol: { width: 10, marginRight: 10, alignItems: 'center' },
  sepDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' },
  sepLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },

  // Today card (minimal)
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  todayText: { fontSize: 14, color: '#1e40af', flex: 1, lineHeight: 20, fontWeight: '500' },
  todayBold: { fontWeight: '800' },

  // Empty state
  emptyContainer: { alignItems: 'center', padding: 40, backgroundColor: '#f8fafc', borderRadius: 24, marginTop: 20, marginHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },

  bottomPadding: { height: 60 },
});
