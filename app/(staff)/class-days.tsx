import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/lib/firestore';
import { Student } from '@/types/database';
import { ArrowLeft, ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react-native';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTodayDayName(): string {
  return DAY_NAMES[(new Date().getDay() + 6) % 7];
}

const BATCHES = ['Batch 1', 'Batch 2', 'Batch 3'];

const INSTRUMENT_CAPS: Record<string, number> = {
  'keyboard': 20,
  'piano': 3,
  'violin': 4,
  'guitar': 5,
  'drum kit': 2,
  'drums': 2,
};

function isBatchOverCapacity(students: Student[]): boolean {
  const counts: Record<string, number> = {};
  for (const s of students) {
    const inst = (s.instrument || '').toLowerCase().trim();
    counts[inst] = (counts[inst] || 0) + 1;
  }
  for (const [inst, count] of Object.entries(counts)) {
    const cap = INSTRUMENT_CAPS[inst];
    if (cap !== undefined && count > cap) return true;
  }
  return false;
}

function getInstrumentAbbrev(name: string): string {
  const map: Record<string, string> = {
    'keyboard': 'EK',
    'piano': 'P',
    'violin': 'Vi',
    'guitar': 'PG',
    'drum kit': 'DK',
    'flute': 'Fl',
    'ukulele': 'Uk',
  };
  const key = name.toLowerCase().trim();
  return map[key] || key.slice(0, 2);
}

