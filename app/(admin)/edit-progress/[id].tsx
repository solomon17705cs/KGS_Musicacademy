import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Student, ProgressRecord, ProgressStatus } from '@/types/database';
import { ArrowLeft, Save, Trash2, Target, CheckCircle2, Clock } from 'lucide-react-native';
import { notifyUser } from '@/lib/notifications';

export default function EditProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const [student, setStudent] = useState<Student | null>(null);
  const [theoryGrade, setTheoryGrade] = useState('');
  const [practicalGrade, setPracticalGrade] = useState('');
  const [theoryStatus, setTheoryStatus] = useState<ProgressStatus>('good');
  const [practicalStatus, setPracticalStatus] =
    useState<ProgressStatus>('good');
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

  const statusOptions: ProgressStatus[] = [
    'excellent',
    'good',
    'needs_improvement',
    'struggling',
  ];

  useEffect(() => {
    // Wait until auth state is resolved and navigation is ready before checking role
    if (authLoading || !rootNavigationState?.key) return;

    if (profile?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    loadStudentData();
  }, [id, profile, authLoading, rootNavigationState?.key]);

  async function loadStudentData() {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: progressData, error: progressError } = await supabase
        .from('progress_records')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

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
    if (!profile) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase.from('progress_records').insert({
        student_id: id,
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

      if (error) throw error;

      // Trigger notifications for student and parent
      if (student) {
        const title = 'New Progress Update 🎵';
        const body = `Your instructor ${profile.full_name} has updated progress for ${student.instrument}. Check it out!`;

        // Notify Student if they have a user account
        if (student.user_id) {
          await notifyUser(student.user_id, title, body);
        }

        // Notify Parent if linked
        if (student.parent_id) {
          await notifyUser(
            student.parent_id,
            'Student Progress Update',
            `Update for ${student.full_name}: ${body}`
          );
        }
      }

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save progress');
      setSaving(false);
    }
  }

  async function performDelete() {
    console.log('[DEBUG] performDelete executing for:', id);
    try {
      setSaving(true);
      // Delete progress records first
      console.log('[DEBUG] Deleting progress records for student:', id);
      await supabase
        .from('progress_records')
        .delete()
        .eq('student_id', id);

      // Delete student
      console.log('[DEBUG] Deleting student record:', id);
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[DEBUG] Deletion error:', error);
        throw error;
      }

      console.log('[DEBUG] Deletion successful, navigating back');
      router.replace('/(admin)/dashboard');
    } catch (err: any) {
      console.error('[DEBUG] Deletion catch block:', err);
      setSaving(false);
      Alert.alert('Error', err.message || 'Failed to delete student');
    }
  }

  async function handleDelete() {
    console.log('[DEBUG] handleDelete button pressed', { id, studentName: student?.full_name });
    if (!student) return;

    const message = `Are you sure you want to delete ${student.full_name}? This will also remove all their progress records.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        await performDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Student',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  }

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
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
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={saving}>
          <Trash2 size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theory Progress</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grade Level</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grade 3, Beginner, Advanced"
              value={theoryGrade}
              onChangeText={setTheoryGrade}
              editable={!saving}
            />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practical Progress</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grade Level</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grade 3, Beginner, Advanced"
              value={practicalGrade}
              onChangeText={setPracticalGrade}
              editable={!saving}
            />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Session Summary</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Attendance</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2/2"
                value={attendance}
                onChangeText={setAttendance}
                editable={!saving}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
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
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Practice Score (0-100)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 85"
                value={practiceScore}
                onChangeText={setPracticeScore}
                keyboardType="numeric"
                editable={!saving}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Skill Mastery %</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Target size={20} color="#1e40af" />
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Weekly Goal</Text>
          </View>

          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <Text style={styles.label}>Goal Task</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Master the C Major Scale"
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
                <Clock size={18} color={goalStatus === 'in_progress' ? '#f97316' : '#64748b'} />
                <Text style={[styles.choiceButtonText, goalStatus === 'in_progress' && styles.choiceButtonTextActive]}>In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  { marginLeft: 12 },
                  goalStatus === 'achieved' && styles.choiceButtonActiveAchieved,
                ]}
                onPress={() => setGoalStatus('achieved')}
                disabled={saving}>
                <CheckCircle2 size={18} color={goalStatus === 'achieved' ? '#16a34a' : '#64748b'} />
                <Text style={[styles.choiceButtonText, goalStatus === 'achieved' && styles.choiceButtonTextActiveAchieved]}>Achieved</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructor Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add notes about the student's progress, strengths, areas for improvement..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!saving}
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
    </KeyboardAvoidingView>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
  },
  statusOptions: {
    gap: 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
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
});
