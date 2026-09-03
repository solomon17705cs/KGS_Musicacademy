import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { compensationService } from '@/lib/firestore';
import { Student } from '@/types/database';
import { X, Minus, Plus, Check, AlertTriangle } from 'lucide-react-native';

interface Props {
  student: Student;
  prevMonthAttended: number;
  prevMonth: number;
  prevYear: number;
  currentMonth: number;
  currentYear: number;
  visible: boolean;
  onSave: (value: number) => void;
  onCancel: () => void;
}

function getMonthName(month: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month - 1] || '';
}

export default function CompensationOverride({
  student,
  prevMonthAttended,
  prevMonth,
  prevYear,
  currentMonth,
  currentYear,
  visible,
  onSave,
  onCancel,
}: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const autoCalculated = Math.max(0, 8 - prevMonthAttended);
  const [value, setValue] = useState(student.compensation_classes ?? autoCalculated);
  const [saving, setSaving] = useState(false);

  const isStale = student.compensation_month !== currentMonth || student.compensation_year !== currentYear;
  const displayValue = isStale ? autoCalculated : value;

  async function handleConfirm() {
    if (!profile) return;
    setSaving(true);
    try {
      await compensationService.updateCompensation(
        student.id,
        student.full_name,
        displayValue,
        autoCalculated,
        currentMonth,
        currentYear,
        profile.id,
        profile.full_name
      );
      onSave(displayValue);
    } catch (err) {
      console.error('Failed to update compensation:', err);
    } finally {
      setSaving(false);
    }
  }

  function increment() {
    setValue(v => Math.min(8, v + 1));
  }

  function decrement() {
    setValue(v => Math.max(0, v - 1));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Compensation Classes</Text>
              <Text style={styles.studentName}>{student.full_name}</Text>
              <Text style={styles.subtitle}>{getMonthName(currentMonth)} {currentYear}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>
              Auto-calculated from {getMonthName(prevMonth)}:
            </Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Attended:</Text>
              <Text style={styles.breakdownValue}>{prevMonthAttended} of 8 classes</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Missed:</Text>
              <Text style={[styles.breakdownValue, styles.missedText]}>{autoCalculated} classes</Text>
            </View>
          </View>

          <View style={styles.adjustSection}>
            <Text style={styles.adjustLabel}>Compensation classes:</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepperBtn, displayValue <= 0 && styles.stepperBtnDisabled]}
                onPress={decrement}
                disabled={saving || displayValue <= 0}>
                <Minus size={18} color={displayValue <= 0 ? colors.textMuted : colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{displayValue}</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, displayValue >= 8 && styles.stepperBtnDisabled]}
                onPress={increment}
                disabled={saving || displayValue >= 8}>
                <Plus size={18} color={displayValue >= 8 ? colors.textMuted : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.warningBox}>
            <AlertTriangle size={14} color="#d97706" />
            <Text style={styles.warningText}>
              Valid {getMonthName(currentMonth)} only · not carried forward
            </Text>
          </View>

          {isStale && (
            <View style={styles.staleInfo}>
              <Text style={styles.staleText}>
                Previous value was for {getMonthName(student.compensation_month || 0)} {student.compensation_year || 0}. Updating for current month.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirm & Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function createStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    studentName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginTop: 2,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.statBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breakdownSection: {
      backgroundColor: colors.statBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    breakdownTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    breakdownLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    breakdownValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    missedText: {
      color: '#d97706',
    },
    adjustSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.statBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    adjustLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtnDisabled: {
      opacity: 0.4,
    },
    stepperValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      minWidth: 30,
      textAlign: 'center',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#fef3c7',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    warningText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#92400e',
    },
    staleInfo: {
      backgroundColor: '#eff6ff',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    staleText: {
      fontSize: 12,
      color: '#1e40af',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.statBg,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#1e40af',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    confirmBtnDisabled: {
      opacity: 0.6,
    },
    confirmBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
  });
}