function getInstrumentCountEntries(students: Student[]): { text: string; overCap: boolean }[] {
  const counts: Record<string, number> = {};
  for (const s of students) {
    const inst = (s.instrument || '').toLowerCase().trim();
    counts[inst] = (counts[inst] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => {
      const cap = INSTRUMENT_CAPS[name];
      return {
        text: `${getInstrumentAbbrev(name)}:${count}`,
        overCap: cap !== undefined && count > cap,
      };
    });
}

export default function StaffClassDays() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => DAY_NAMES.indexOf(getTodayDayName()));
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 1300;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setError('');
      const allStudents = await studentService.getAllStudents();
      setStudents(allStudents);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
  }

  function goPrev() {
    setSelectedDayIdx(prev => (prev === 0 ? DAY_NAMES.length - 1 : prev - 1));
  }

  function goNext() {
    setSelectedDayIdx(prev => (prev === DAY_NAMES.length - 1 ? 0 : prev + 1));
  }

  const currentDay = DAY_NAMES[selectedDayIdx];

  const dayStudents = useMemo(() => {
    const result: { batch: string; student: Student; isCompensation: boolean }[] = [];
    for (const s of students) {
      if (s.class_days?.[0] === currentDay && s.class_day_batches?.day1_batch) {
        result.push({ batch: s.class_day_batches.day1_batch, student: s, isCompensation: false });
      }
      if (s.class_days?.[1] === currentDay && s.class_day_batches?.day2_batch) {
        result.push({ batch: s.class_day_batches.day2_batch, student: s, isCompensation: false });
      }
      if (s.class_days?.[2] === currentDay && s.class_day_batches?.compensation_batch) {
        result.push({ batch: s.class_day_batches.compensation_batch, student: s, isCompensation: true });
      }
    }
    return result;
  }, [students, currentDay]);

  const batchedGroups = useMemo(() => {
    return BATCHES.map(batch => {
      const entries = dayStudents.filter(s => s.batch === batch);
      return {
        batch,
        entries,
        overCapacity: isBatchOverCapacity(entries.map(e => e.student)),
      };
    });
  }, [dayStudents]);

  const hasStudents = batchedGroups.some(g => g.entries.length > 0);
  const emptyDay = !hasStudents && dayStudents.length === 0;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading class schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Class Days</Text>
          <Text style={styles.headerSubtitle}>Students grouped by day and batch</Text>
        </View>
      </View>

      <View style={styles.dayNav}>
        <TouchableOpacity style={styles.navButton} onPress={goPrev}>
          <ChevronLeft size={20} color="#1e40af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dayLabel}
          onPress={() => setSelectedDayIdx(DAY_NAMES.indexOf(getTodayDayName()))}>
          <Clock size={16} color="#1e40af" />
          <Text style={styles.dayLabelText}>{currentDay}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{dayStudents.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goNext}>
          <ChevronRight size={20} color="#1e40af" />
        </TouchableOpacity>
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
        ) : emptyDay ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No classes on {currentDay}</Text>
            <Text style={styles.emptyText}>
              No students are scheduled for this day
            </Text>
          </View>
        ) : isWide ? (
          <View style={styles.wideContainer}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderLabel}>{currentDay}</Text>
              <Text style={styles.dayHeaderCount}>
                {dayStudents.length} student{dayStudents.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.wideRow}>
              {batchedGroups.map((group, idx) => (
                <React.Fragment key={group.batch}>
                  {idx > 0 && <View style={styles.wideSeparator} />}
                  <View style={styles.wideBatchCol}>
                    <View style={styles.wideBatchTitle}>
                      <Clock size={14} color="#1e40af" />
                      <Text style={styles.wideBatchLabel}>{group.batch}</Text>
                      <Text style={styles.instrumentCounts}>
                        {getInstrumentCountEntries(group.entries.map(e => e.student)).map((item, i) => [
                          i > 0 ? <Text key={`s${i}`}>, </Text> : null,
                          <Text key={i} style={item.overCap && styles.instrumentCountsOverCap}>{item.text}</Text>,
                        ]).flat()}
                      </Text>
                      <Text style={[styles.batchCount, group.overCapacity && styles.batchCountOverCap]}>{group.entries.length}</Text>
                    </View>
                    {group.entries.length > 0 ? (
                      <View style={styles.studentList}>
                        {group.entries.map((entry) => {
                          const student = entry.student;
                          return (
                            <View key={student.id} style={styles.studentRow}>
                              <View style={styles.studentAvatar}>
                                <Text style={styles.avatarText}>
                                  {(student.full_name || '?').charAt(0)}
                                </Text>
                              </View>
                              <View style={styles.studentInfo}>
                                <View style={styles.nameRow}>
                                  <Text style={styles.studentName} numberOfLines={1}>
                                    {student.full_name}{student.summer_class ? ' ☀️' : ''}
                                  </Text>
                                  {entry.isCompensation && (
                                    <View style={styles.compBadge}>
                                      <Text style={styles.compBadgeText}>Comp</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.studentDetail}>
                                  {student.instrument}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.emptyBatchText}>No students</Text>
                    )}
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.sectionsList}>
            <View style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderLabel}>{currentDay}</Text>
                <Text style={styles.dayHeaderCount}>
                  {dayStudents.length} student{dayStudents.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {batchedGroups.map((group) => (
                <View key={group.batch} style={styles.batchGroup}>
                  <View style={styles.batchHeader}>
                    <Clock size={14} color="#1e40af" />
                    <Text style={styles.batchLabel}>{group.batch}</Text>
                    <Text style={styles.instrumentCounts}>
                      {getInstrumentCountEntries(group.entries.map(e => e.student)).map((item, i) => [
                        i > 0 ? <Text key={`s${i}`}>, </Text> : null,
                        <Text key={i} style={item.overCap && styles.instrumentCountsOverCap}>{item.text}</Text>,
                      ]).flat()}
                    </Text>
                    <Text style={[styles.batchCount, group.overCapacity && styles.batchCountOverCap]}>{group.entries.length}</Text>
                  </View>
                  <View style={styles.studentList}>
                    {group.entries.map((entry) => {
                      const student = entry.student;
                      return (
                        <View key={student.id} style={styles.studentRow}>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.avatarText}>
                              {(student.full_name || '?').charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.studentInfo}>
                            <View style={styles.nameRow}>
                              <Text style={styles.studentName} numberOfLines={1}>
                                {student.full_name}{student.summer_class ? ' ☀️' : ''}
                              </Text>
                              {entry.isCompensation && (
                                <View style={styles.compBadge}>
                                  <Text style={styles.compBadgeText}>Comp</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.studentDetail}>
                              {student.instrument}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  dayLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  countBadge: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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
  sectionsList: {
    padding: 16,
  },
  daySection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayHeaderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  dayHeaderCount: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  batchGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  batchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  instrumentCounts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00F900',
    letterSpacing: 0.5,
  },
  instrumentCountsOverCap: {
    color: '#dc2626',
  },
  batchCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  batchCountOverCap: {
    color: '#fff',
    backgroundColor: '#dc2626',
  },
  studentList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  wideContainer: {
    padding: 16,
  },
  wideRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wideSeparator: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  wideBatchCol: {
    flex: 1,
    padding: 12,
  },
  wideBatchTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  wideBatchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    flex: 1,
  },
  emptyBatchText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  studentDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
});
