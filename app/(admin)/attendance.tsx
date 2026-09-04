import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  useWindowDimensions,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, attendanceService, unpaidClassService, profileService, compensationService } from '@/lib/firestore';
import { cacheService } from '@/lib/cache';
import { Student, AttendanceRecord } from '@/types/database';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Search, X, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CompensationOverride from '@/components/CompensationOverride';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekLabel(monthDate: Date, weekIdx: number, allWeeks: Date[][]): string {
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `${monthName} — Week ${weekIdx + 1}/${allWeeks.length}`;
}

function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function getWeeksOfMonth(monthDate: Date): Date[][] {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  const current = new Date(start);
  const firstDay = current.getDay();
  const diff = firstDay === 0 ? -6 : 1 - firstDay;
  current.setDate(current.getDate() + diff);

  while (current <= end || currentWeek.length > 0) {
    const d = new Date(current);
    currentWeek.push(d);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);

    if (current > end && currentWeek.length > 0) {
      weeks.push(currentWeek);
      break;
    }
  }

  return weeks;
}

function getWeekIndexForDate(date: Date, weeks: Date[][]): number {
  const dateStr = date.toDateString();
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].some(d => d.toDateString() === dateStr)) return i;
  }
  return 0;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [detailMonth, setDetailMonth] = useState(new Date());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailRecords, setDetailRecords] = useState<AttendanceRecord[]>([]);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchOpen = searchFocused || searchText.length > 0;
  const [recalculating, setRecalculating] = useState(false);
  const [compOverrideStudent, setCompOverrideStudent] = useState<Student | null>(null);
  const [prevMonthAttended, setPrevMonthAttended] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  function parseName(name: string) {
    const m = name.match(/^((?:[A-Z]\.\s*)+)(.+)/);
    if (m) return { initials: m[1].trim(), rest: m[2].trim() };
    return { initials: '', rest: name };
  }

  function displayName(name: string): string {
    const { initials, rest } = parseName(name);
    return initials ? `${rest}. ${initials}` : name;
  }

  function sortStudents(list: Student[]): Student[] {
    return [...list].sort((a, b) => {
      const aName = (displayName(a.full_name || '') || '').toLowerCase();
      const bName = (displayName(b.full_name || '') || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === 'web' && width >= 1300;

  const allWeeks = getWeeksOfMonth(currentMonth);
  const weekDates = allWeeks[currentWeekIndex] || allWeeks[0] || [];
  const weekMonday = weekDates[0] || new Date();
  const weekStartStr = formatDate(weekDates[0] || new Date());
  const weekEndStr = formatDate(weekDates[6] || new Date());

  const { start: monthStartStr, end: monthEndStr } = getMonthRange(currentMonth);
  const { start: detailStartStr, end: detailEndStr } = getMonthRange(detailMonth);

  const allAttendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    allAttendance.forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = [];
      map[r.student_id].push(r);
    });
    return map;
  }, [allAttendance]);

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      (s.full_name || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [students, debouncedSearch]
  );

  const { leftStudents, rightStudents } = useMemo(() => {
    const halfIdx = Math.ceil(filteredStudents.length / 2);
    return {
      leftStudents: filteredStudents.slice(0, halfIdx),
      rightStudents: filteredStudents.slice(halfIdx),
    };
  }, [filteredStudents]);

  const summaryByStudent = useMemo(() => {
    const result: Record<string, { present: number; extra: number; percentage: number; total: number }> = {};
    students.forEach(s => {
      const total = s.summer_class ? 30 : 8;
      let recs: AttendanceRecord[];
      if (s.summer_class) {
        recs = allAttendanceMap[s.id] || [];
      } else {
        recs = monthRecords.filter(r => r.student_id === s.id);
      }
      const count = recs.reduce((sum, r) => sum + (r.status === 'double_present' ? 2 : 1), 0);
      const present = Math.min(count, total);
      const extra = Math.max(count - total, 0);
      result[s.id] = { present, extra, total, percentage: Math.round((count / total) * 100) };
    });
    return result;
  }, [students, monthRecords, allAttendanceMap]);

  useEffect(() => {
    setLoading(true);
    const unsubStudents = studentService.subscribeToStudents((allStudents) => {
      setStudents(sortStudents(allStudents));
    });

    const unsubAttendance = attendanceService.subscribeToMonthAttendance(
      monthStartStr,
      monthEndStr,
      (records) => {
        setAllAttendance(records);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [monthStartStr, monthEndStr]);

  useEffect(() => {
    setWeekRecords(allAttendance.filter(r => r.date >= weekStartStr && r.date <= weekEndStr));
    setMonthRecords(allAttendance.filter(r => r.date >= monthStartStr && r.date <= monthEndStr));
  }, [allAttendance, weekStartStr, weekEndStr, monthStartStr, monthEndStr]);

  useEffect(() => {
    if (!selectedStudent) return;
    setDetailRecords(allAttendance.filter(r =>
      r.student_id === selectedStudent.id && r.date >= detailStartStr && r.date <= detailEndStr
    ));
  }, [allAttendance, detailMonth, selectedStudent]);

  async function runUnpaidClassDetection(force = false) {
    if (!profile) return;

    const now = new Date();
    let prevMonth = now.getMonth();
    let prevYear = now.getFullYear();
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const checkKey = `comp_check_${prevYear}_${String(prevMonth).padStart(2, '0')}`;

    try {
      if (!force) {
        const lastCheck = await AsyncStorage.getItem(checkKey);
        if (lastCheck === 'done') return;
      }

      const allStudents = await studentService.getAllStudents();

      for (const student of allStudents) {
        if (student.summer_class) continue;

        const prevFeeId = `${student.id}_${prevYear}_${prevMonth}`;
        const prevFeeDoc = await (await import('@/lib/firestore')).getDoc((await import('@/lib/firestore')).doc((await import('@/lib/firestore')).db, 'fee_payments', prevFeeId));
        const prevFeePaid = prevFeeDoc.exists() && prevFeeDoc.data()?.status === 'paid';

        const currFeeId = `${student.id}_${currentYear}_${currentMonth}`;
        const currFeeDoc = await (await import('@/lib/firestore')).getDoc((await import('@/lib/firestore')).doc((await import('@/lib/firestore')).db, 'fee_payments', currFeeId));
        const currFeePaid = currFeeDoc.exists() && currFeeDoc.data()?.status === 'paid';

        if (!prevFeePaid || !currFeePaid) {
          await (await import('@/lib/firestore')).updateDoc((await import('@/lib/firestore')).doc((await import('@/lib/firestore')).db, 'students', student.id), {
            compensation_classes: 0,
            compensation_month: currentMonth,
            compensation_year: currentYear,
            compensation_confirmed_by: null,
          });
          continue;
        }

        if (
          student.compensation_month === currentMonth &&
          student.compensation_year === currentYear &&
          student.compensation_confirmed_by != null
        ) continue;

        const monthStr = String(prevMonth).padStart(2, '0');
        const attendanceSnap = await (await import('@/lib/firestore')).getDocs((await import('@/lib/firestore')).query(
          (await import('@/lib/firestore')).collection((await import('@/lib/firestore')).db, 'attendance_records'),
          (await import('@/lib/firestore')).where('student_id', '==', student.id),
          (await import('@/lib/firestore')).where('date', '>=', `${prevYear}-${monthStr}-01`),
          (await import('@/lib/firestore')).where('date', '<=', `${prevYear}-${monthStr}-31`),
          (await import('@/lib/firestore')).where('status', 'in', ['present', 'double_present'])
        ));

        const classesAttended = attendanceSnap.docs.reduce((sum, d) => {
          return sum + (d.data().status === 'double_present' ? 2 : 1);
        }, 0);

        const missed = Math.max(0, 8 - classesAttended);

        await (await import('@/lib/firestore')).updateDoc((await import('@/lib/firestore')).doc((await import('@/lib/firestore')).db, 'students', student.id), {
          compensation_classes: missed,
          compensation_month: currentMonth,
          compensation_year: currentYear,
          compensation_confirmed_by: null,
        });
      }

      await unpaidClassService.detectUnpaidClasses(prevMonth, prevYear);
      await AsyncStorage.setItem(checkKey, 'done');
      cacheService.clearByPrefix('students_');
      cacheService.clearByPrefix('student_');
    } catch (err) {
      console.error('Detection failed:', err);
    }
  }

  function onRefresh() {
    setRefreshing(false);
  }

  async function toggleAttendance(studentId: string, dateStr: string, isDetail = false, doublePresent = false) {
    const records = isDetail ? detailRecords : monthRecords;
    const existing = records.find(r => r.student_id === studentId && r.date === dateStr);

    if (doublePresent) {
      if (existing && existing.status === 'double_present') {
        await attendanceService.clearAttendance(studentId, dateStr);
      } else {
        await attendanceService.markAttendance(studentId, dateStr, 'double_present');
      }
    } else {
      if (existing && existing.status === 'present') {
        await attendanceService.clearAttendance(studentId, dateStr);
      } else {
        await attendanceService.markAttendance(studentId, dateStr, 'present');
      }
    }
  }

  function getDayCount(dateStr: string): number {
    return weekRecords.filter(r => r.date === dateStr && (r.status === 'present' || r.status === 'double_present')).length;
  }

  function getStatusForStudentDate(studentId: string, dateStr: string, records?: AttendanceRecord[]): AttendanceRecord | undefined {
    return (records || weekRecords).find(r => r.student_id === studentId && r.date === dateStr);
  }

  function isClassDay(dateStr: string, classDays: string[]): boolean {
    const dayIndex = new Date(dateStr).getDay();
    const dayMap = [0, 1, 2, 3, 4, 5, 6];
    const dateDay = dayMap[dayIndex];
    const classDayIndices = classDays.map(d => {
      if (d === 'Mon') return 1;
      if (d === 'Tue') return 2;
      if (d === 'Wed') return 3;
      if (d === 'Thu') return 4;
      if (d === 'Fri') return 5;
      if (d === 'Sat') return 6;
      if (d === 'Sun') return 0;
      return -1;
    });
    return classDayIndices.includes(dateDay);
  }

  function getStudentMonthlyCount(studentId: string, excludeDate?: string, records?: AttendanceRecord[], classDays?: string[]): number {
    return (records || monthRecords).reduce((sum, r) => {
      if (r.student_id !== studentId || r.date === excludeDate) return sum;
      if (classDays && classDays.length > 0 && !isClassDay(r.date, classDays)) return sum;
      return sum + (r.status === 'double_present' ? 2 : 1);
    }, 0);
  }

  function isExtraClass(studentId: string, dateStr: string, student?: Student, records?: AttendanceRecord[]): boolean {
    if (student?.summer_class) return false;
    const regularQuota = 8;
    const unpaidClasses = student?.unpaid_classes || 0;
    const effectiveRegular = Math.max(0, regularQuota - unpaidClasses);
    const compensation = student?.compensation_classes || 0;
    const totalPossible = effectiveRegular + compensation;
    const beforeCount = getStudentMonthlyCount(studentId, dateStr, records, student?.class_days);
    return beforeCount >= totalPossible;
  }

  function isCompensationClass(studentId: string, dateStr: string, student?: Student, records?: AttendanceRecord[]): boolean {
    if (student?.summer_class) return false;
    const regularQuota = 8;
    const unpaidClasses = student?.unpaid_classes || 0;
    const effectiveRegular = Math.max(0, regularQuota - unpaidClasses);
    const compensation = student?.compensation_classes || 0;
    const beforeCount = getStudentMonthlyCount(studentId, dateStr, records, student?.class_days);
    return beforeCount >= effectiveRegular && beforeCount < effectiveRegular + compensation;
  }

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    } else {
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevWeeks = getWeeksOfMonth(prevMonth);
      setCurrentMonth(prevMonth);
      setCurrentWeekIndex(prevWeeks.length - 1);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < allWeeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    } else {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentMonth(nextMonth);
      setCurrentWeekIndex(0);
    }
  };

  const handleToday = () => {
    const now = new Date();
    const todayWeeks = getWeeksOfMonth(now);
    setCurrentMonth(now);
    setCurrentWeekIndex(getWeekIndexForDate(now, todayWeeks));
  };

  function isFutureMonth(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() > now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth());
  }

  const openDetail = (student: Student) => {
    setSelectedStudent(student);
    setDetailMonth(new Date());
  };

  const openCompensation = (student: Student) => {
    const now = new Date();
    let prevMonth = now.getMonth();
    let prevYear = now.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const monthStr = String(prevMonth).padStart(2, '0');
    const prevStart = `${prevYear}-${monthStr}-01`;
    const prevEnd = `${prevYear}-${monthStr}-31`;
    const attended = allAttendance.filter(r =>
      r.student_id === student.id &&
      r.date >= prevStart &&
      r.date <= prevEnd &&
      (r.status === 'present' || r.status === 'double_present')
    ).reduce((sum, r) => sum + (r.status === 'double_present' ? 2 : 1), 0);
    setPrevMonthAttended(attended);
    setCompOverrideStudent(student);
  };

  const closeDetail = () => {
    setSelectedStudent(null);
  };

  if (loading && students.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  const summary = selectedStudent ? summaryByStudent[selectedStudent.id] || { present: 0, extra: 0, percentage: 0, total: 8 } : { present: 0, extra: 0, percentage: 0, total: 8 };
  const detailWeeks = getWeeksOfMonth(detailMonth);
  const futureMonth = isFutureMonth(detailMonth);
  const detailMonthName = detailMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function renderTableHeader() {
    const today = formatDate(new Date());
    return (
      <View style={styles.tableHeader}>
        <View style={styles.nameHeader}>
          <Text style={styles.nameText}>Student</Text>
        </View>
        {weekDates.map((date, idx) => {
          const isOtherMonth = date.getMonth() !== currentMonth.getMonth() ||
                               date.getFullYear() !== currentMonth.getFullYear();
          const isToday = formatDate(date) === today;
          if (isOtherMonth) {
            return <View key={idx} style={[styles.dayHeader, styles.emptyMonthHeader]} />;
          }
          return (
            <View key={idx} style={[styles.dayHeader, isToday && styles.todayHeader]}>
              <Text style={[styles.dayName, isToday && styles.todayText]}>{DAY_NAMES[idx]}</Text>
              <Text style={[styles.dayNum, isToday && styles.todayText]}>{date.getDate()}</Text>
              <Text style={styles.dayCount}>{getDayCount(formatDate(date))}</Text>
            </View>
          );
        })}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryText}>Month %</Text>
        </View>
      </View>
    );
  }

  function renderStudentRows(studentList: Student[]) {
    return studentList.map((student) => {
      const studentSummary = summaryByStudent[student.id] || { present: 0, extra: 0, percentage: 0, total: 8 };
      const compClasses = student.compensation_classes || 0;
      const isCurrentMonthComp = student.compensation_month === new Date().getMonth() + 1 && student.compensation_year === new Date().getFullYear();
      const activeComp = isCurrentMonthComp ? compClasses : 0;
      const monthlyCount = getStudentMonthlyCount(student.id, undefined, monthRecords, student.class_days);
      const regularQuota = 8;
      const unpaidClasses = student.unpaid_classes || 0;
      const effectiveRegular = Math.max(0, regularQuota - unpaidClasses);
      const regularDone = monthlyCount >= effectiveRegular;
      return (
        <View key={student.id} style={styles.tableRow}>
          <TouchableOpacity style={styles.nameCell} onPress={() => openDetail(student)}>
            <Text style={styles.studentName} numberOfLines={1}>
              {displayName(student.full_name || '')}{student.summer_class ? ' ☀️' : ''}
            </Text>
            {(student.unpaid_classes || 0) > 0 && (
              <View style={styles.unpaidBadge}>
                <Text style={styles.unpaidBadgeText}>
                  -{student.unpaid_classes} cls
                </Text>
              </View>
            )}
            {!student.summer_class && (
              <TouchableOpacity
                style={[styles.compBadge, activeComp > 0 && regularDone && styles.compBadgeActive]}
                onPress={() => openCompensation(student)}>
                <Text style={[styles.compBadgeText, activeComp > 0 && regularDone && styles.compBadgeTextActive]}>
                  {activeComp > 0
                    ? (regularDone ? `comp: ${activeComp} left` : `${activeComp} comp`)
                    : 'comp'}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.instrumentText} numberOfLines={1}>
              {student.instrument}
            </Text>
            <Text style={styles.viewDetailText}>View month →</Text>
          </TouchableOpacity>

          {weekDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const record = getStatusForStudentDate(student.id, dateStr);
            const isScheduled = (student.class_days || []).includes(DAY_NAMES[idx]);
            const isFuture = date > new Date();
            const isSunday = date.getDay() === 0;
            const isOtherMonth = date.getMonth() !== currentMonth.getMonth() ||
                                 date.getFullYear() !== currentMonth.getFullYear();
            const isComp = !isOtherMonth && record?.status === 'present' && isCompensationClass(student.id, dateStr, student);
            const isExtra = !isOtherMonth && record?.status === 'present' && isExtraClass(student.id, dateStr, student);
            const isDouble = !isOtherMonth && record?.status === 'double_present';

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.statusCell,
                  isOtherMonth && styles.emptyMonthCell,
                  !isOtherMonth && isExtra && styles.extraClassCell,
                  !isOtherMonth && isComp && styles.compClassCell,
                  !isOtherMonth && isDouble && styles.doublePresentCell,
                  !isOtherMonth && record?.status === 'present' && !isExtra && !isComp && styles.presentCell,
                  !isOtherMonth && isFuture && styles.futureCell,
                  !isOtherMonth && !isSunday && !isScheduled && styles.unscheduledCell,
                  !isOtherMonth && isSunday && styles.sundayCell,
                ]}
                onPress={() => {
                  if (!isFuture && !isSunday && !isOtherMonth) {
                    toggleAttendance(student.id, dateStr);
                  }
                }}
                onContextMenu={(e) => {
                  if (Platform.OS === 'web' && !isFuture && !isSunday && !isOtherMonth) {
                    e.preventDefault();
                    toggleAttendance(student.id, dateStr, false, true);
                  }
                }}
                onLongPress={() => {
                  if (!isFuture && !isSunday && !isOtherMonth) {
                    toggleAttendance(student.id, dateStr, false, true);
                  }
                }}
                disabled={isFuture || isSunday || isOtherMonth}>
                {isSunday ? (
                  <Text style={styles.sundayText}>-</Text>
                ) : isOtherMonth ? (
                  null
                ) : isDouble ? (
                  <Text style={[styles.statusIcon, styles.doublePresentText]}>DP</Text>
                ) : record && record.status === 'present' ? (
                  <Text style={[styles.statusIcon, isExtra ? styles.extraText : isComp ? styles.compText : styles.presentText]}>
                    {isExtra ? 'E' : isComp ? 'C' : 'P'}
                  </Text>
                ) : (
                  <Text style={styles.emptyText}>+</Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={[
            styles.summaryCell,
            studentSummary.percentage >= 100 && styles.goodSummary,
            studentSummary.percentage > 0 && studentSummary.percentage < 100 && styles.warnSummary,
          ]}>
            <Text style={styles.summaryPercentage}>
              {studentSummary.percentage > 0 ? `${studentSummary.percentage}%` : '—'}
            </Text>
            <Text style={styles.summaryCount}>{studentSummary.present}/{studentSummary.total} {studentSummary.extra > 0 && `+${studentSummary.extra}`}</Text>
          </View>
        </View>
      );
    });
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => { Keyboard.dismiss(); router.back(); }}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>Tap cells to toggle status. Tap student name for monthly view.</Text>
        </View>
        <View style={styles.searchArea}>
          {searchOpen ? (
            <TextInput
              style={styles.searchInput}
              placeholder="Search student..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              onBlur={() => { if (!searchText) setSearchFocused(false); }}
              autoFocus
            />
          ) : (
            <TouchableOpacity style={styles.searchIconBtn} onPress={() => setSearchFocused(true)}>
              <Search size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevWeek}>
          <ChevronLeft size={20} color="#1e40af" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.weekLabel} onPress={handleToday}>
          <Calendar size={16} color="#1e40af" />
          <Text style={styles.weekLabelText}>{getWeekLabel(currentMonth, currentWeekIndex, allWeeks)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={handleNextWeek}>
          <ChevronRight size={20} color="#1e40af" />
        </TouchableOpacity>
      </View>

      {isDesktop ? (
        <View style={styles.twoColumnLayout}>
          <View style={styles.column}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
              <ScrollView vertical stickyHeaderIndices={[0]} style={styles.tableBodyScroll}>
                {renderTableHeader()}
                <View style={styles.table}>
                  {renderStudentRows(leftStudents)}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
          <View style={styles.columnDivider} />
          <View style={styles.column}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
              <ScrollView vertical stickyHeaderIndices={[0]} style={styles.tableBodyScroll}>
                {renderTableHeader()}
                <View style={styles.table}>
                  {renderStudentRows(rightStudents)}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
          <View>
            <View style={styles.mobileHeader} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
              {renderTableHeader()}
            </View>
            <ScrollView vertical style={{ paddingTop: headerHeight }} contentContainerStyle={{ paddingBottom: Platform.OS !== 'web' ? 160 : 0 }}>
              <View style={styles.table}>
                {renderStudentRows(filteredStudents)}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      <View style={[styles.legend, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.presentDot]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.doublePresentDot]} />
          <Text style={styles.legendText}>Double Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.extraDot]} />
          <Text style={styles.legendText}>Extra class</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.compDot]} />
          <Text style={styles.legendText}>Compensation</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Not marked</Text>
        </View>
      </View>

      {/* Student Monthly Detail Modal */}
      <Modal visible={!!selectedStudent} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={closeDetail}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{displayName(selectedStudent?.full_name || '')}</Text>
                <Text style={styles.modalSubtitle}>{selectedStudent?.instrument}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMonthNav}>
              <TouchableOpacity
                style={styles.modalNavButton}
                onPress={() => {
                  const prev = new Date(detailMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setDetailMonth(prev);
                }}>
                <ChevronLeft size={20} color="#1e40af" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalMonthLabel} onPress={() => setDetailMonth(new Date())}>
                <Calendar size={16} color="#1e40af" />
                <Text style={styles.modalMonthText}>{detailMonthName}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalNavButton}
                disabled={isFutureMonth(new Date(new Date(detailMonth).getFullYear(), new Date(detailMonth).getMonth() + 1))}
                onPress={() => {
                  const next = new Date(detailMonth);
                  next.setMonth(next.getMonth() + 1);
                  setDetailMonth(next);
                }}>
                <ChevronRight size={20} color="#1e40af" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSummary}>
              <Text style={styles.summaryPercentage}>{summary.percentage > 0 ? `${summary.percentage}%` : '—'}</Text>
              <Text style={styles.summaryCount}>{summary.present}/{summary.total} {summary.extra > 0 && `+${summary.extra}`}</Text>
            </View>

            {selectedStudent && !selectedStudent.summer_class && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => {
                    closeDetail();
                    openCompensation(selectedStudent);
                  }}>
                  <Text style={styles.modalActionText}>
                    Comp: {selectedStudent.compensation_classes || 0} classes
                  </Text>
                  <Text style={styles.modalActionSub}>Adjust →</Text>
                </TouchableOpacity>
                {(selectedStudent.unpaid_classes || 0) > 0 && (
                  <View style={styles.modalActionBtn}>
                    <Text style={styles.modalActionText}>
                      Pending: {selectedStudent.unpaid_classes} classes
                    </Text>
                    <Text style={styles.modalActionSub}>Manage in Fee Payments</Text>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              {detailWeeks.map((weekDates, weekIdx) => (
                <View key={weekIdx} style={styles.modalWeekRow}>
                  {weekDates.map((date, idx) => {
                    const dateStr = formatDate(date);
                    const record = detailRecords.find(r => r.student_id === selectedStudent?.id && r.date === dateStr);
                    const isScheduled = (selectedStudent?.class_days || []).includes(DAY_NAMES[idx]);
                    const isFuture = date > new Date();
                    const isSunday = date.getDay() === 0;
                    const isComp = record?.status === 'present' && isCompensationClass(selectedStudent!.id, dateStr, selectedStudent!, detailRecords);
                    const isExtra = record?.status === 'present' && isExtraClass(selectedStudent!.id, dateStr, selectedStudent!, detailRecords);
                    const isDouble = record?.status === 'double_present';
                    const sameMonth = date.getMonth() === detailMonth.getMonth();

                    return (
                      <View key={idx} style={styles.modalDayColumn}>
                        <Text style={[styles.modalDayName, !sameMonth && styles.fadedText]}>{DAY_NAMES[idx]}</Text>
                        <Text style={[styles.modalDayNum, !sameMonth && styles.fadedText]}>{date.getDate()}</Text>
                        <TouchableOpacity
                          style={[
                            styles.modalStatusCell,
                            !sameMonth && styles.fadedCell,
                            isExtra && styles.extraClassCell,
                            isComp && styles.compClassCell,
                            isDouble && styles.doublePresentCell,
                            record?.status === 'present' && !isExtra && !isComp && styles.presentCell,
                            (isFuture || futureMonth) && styles.futureCell,
                            !isSunday && !isScheduled && styles.unscheduledCell,
                            isSunday && styles.sundayCell,
                          ]}
                          onPress={() => {
                            if (!isFuture && !futureMonth && sameMonth && !isSunday) {
                              toggleAttendance(selectedStudent!.id, dateStr, true);
                            }
                          }}
                          onContextMenu={(e) => {
                            if (Platform.OS === 'web' && !isFuture && !futureMonth && sameMonth && !isSunday) {
                              e.preventDefault();
                              toggleAttendance(selectedStudent!.id, dateStr, true, true);
                            }
                          }}
                          onLongPress={() => {
                            if (!isFuture && !futureMonth && sameMonth && !isSunday) {
                              toggleAttendance(selectedStudent!.id, dateStr, true, true);
                            }
                          }}
                          disabled={isFuture || futureMonth || !sameMonth || isSunday}>
                          {isSunday ? (
                            <Text style={styles.sundayText}>-</Text>
                          ) : isDouble ? (
                            <Text style={[styles.statusIcon, styles.doublePresentText]}>DP</Text>
                          ) : record && record.status === 'present' ? (
                            <Text style={[styles.statusIcon, isExtra ? styles.extraText : isComp ? styles.compText : styles.presentText]}>
                              {isExtra ? 'E' : isComp ? 'C' : 'P'}
                            </Text>
                          ) : (
                            <Text style={styles.emptyText}>+</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {compOverrideStudent && (
        <CompensationOverride
          student={compOverrideStudent}
          prevMonthAttended={prevMonthAttended}
          prevMonth={(() => {
            const now = new Date();
            let m = now.getMonth();
            if (m === 0) m = 12;
            return m;
          })()}
          prevYear={(() => {
            const now = new Date();
            let m = now.getMonth();
            let y = now.getFullYear();
            if (m === 0) y -= 1;
            return y;
          })()}
          currentMonth={new Date().getMonth() + 1}
          currentYear={new Date().getFullYear()}
          visible={!!compOverrideStudent}
          onSave={() => {
            setCompOverrideStudent(null);
            cacheService.clearByPrefix('students_');
            cacheService.clearByPrefix('student_');
          }}
          onCancel={() => setCompOverrideStudent(null)}
        />
      )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
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
  searchArea: {
    marginLeft: 'auto',
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    minWidth: 180,
  },
  weekNav: {
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
  weekLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  weekLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  scrollContainer: {
    flex: 1,
  },
  tableBodyScroll: {
    flex: 1,
  },
  twoColumnLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  columnDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  verticalScroll: {
    flex: 1,
  },
  table: {
    padding: 12,
    gap: 4,
  },
  mobileHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    gap: 2,
  },
  nameHeader: {
    width: 130,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dayHeader: {
    width: 56,
    alignItems: 'center',
  },
  todayHeader: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingVertical: 4,
  },
  todayText: {
    color: '#1e40af',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  dayCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 2,
  },
  summaryHeader: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  nameCell: {
    width: 130,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  instrumentText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  viewDetailText: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '600',
  },
  unpaidBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  unpaidBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#d97706',
  },
  compBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  compBadgeActive: {
    backgroundColor: '#dbeafe',
  },
  compBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#d97706',
  },
  compBadgeTextActive: {
    color: '#1d4ed8',
  },
  statusCell: {
    width: 56,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unscheduledCell: {
    borderStyle: 'dashed',
  },
  futureCell: {
    backgroundColor: '#fafafa',
  },
  sundayCell: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  sundayText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  presentCell: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  extraClassCell: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  compClassCell: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  doublePresentCell: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: '800',
  },
  presentText: {
    color: '#16a34a',
  },
  extraText: {
    color: '#d97706',
  },
  compText: {
    color: '#2563eb',
  },
  doublePresentText: {
    color: '#6366f1',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  summaryCell: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  goodSummary: {
    backgroundColor: '#f0fdf4',
  },
  warnSummary: {
    backgroundColor: '#fffbeb',
  },
  badSummary: {
    backgroundColor: '#fef2f2',
  },
  summaryPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  summaryCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  presentDot: {
    backgroundColor: '#16a34a',
  },
  doublePresentDot: {
    backgroundColor: '#6366f1',
  },
  extraDot: {
    backgroundColor: '#f59e0b',
  },
  compDot: {
    backgroundColor: '#3b82f6',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMonthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  modalMonthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  modalSummary: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalActionBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalActionSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
  },
  modalWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalDayColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  modalDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  modalDayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalStatusCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fadedCell: {
    opacity: 0.4,
  },
  fadedText: {
    color: '#cbd5e1',
  },
  emptyMonthCell: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  emptyMonthHeader: {
    backgroundColor: 'transparent',
  },
});
