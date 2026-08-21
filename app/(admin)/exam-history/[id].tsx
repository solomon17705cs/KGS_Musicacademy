import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/lib/firestore';
import { Student, CompletedGrade } from '@/types/database';
import { ArrowLeft, Save, GripVertical, ChevronUp, ChevronDown, Trash2, Plus, Award } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

let DraggableFlatList: any = null;
let ScaleDecorator: any = null;
if (Platform.OS !== 'web') {
  const mod = require('react-native-draggable-flatlist');
  DraggableFlatList = mod.default;
  ScaleDecorator = mod.ScaleDecorator;
}

const GRADE_OPTIONS = ['Basic', 'Initial', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
const isWeb = Platform.OS === 'web';

function toDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseDDMMYYYY(s: string): Date | null {
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

function toYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface EditableGrade extends CompletedGrade {
  key: string;
}

export default function ExamHistory() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const rootNavigationState = useRootNavigationState();
  const { profile, loading: authLoading } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<EditableGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [showGradePicker, setShowGradePicker] = useState<string | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !rootNavigationState?.key) return;
    if (profile?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    loadData();
  }, [id, profile, authLoading, rootNavigationState?.key]);

  async function loadData() {
    try {
      const studentData = await studentService.getStudent(id as string);
      setStudent(studentData);
      const existing = studentData.completed_grades || [];
      const migrated: EditableGrade[] = existing.map((g, i) => ({
        ...g,
        order: g.order ?? i,
        key: `${g.grade}-${g.type}-${i}-${Date.now()}`,
      }));
      migrated.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setGrades(migrated);
    } catch (err: any) {
      if (isWeb) {
        window.alert(err.message || 'Failed to load student data');
      } else {
        Alert.alert('Error', err.message || 'Failed to load student data');
      }
    } finally {
      setLoading(false);
    }
  }

  function updateGrade(key: string, field: keyof CompletedGrade, value: string) {
    setGrades(prev => prev.map(g => g.key === key ? { ...g, [field]: value } : g));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setGrades(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setGrades(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function moveSelected(direction: 'up' | 'down') {
    if (!selectedKey) return;
    const index = grades.findIndex(g => g.key === selectedKey);
    if (index === -1) return;
    if (direction === 'up') moveUp(index);
    else moveDown(index);
  }

  function deleteGrade(key: string) {
    if (isWeb) {
      if (window.confirm('Remove this grade entry?')) {
        setGrades(prev => prev.filter(g => g.key !== key));
        if (selectedKey === key) setSelectedKey(null);
      }
      return;
    }
    Alert.alert('Delete', 'Remove this grade entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setGrades(prev => prev.filter(g => g.key !== key));
        if (selectedKey === key) setSelectedKey(null);
      }},
    ]);
  }

  function addNew() {
    const newKey = `new-${Date.now()}`;
    setGrades(prev => [...prev, {
      grade: '',
      date: toDDMMYYYY(new Date()),
      mark: '',
      type: 'practical',
      order: prev.length,
      key: newKey,
    }]);
  }

  async function handleSave() {
    if (!student) return;
    setSaving(true);
    try {
      const finalGrades: CompletedGrade[] = grades.map((g, i) => ({
        grade: g.grade,
        date: g.date,
        mark: g.mark || 'N/A',
        type: g.type,
        order: i,
      }));
      await studentService.updateStudent(id as string, { completed_grades: finalGrades });
      setStudent({ ...student, completed_grades: finalGrades });
      if (isWeb) {
        window.alert('Exam history updated.');
        router.back();
      } else {
        Alert.alert('Saved', 'Exam history updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      if (isWeb) {
        window.alert(err.message || 'Failed to save');
      } else {
        Alert.alert('Error', err.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleWebDrop(targetIndex: number) {
    if (draggedKey === null) return;
    setGrades(prev => {
      const draggedIndex = prev.findIndex(g => g.key === draggedKey);
      if (draggedIndex === -1 || draggedIndex === targetIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedKey(null);
  }

  function renderRow(item: EditableGrade, index: number, drag?: () => void) {
    const webDragProps = isWeb ? {
      draggable: true,
      onDragStart: () => setDraggedKey(item.key),
      onDragOver: (e: any) => e.preventDefault(),
      onDrop: () => handleWebDrop(index),
      onDragEnd: () => setDraggedKey(null),
    } : {};

    const selectProps = isWeb ? {
      onPress: () => setSelectedKey(item.key === selectedKey ? null : item.key),
    } : {};

    const RowWrapper = isWeb ? Pressable : View;

    return (
      <RowWrapper
        key={item.key}
        style={[styles.row, draggedKey === item.key && styles.rowActive, selectedKey === item.key && styles.rowSelected]}
        {...webDragProps}
        {...selectProps}>
        <View style={styles.rowHeader}>
          {isWeb ? (
            <View style={styles.gripBtn}>
              <GripVertical size={18} color="#94a3b8" />
            </View>
          ) : (
            <Pressable onLongPress={drag} style={styles.gripBtn}>
              <GripVertical size={18} color="#94a3b8" />
            </Pressable>
          )}
          <View style={styles.arrows}>
            <Pressable onPress={() => moveUp(index)} style={styles.arrowBtn}>
              <ChevronUp size={16} color={index === 0 ? '#cbd5e1' : '#64748b'} />
            </Pressable>
            <Pressable onPress={() => moveDown(index)} style={styles.arrowBtn}>
              <ChevronDown size={16} color={index === grades.length - 1 ? '#cbd5e1' : '#64748b'} />
            </Pressable>
          </View>
          <Text style={styles.rowNumber}>{index + 1}</Text>
          <Pressable onPress={() => deleteGrade(item.key)} style={styles.deleteBtn}>
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.fieldLabel}>Grade</Text>
              <Pressable
                style={styles.fieldInput}
                onPress={() => setShowGradePicker(item.key)}>
                <Text style={{ fontSize: 13, color: item.grade ? '#1e293b' : '#9ca3af' }}>
                  {item.grade || 'Select grade'}
                </Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.fieldLabel}>Mark</Text>
              <TextInput
                style={styles.fieldInput}
                value={item.mark}
                onChangeText={(v) => updateGrade(item.key, 'mark', v)}
                placeholder="e.g. 85%"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeBtn, item.type === 'practical' && styles.typeBtnActive]}
                  onPress={() => updateGrade(item.key, 'type', 'practical')}>
                  <Text style={[styles.typeBtnText, item.type === 'practical' && styles.typeBtnTextActive]}>Practical</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, item.type === 'theory' && styles.typeBtnActive]}
                  onPress={() => updateGrade(item.key, 'type', 'theory')}>
                  <Text style={[styles.typeBtnText, item.type === 'theory' && styles.typeBtnTextActive]}>Theory</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(index)}>
                <Text style={styles.dateBtnText}>{item.date || 'Set date'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </RowWrapper>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Exam History</Text>
          <Text style={styles.headerSub}>{student?.full_name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Save size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {isWeb && grades.length > 0 && (
        <View style={styles.toolbar}>
          <Text style={styles.toolbarLabel}>
            {selectedKey ? `Selected: ${grades.find(g => g.key === selectedKey)?.grade || 'Untitled'}` : 'Tap a row to select it'}
          </Text>
          <View style={styles.toolbarActions}>
            <Pressable
              style={[styles.toolbarBtn, !selectedKey && styles.toolbarBtnDisabled]}
              disabled={!selectedKey}
              onPress={() => moveSelected('up')}>
              <ChevronUp size={18} color={selectedKey ? '#1e40af' : '#cbd5e1'} />
            </Pressable>
            <Pressable
              style={[styles.toolbarBtn, !selectedKey && styles.toolbarBtnDisabled]}
              disabled={!selectedKey}
              onPress={() => moveSelected('down')}>
              <ChevronDown size={18} color={selectedKey ? '#1e40af' : '#cbd5e1'} />
            </Pressable>
          </View>
        </View>
      )}

      {isWeb ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {grades.length === 0 ? (
            <View style={styles.emptyBox}>
              <Award size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No exam records</Text>
              <Text style={styles.emptyText}>Tap + below to add the first grade entry</Text>
            </View>
          ) : (
            grades.map((item, index) => renderRow(item, index))
          )}
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={grades}
          keyExtractor={(item: EditableGrade) => item.key}
          onDragEnd={({ data }: { data: EditableGrade[] }) => setGrades(data)}
          renderItem={({ item, index, drag }: { item: EditableGrade; index: number; drag: () => void }) => (
            <ScaleDecorator>{renderRow(item, index, drag)}</ScaleDecorator>
          )}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Award size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No exam records</Text>
              <Text style={styles.emptyText}>Tap + below to add the first grade entry</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={addNew}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Grade</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker !== null && grades[showDatePicker] && (
        Platform.OS === 'web' ? (
          <input
            type="date"
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: 200, height: 30, zIndex: -1 }}
            value={toYYYYMMDD(parseDDMMYYYY(grades[showDatePicker].date) || new Date())}
            onChange={(e) => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) {
                updateGrade(grades[showDatePicker].key, 'date', toDDMMYYYY(d));
              }
              setShowDatePicker(null);
            }}
          />
        ) : (
          <DateTimePicker
            value={parseDDMMYYYY(grades[showDatePicker].date) || new Date()}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              if (selectedDate) {
                updateGrade(grades[showDatePicker!].key, 'date', toDDMMYYYY(selectedDate));
              }
              setShowDatePicker(null);
            }}
          />
        )
      )}

      {showGradePicker !== null && (
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setShowGradePicker(null)}>
          <View style={styles.pickerSheet}>
            {GRADE_OPTIONS.map(opt => (
              <Pressable
                key={opt}
                style={styles.pickerOption}
                onPress={() => {
                  updateGrade(showGradePicker, 'grade', opt);
                  setShowGradePicker(null);
                }}>
                <Text style={styles.pickerOptionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  saveBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  toolbarLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', flex: 1 },
  toolbarActions: { flexDirection: 'row', gap: 8 },
  toolbarBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
    ...(isWeb ? { cursor: 'pointer' as const } : {}),
  },
  toolbarBtnDisabled: { backgroundColor: '#f1f5f9' },
  listContent: { padding: 16, paddingBottom: 100 },
  row: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    ...(isWeb ? { cursor: 'default', userSelect: 'none' as const } : {}),
  },
  rowActive: { borderColor: '#1e40af', shadowOpacity: 0.12 },
  rowSelected: { borderColor: '#1e40af', borderWidth: 2 },
  rowHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 6,
  },
  gripBtn: { padding: 4, ...(isWeb ? { cursor: 'grab' as const } : {}) },
  arrows: { flexDirection: 'column', gap: 0 },
  arrowBtn: { padding: 2, ...(isWeb ? { cursor: 'pointer' as const } : {}) },
  rowNumber: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8', marginLeft: 4,
  },
  deleteBtn: { marginLeft: 'auto', padding: 4, ...(isWeb ? { cursor: 'pointer' as const } : {}) },
  rowBody: { padding: 12, paddingTop: 6 },
  fieldRow: { flexDirection: 'row', marginBottom: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  fieldInput: {
    backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1e293b',
    ...(isWeb ? { cursor: 'pointer' as const, outlineStyle: 'none' as const } : {}),
  },
  pickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingVertical: 8, maxHeight: 320,
  },
  pickerOption: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    ...(isWeb ? { cursor: 'pointer' as const } : {}),
  },
  typeBtnActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  typeBtnTextActive: { color: '#7c3aed', fontWeight: '700' },
  dateBtn: {
    backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 10, paddingVertical: 8,
    ...(isWeb ? { cursor: 'pointer' as const } : {}),
  },
  dateBtnText: { fontSize: 13, color: '#1e293b' },
  emptyBox: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: '#f8fafc',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1e40af', borderRadius: 14, paddingVertical: 14,
    ...(isWeb ? { cursor: 'pointer' as const } : {}),
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
