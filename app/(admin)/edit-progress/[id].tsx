import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, progressService, profileService } from '@/lib/firestore';
import { sendProgressNotification } from '@/lib/notifications';
import { generateProgressReport } from '@/lib/ai';
import { Student, ProgressRecord, ProgressStatus } from '@/types/database';
import { ArrowLeft, Save, Trash2, Target, CheckCircle2, Clock, Award, Trophy, Sparkles, ChevronDown, FileText, Edit2 } from 'lucide-react-native';

const GRADE_OPTIONS = ['Basic', 'Initial', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
const THEORY_OPTIONS = ['Basic', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

export default function EditProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const [student, setStudent] = useState<Student | null>(null);
  const [theoryGrade, setTheoryGrade] = useState('');
  const [practicalGrade, setPracticalGrade] = useState('');
  const [theoryStatus, setTheoryStatus] = useState<ProgressStatus>('good');
  const [practicalStatus, setPracticalStatus] = useState<ProgressStatus>('good');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState('2/2');
  const [homeworkCompletion, setHomeworkCompletion] = useState('100');
  const [practiceScore, setPracticeScore] = useState('0');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [goalStatus, setGoalStatus] = useState<'achieved' | 'in_progress'>('in_progress');
  const [masteryLevel, setMasteryLevel] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeMark, setNewGradeMark] = useState('');
  const [selectedGradeType, setSelectedGradeType] = useState<'theory' | 'practical'>('practical');
  const [recordingGrade, setRecordingGrade] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'theory' | 'practical' | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ x: number; y: number; width: number } | null>(null);
  const theoryContainerRef = useRef<View>(null);
  const practicalContainerRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const statusOptions: ProgressStatus[] = [
    'excellent',
    'good',
    'needs_improvement',
    'struggling',
  ];

  useEffect(() => {
    if (authLoading || !rootNavigationState?.key) return;

    if (profile?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    loadStudentData();
  }, [id, profile, authLoading, rootNavigationState?.key]);

  async function loadStudentData() {
    try {
      const studentData = await studentService.getStudent(id as string);
      setStudent(studentData);

      const progressData = await progressService.getLatestProgress(id as string);

      if (progressData) {
        setTheoryGrade(progressData.theory_grade);
        setPracticalGrade(progressData.practical_grade);
        setTheoryStatus(progressData.theory_status);
        setPracticalStatus(progressData.practical_status);
        setAttendance(progressData.attendance || '2/2');
        setHomeworkCompletion(String(progressData.homework_completion ?? 100));
        setPracticeScore(String(progressData.practice_score ?? 0));
        setWeeklyGoal(progressData.weekly_goal || '');
        setGoalStatus(progressData.goal_status || 'in_progress');
        setMasteryLevel(String(progressData.mastery_level ?? 0));
        setNotes(progressData.notes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile || !student) return;

    setSaving(true);
    setError('');

    try {
      await progressService.createProgressRecord({
        student_id: id as string,
        theory_grade: theoryGrade,
        practical_grade: practicalGrade,
        theory_status: theoryStatus,
        practical_status: practicalStatus,
        attendance: attendance,
        homework_completion: parseInt(homeworkCompletion) || 0,
        practice_score: parseInt(practiceScore) || 0,
        weekly_goal: weeklyGoal,
        goal_status: goalStatus,
        mastery_level: parseInt(masteryLevel) || 0,
        notes: notes,
        updated_by: profile.id,
      });

      let newStreak = student.streak || 0;
      let pointsToAdd = 10;

      if (attendance === '2/2') pointsToAdd += 20;
      else if (attendance === '1/2') pointsToAdd += 10;

      const hwPerc = parseInt(homeworkCompletion) || 0;
      pointsToAdd += Math.floor(hwPerc / 2);

      const pracScore = parseInt(practiceScore) || 0;
      pointsToAdd += Math.floor(pracScore / 2);

      if (goalStatus === 'achieved') pointsToAdd += 50;

      const now = new Date();
      const lastUpdate = new Date(student.updated_at || 0);
      const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 8) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      await studentService.updateStudent(id as string, {
        streak: newStreak,
        points: (student.points || 0) + pointsToAdd,
      });

      await sendProgressNotification(
        student,
        profile.full_name,
        student.instrument
      );

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save progress');
    } finally {
      setSaving(false);
    }
  }

  async function handleAIPolish() {
    if (!notes.trim() || polishing) return;

    setPolishing(true);
    setError('');

    try {
      const statusToRating: Record<ProgressStatus, number> = {
        excellent: 5,
        good: 4,
        needs_improvement: 3,
        struggling: 2,
      };

      const theoryRating = statusToRating[theoryStatus] || 3;
      const practicalRating = statusToRating[practicalStatus] || 3;
      const overallRating = Math.round((theoryRating + practicalRating) / 2);

      const topicsCovered = `Theory: ${theoryGrade || 'not specified'}, Practical: ${practicalGrade || 'not specified'}`;

      const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const report = await generateProgressReport({
        studentName: student?.full_name || 'Your child',
        gender: student?.gender || null,
        date: today,
        topicsCovered,
        rating: overallRating,
        teacherNotes: notes.trim(),
      });

      setNotes(report);
      Alert.alert('AI Report Ready', 'Your progress report has been generated and is ready to review.');
    } catch (err: any) {
      Alert.alert('AI Error', err.message || 'Failed to generate report. Please try again.');
    } finally {
      setPolishing(false);
    }
  }

  function insertTemplate() {
    const template = `Strengths: What went well today (e.g., good rhythm, improved posture)
Areas to focus: What needs improvement (e.g., struggles with tempo, needs more practice)
Topics covered: What we learned (e.g., C major scale, sight reading)
Home practice: What to practice this week (e.g., scales 10 min daily)`;
    setNotes(template);
  }

  async function performDelete() {
    try {
      setSaving(true);

      const progressRecords = await progressService.getProgressRecords(id as string);
      for (const record of progressRecords) {
        await progressService.deleteProgressRecord(record.id);
      }

      await studentService.deleteStudent(id as string);

      router.replace('/(admin)/dashboard');
    } catch (err: any) {
      console.error('Delete failed:', err);
      setSaving(false);
      Alert.alert('Error', 'Failed to delete student');
    }
  }

  const handleDelete = () => {
    const message = `Delete ${student?.full_name}? This cannot be undone.`;

    if (Platform.OS === 'web') {
      if (confirm(message)) {
        performDelete();
      }
    } else {
      Alert.alert('Confirm Delete', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  function getStatusLabel(status: ProgressStatus) {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getStatusColor(status: ProgressStatus) {
    switch (status) {
      case 'excellent':
        return '#22c55e';
      case 'good':
        return '#3b82f6';
      case 'needs_improvement':
        return '#f59e0b';
      case 'struggling':
        return '#ef4444';
    }
  }

  function measureAndShow(type: 'theory' | 'practical') {
    const ref = type === 'theory' ? theoryContainerRef : practicalContainerRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      setDropdownRect({ x, y: y + height + 4, width });
      setActiveDropdown(type);
    });
  }

  const currentDropdownValue = activeDropdown === 'theory' ? theoryGrade : practicalGrade;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading student progress...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Student not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container(isMobile)}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{student.full_name}</Text>
          <Text style={styles.headerSubtitle}>{student.instrument}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(admin)/edit-student/${student?.id}`)}
          disabled={saving}>
          <Edit2 size={24} color="#1e40af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={saving}>
          <Trash2 size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={() => setActiveDropdown(null)}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.subSectionTitle}>Theory</Text>

                <View style={styles.inputGroup} ref={theoryContainerRef}>
                  <Text style={styles.label}>Grade Level</Text>
                  <View style={styles.gradeSelectorContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Grade 3"
                      value={theoryGrade}
                      onChangeText={(text) => {
                        setTheoryGrade(text);
                        if (activeDropdown) setActiveDropdown(null);
                      }}
                      editable={!saving}
                    />
                    <TouchableOpacity
                      style={styles.dropdownToggle}
                      onPress={() => {
                        if (activeDropdown === 'theory') {
                          setActiveDropdown(null);
                        } else {
                          measureAndShow('theory');
                        }
                      }}
                      disabled={saving}>
                      <ChevronDown size={18} color={activeDropdown === 'theory' ? '#1e40af' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusOptions}>
                    {statusOptions.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          theoryStatus === status && {
                            backgroundColor: getStatusColor(status) + '20',
                            borderColor: getStatusColor(status),
                          },
                        ]}
                        onPress={() => setTheoryStatus(status)}
                        disabled={saving}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: getStatusColor(status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusButtonText,
                            theoryStatus === status && {
                              color: getStatusColor(status),
                              fontWeight: '700',
                            },
                          ]}>
                          {getStatusLabel(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.subSectionTitle}>Practical</Text>

                <View style={styles.inputGroup} ref={practicalContainerRef}>
                  <Text style={styles.label}>Grade Level</Text>
                  <View style={styles.gradeSelectorContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Grade 3"
                      value={practicalGrade}
                      onChangeText={(text) => {
                        setPracticalGrade(text);
                        if (activeDropdown) setActiveDropdown(null);
                      }}
                      editable={!saving}
                    />
                    <TouchableOpacity
                      style={styles.dropdownToggle}
                      onPress={() => {
                        if (activeDropdown === 'practical') {
                          setActiveDropdown(null);
                        } else {
                          measureAndShow('practical');
                        }
                      }}
                      disabled={saving}>
                      <ChevronDown size={18} color={activeDropdown === 'practical' ? '#1e40af' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusOptions}>
                    {statusOptions.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          practicalStatus === status && {
                            backgroundColor: getStatusColor(status) + '20',
                            borderColor: getStatusColor(status),
                          },
                        ]}
                        onPress={() => setPracticalStatus(status)}
                        disabled={saving}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: getStatusColor(status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusButtonText,
                            practicalStatus === status && {
                              color: getStatusColor(status),
                              fontWeight: '700',
                            },
                          ]}>
                          {getStatusLabel(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.combinedSection, isMobile && styles.combinedSectionMobile]}>
            <View style={[styles.combinedColumn, isMobile && styles.combinedColumnMobile]}>
              <Text style={styles.combinedTitle}>Weekly Sessions</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Attendance</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2/2"
                    value={attendance}
                    onChangeText={setAttendance}
                    editable={!saving}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Homework %</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-100"
                    value={homeworkCompletion}
                    onChangeText={setHomeworkCompletion}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Practice Score</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-100"
                    value={practiceScore}
                    onChangeText={setPracticeScore}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Mastery %</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-100"
                    value={masteryLevel}
                    onChangeText={setMasteryLevel}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>
              </View>
            </View>

            {!isMobile && <View style={styles.combinedDivider} />}

            <View style={[styles.combinedColumn, isMobile && styles.combinedColumnMobile]}>
              <View style={styles.sectionHeaderRow}>
                <Target size={18} color="#1e40af" />
                <Text style={[styles.combinedTitle, { marginLeft: 6 }]}>Weekly Goal</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Goal Task</Text>
                <TextInput
                  style={styles.input}
                  placeholder="type homework"
                  value={weeklyGoal}
                  onChangeText={setWeeklyGoal}
                  editable={!saving}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      goalStatus === 'in_progress' && styles.choiceButtonActive,
                    ]}
                    onPress={() => setGoalStatus('in_progress')}
                    disabled={saving}>
                    <Clock size={16} color={goalStatus === 'in_progress' ? '#f97316' : '#64748b'} />
                    <Text style={[styles.choiceButtonText, goalStatus === 'in_progress' && styles.choiceButtonTextActive]}>In Progress</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      { marginLeft: 8 },
                      goalStatus === 'achieved' && styles.choiceButtonActiveAchieved,
                    ]}
                    onPress={() => setGoalStatus('achieved')}
                    disabled={saving}>
                    <CheckCircle2 size={16} color={goalStatus === 'achieved' ? '#16a34a' : '#64748b'} />
                    <Text style={[styles.choiceButtonText, goalStatus === 'achieved' && styles.choiceButtonTextActiveAchieved]}>Achieved</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {!isMobile && <View style={styles.combinedDivider} />}

            <View style={[styles.combinedColumn, isMobile && styles.combinedColumnMobile]}>
              <View style={styles.sectionHeaderRow}>
                <Award size={18} color="#1e40af" />
                <Text style={[styles.combinedTitle, { marginLeft: 6 }]}>Grade Achievement</Text>
              </View>

              <View style={styles.gradeEntryRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Grade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Grade 2"
                    value={newGradeName}
                    onChangeText={setNewGradeName}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Mark</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 85%"
                    value={newGradeMark}
                    onChangeText={setNewGradeMark}
                  />
                </View>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, selectedGradeType === 'theory' && styles.activeTab]}
                  onPress={() => setSelectedGradeType('theory')}>
                  <Text style={[styles.tabText, selectedGradeType === 'theory' && styles.activeTabText]}>Theory</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, selectedGradeType === 'practical' && styles.activeTab]}
                  onPress={() => setSelectedGradeType('practical')}>
                  <Text style={[styles.tabText, selectedGradeType === 'practical' && styles.activeTabText]}>Practical</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.recordGradeButton,
                  (!newGradeName || recordingGrade) && { opacity: 0.6 }
                ]}
                onPress={async () => {
                  if (!newGradeName || !student) return;
                  setRecordingGrade(true);
                  try {
                    const newAchievement = {
                      grade: newGradeName,
                      date: new Date().toISOString().split('T')[0],
                      mark: newGradeMark || 'N/A',
                      type: selectedGradeType
                    };

                    const currentGrades = student.completed_grades || [];
                    const updatedGrades = [...currentGrades, newAchievement];

                    await studentService.updateStudent(id as string, {
                      completed_grades: updatedGrades,
                      points: (student.points || 0) + 500
                    });

                    setStudent({ ...student, completed_grades: updatedGrades, points: (student.points || 0) + 500 });
                    setNewGradeName('');
                    setNewGradeMark('');
                    Alert.alert('Congratulations!', `${student.full_name} has successfully completed ${newGradeName}. 500 points added.`);
                  } catch (err: any) {
                    Alert.alert('Error', 'Failed to record grade achievement');
                  } finally {
                    setRecordingGrade(false);
                  }
                }}
                disabled={!newGradeName || recordingGrade}>
                {recordingGrade ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trophy size={16} color="#fff" />
                    <Text style={styles.recordGradeText}>Record Grade</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Instructor Notes</Text>
            <View style={styles.noteActions}>
              <TouchableOpacity
                style={[styles.noteBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={insertTemplate}>
                <FileText size={14} color="#64748b" />
                <Text style={styles.noteBtnText}>Template</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteBtn, !notes.trim() && { opacity: 0.5 }]}
                onPress={handleAIPolish}
                disabled={polishing || !notes.trim()}>
                {polishing ? (
                  <ActivityIndicator size="small" color="#1e40af" />
                ) : (
                  <>
                    <Sparkles size={14} color="#1e40af" />
                    <Text style={styles.noteBtnText}>AI Polish</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Enter brief notes or tap 'Template' for a guide, then tap 'AI Polish'..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!saving && !polishing}
          />
        </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Progress</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </TouchableWithoutFeedback>

      {activeDropdown && dropdownRect && (
        <View style={[
          styles.floatingDropdown,
          { top: dropdownRect.y, left: dropdownRect.x, width: dropdownRect.width },
        ]}>
          <ScrollView style={styles.floatingDropdownScroll} showsVerticalScrollIndicator={false}>
            {(activeDropdown === 'theory' ? THEORY_OPTIONS : GRADE_OPTIONS).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.floatingDropdownOption,
                  currentDropdownValue === option && styles.floatingDropdownOptionSelected,
                ]}
                onPress={() => {
                  if (activeDropdown === 'theory') {
                    setTheoryGrade(option);
                  } else {
                    setPracticalGrade(option);
                  }
                  setActiveDropdown(null);
                }}>
                <Text style={[
                  styles.floatingDropdownOptionText,
                  currentDropdownValue === option && styles.floatingDropdownOptionTextSelected,
                ]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: (isMobile: boolean) => ({
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: isMobile ? 34 : 0,
  }),
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 10,
    textAlign: 'center',
  },
  combinedSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  combinedSectionMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  combinedColumn: {
    flex: 1,
  },
  combinedColumnMobile: {
    flex: undefined,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  combinedDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    alignSelf: 'stretch',
  },
  combinedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  noteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    backgroundColor: '#dbeafe',
  },
  noteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  choiceButtonActive: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  choiceButtonActiveAchieved: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  choiceButtonTextActive: {
    color: '#f97316',
  },
  choiceButtonTextActiveAchieved: {
    color: '#16a34a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  gradeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingRight: 4,
  },
  dropdownToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  floatingDropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingDropdownScroll: {
    maxHeight: 220,
  },
  floatingDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  floatingDropdownOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  floatingDropdownOptionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  floatingDropdownOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1e40af',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 140,
  },
  statusOptions: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusButtonText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 24,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeEntryRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  recordGradeButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  recordGradeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
