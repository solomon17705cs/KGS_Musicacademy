import React, { useState, useEffect, useRef } from 'react';
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
    Modal,
    useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/lib/firestore';
import { Student } from '@/types/database';
import { ArrowLeft, UserPlus, Calendar, Music, Phone, MapPin, ChevronDown } from 'lucide-react-native';

const INITIAL_GRADE_OPTIONS = ['Not completed', 'Initial Grade', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BATCH_OPTIONS = ['Batch 1', 'Batch 2', 'Batch 3'];

function formatDDMMYYYY(text: string): string {
    const cleaned = text.replace(/[^0-9]/g, '');
    const maxLen = 8;
    const trimmed = cleaned.slice(0, maxLen);

    let result = '';
    for (let i = 0; i < trimmed.length; i++) {
        if (i === 2 || i === 4) result += '-';
        result += trimmed[i];
    }
    return result;
}

function parseDDMMYYYY(text: string): Date | null {
    const parts = text.split('-');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
}

function toDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

export default function EditStudentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [showEnrollmentPicker, setShowEnrollmentPicker] = useState(false);
    const [showDobPicker, setShowDobPicker] = useState(false);

    const webEnrollmentRef = useRef<HTMLInputElement>(null);
    const webDobRef = useRef<HTMLInputElement>(null);

    const openWebPicker = (type: 'enrollment' | 'dob') => {
        if (Platform.OS === 'web') {
            const ref = type === 'enrollment' ? webEnrollmentRef : webDobRef;
            ref.current?.showPicker();
        } else {
            if (type === 'enrollment') setShowEnrollmentPicker(true);
            else setShowDobPicker(true);
        }
    };

    const handleWebDateChange = (type: 'enrollment' | 'dob', value: string) => {
        if (!value) return;
        const parts = value.split('-');
        if (parts.length === 3) {
            const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
            if (type === 'enrollment') {
                setEnrollmentDate(formatted);
            } else {
                setDob(formatted);
            }
        }
    };

    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | null>(null);
    const [instrument, setInstrument] = useState('');
    const [enrollmentDate, setEnrollmentDate] = useState('');
    const [dob, setDob] = useState('');
    const [initialGrade, setInitialGrade] = useState('');
    const [classType, setClassType] = useState<'regular' | 'summer'>('regular');
    const [classSlots, setClassSlots] = useState<Array<{ day: string | null; batch: string | null }>>([
        { day: null, batch: null },
        { day: null, batch: null },
        { day: null, batch: null },
    ]);

    const [fatherName, setFatherName] = useState('');
    const [fatherPhone, setFatherPhone] = useState('');
    const [fatherEmail, setFatherEmail] = useState('');
    const [motherName, setMotherName] = useState('');
    const [motherPhone, setMotherPhone] = useState('');
    const [motherEmail, setMotherEmail] = useState('');
    const [parentAddress, setParentAddress] = useState('');

    const [showGradeOptions, setShowGradeOptions] = useState(false);

    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const handleSlotDaySelect = (slotIndex: number, day: string) => {
        const takenDays = classSlots.map((slot, i) => i !== slotIndex ? slot.day : null).filter(Boolean);
        if (takenDays.includes(day)) return;
        const newSlots = [...classSlots];
        newSlots[slotIndex] = { ...newSlots[slotIndex], day, batch: null };
        setClassSlots(newSlots);
    };

    const handleSlotBatchSelect = (slotIndex: number, batch: string) => {
        const newSlots = [...classSlots];
        newSlots[slotIndex] = { ...newSlots[slotIndex], batch };
        setClassSlots(newSlots);
    };

    const formatDateForDB = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        if (parts[0].length === 4) return dateStr;
        const [d, m, y] = parts;
        return `${y}-${m}-${d}`;
    };

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
            if (!studentData) {
                setError('Student not found');
                return;
            }
            setStudent(studentData);

            setFullName(studentData.full_name || '');
            setGender(studentData.gender);
            setInstrument(studentData.instrument || '');
            setEnrollmentDate(studentData.enrollment_date ? toDDMMYYYY(new Date(studentData.enrollment_date)) : '');
            setDob(studentData.date_of_birth ? toDDMMYYYY(new Date(studentData.date_of_birth)) : '');
            setInitialGrade(studentData.initial_grade || '');
            setClassType(studentData.class_type || (studentData.summer_class ? 'summer' : 'regular'));
            setClassSlots([
                { day: studentData.class_days?.[0] || null, batch: studentData.class_day_batches?.day1_batch || null },
                { day: studentData.class_days?.[1] || null, batch: studentData.class_day_batches?.day2_batch || null },
                { day: studentData.class_days?.[2] || null, batch: studentData.class_day_batches?.compensation_batch || null },
            ]);
            setFatherName(studentData.father_name || '');
            setFatherPhone(studentData.father_phone || '');
            setFatherEmail(studentData.father_email || '');
            setMotherName(studentData.mother_name || '');
            setMotherPhone(studentData.mother_phone || '');
            setMotherEmail(studentData.mother_email || '');
            setParentAddress(studentData.parent_address || '');
        } catch (err: any) {
            setError(err.message || 'Failed to load student data');
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStudent() {
        if (!fullName || !instrument || !enrollmentDate) {
            setError('Please fill in required fields (Name, Instrument, Date)');
            return;
        }

        const hasFatherInfo = fatherName.trim() || fatherPhone.trim() || fatherEmail.trim();
        const hasMotherInfo = motherName.trim() || motherPhone.trim() || motherEmail.trim();
        if (!hasFatherInfo && !hasMotherInfo) {
            setError('Please provide at least one parent\'s information');
            return;
        }

        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(enrollmentDate)) {
            setError('Please use DD-MM-YYYY format for Joining Date');
            return;
        }

        if (dob && !dateRegex.test(dob)) {
            setError('Please use DD-MM-YYYY format for Date of Birth');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await studentService.updateStudent(id as string, {
                full_name: fullName,
                gender: gender || null,
                instrument,
                enrollment_date: formatDateForDB(enrollmentDate) || '',
                date_of_birth: dob ? formatDateForDB(dob) : null,
                initial_grade: initialGrade || null,
                class_type: classType,
                class_days: classType === 'regular' ? classSlots.map(s => s.day).filter((d): d is string => d !== null) : [],
                class_timing: null,
                summer_class: classType === 'summer',
                class_day_batches: classType === 'regular' ? {
                    day1_batch: classSlots[0].batch || null,
                    day2_batch: classSlots[1].batch || null,
                    compensation_batch: classSlots[2].batch || null,
                } : null,
                father_name: fatherName.trim() || null,
                father_phone: fatherPhone.trim() || null,
                father_email: fatherEmail.toLowerCase().trim() || null,
                mother_name: motherName.trim() || null,
                mother_phone: motherPhone.trim() || null,
                mother_email: motherEmail.toLowerCase().trim() || null,
                parent_address: parentAddress.trim() || null,
            });

            Alert.alert('Success', 'Student details updated successfully');
            router.back();
        } catch (err: any) {
            setError(err.message || 'Failed to update student');
            setSaving(false);
        }
    }

    if (authLoading || loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={styles.loadingText}>Loading student data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Student</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {isMobile ? (

                        <>
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <UserPlus size={20} color="#1e40af" />
                                    <Text style={styles.cardTitle}>Student Details</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Full Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Student Name"
                                        placeholderTextColor="#94a3b8"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        editable={!saving}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Gender</Text>
                                    <View style={styles.genderRow}>
                                        {(['male', 'female'] as const).map(g => (
                                            <TouchableOpacity
                                                key={g}
                                                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                                onPress={() => setGender(g)}
                                                disabled={saving}>
                                                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                                                    {g.charAt(0).toUpperCase() + g.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Instrument *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Piano, Violin"
                                        placeholderTextColor="#94a3b8"
                                        value={instrument}
                                        onChangeText={setInstrument}
                                        editable={!saving}
                                    />
                                </View>

                                <View style={[styles.row, isMobile && styles.rowMobile]}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Joining Date *</Text>
                                        <View style={styles.dateInputRow}>
                                            <TextInput
                                                style={[styles.input, styles.dateInput]}
                                                placeholder="DD-MM-YYYY"
                                                placeholderTextColor="#94a3b8"
                                                value={enrollmentDate}
                                                onChangeText={(text) => setEnrollmentDate(formatDDMMYYYY(text))}
                                                keyboardType="numeric"
                                                maxLength={10}
                                                editable={!saving}
                                            />
                                            <TouchableOpacity
                                                style={styles.calendarButton}
                                                onPress={() => openWebPicker('enrollment')}
                                                disabled={saving}>
                                                <Calendar size={18} color="#1e40af" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1, marginLeft: isMobile ? 0 : 8 }]}>
                                        <Text style={styles.label}>Date of Birth</Text>
                                        <View style={styles.dateInputRow}>
                                            <TextInput
                                                style={[styles.input, styles.dateInput]}
                                                placeholder="DD-MM-YYYY"
                                                placeholderTextColor="#94a3b8"
                                                value={dob}
                                                onChangeText={(text) => setDob(formatDDMMYYYY(text))}
                                                keyboardType="numeric"
                                                maxLength={10}
                                                editable={!saving}
                                            />
                                            <TouchableOpacity
                                                style={styles.calendarButton}
                                                onPress={() => openWebPicker('dob')}
                                                disabled={saving}>
                                                <Calendar size={18} color="#1e40af" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {Platform.OS === 'web' && (
                                    <input
                                        ref={webEnrollmentRef as any}
                                        type="date"
                                        style={{ position: 'absolute', top: '20px', left: '30%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
                                        onChange={(e) => handleWebDateChange('enrollment', e.target.value)}
                                    />
                                )}

                                {Platform.OS === 'web' && (
                                    <input
                                        ref={webDobRef as any}
                                        type="date"
                                        style={{ position: 'absolute', top: '20px', left: '70%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
                                        onChange={(e) => handleWebDateChange('dob', e.target.value)}
                                    />
                                )}

                                {Platform.OS !== 'web' && showEnrollmentPicker && (
                                    Platform.OS === 'ios' ? (
                                        <Modal visible={showEnrollmentPicker} transparent animationType="fade">
                                            <View style={styles.modalOverlay}>
                                                <View style={styles.modalContent}>
                                                    <DateTimePicker
                                                        value={parseDDMMYYYY(enrollmentDate) || new Date()}
                                                        mode="date"
                                                        display="spinner"
                                                        onChange={(_, selectedDate) => {
                                                            if (selectedDate) setEnrollmentDate(toDDMMYYYY(selectedDate));
                                                            setShowEnrollmentPicker(false);
                                                        }}
                                                    />
                                                    <TouchableOpacity style={styles.modalButton} onPress={() => setShowEnrollmentPicker(false)}>
                                                        <Text style={styles.modalButtonText}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </Modal>
                                    ) : (
                                        <DateTimePicker
                                            value={parseDDMMYYYY(enrollmentDate) || new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(_, selectedDate) => {
                                                setShowEnrollmentPicker(false);
                                                if (selectedDate) setEnrollmentDate(toDDMMYYYY(selectedDate));
                                            }}
                                        />
                                    )
                                )}

                                {Platform.OS !== 'web' && showDobPicker && (
                                    Platform.OS === 'ios' ? (
                                        <Modal visible={showDobPicker} transparent animationType="fade">
                                            <View style={styles.modalOverlay}>
                                                <View style={styles.modalContent}>
                                                    <DateTimePicker
                                                        value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                                                        mode="date"
                                                        display="spinner"
                                                        onChange={(_, selectedDate) => {
                                                            if (selectedDate) setDob(toDDMMYYYY(selectedDate));
                                                            setShowDobPicker(false);
                                                        }}
                                                    />
                                                    <TouchableOpacity style={styles.modalButton} onPress={() => setShowDobPicker(false)}>
                                                        <Text style={styles.modalButtonText}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </Modal>
                                    ) : (
                                        <DateTimePicker
                                            value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                                            mode="date"
                                            display="default"
                                            onChange={(_, selectedDate) => {
                                                setShowDobPicker(false);
                                                if (selectedDate) setDob(toDDMMYYYY(selectedDate));
                                            }}
                                        />
                                    )
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Grade Completed while Joining</Text>
                                    <View style={styles.gradeSelectorContainer}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Not completed"
                                            placeholderTextColor="#94a3b8"
                                            value={initialGrade}
                                            onChangeText={(text) => {
                                                setInitialGrade(text);
                                                setShowGradeOptions(false);
                                            }}
                                            editable={!saving}
                                            onFocus={() => setShowGradeOptions(true)}
                                        />
                                        <TouchableOpacity
                                            style={styles.dropdownToggle}
                                            onPress={() => setShowGradeOptions(!showGradeOptions)}
                                            disabled={saving}>
                                            <ChevronDown size={18} color={showGradeOptions ? '#1e40af' : '#64748b'} />
                                        </TouchableOpacity>
                                    </View>
                                    {showGradeOptions && (
                                        <View style={styles.gradeOptionsList}>
                                            <ScrollView style={styles.gradeOptionsScroll} showsVerticalScrollIndicator={false}>
                                                {INITIAL_GRADE_OPTIONS.map((option) => (
                                                    <TouchableOpacity
                                                        key={option}
                                                        style={[
                                                            styles.gradeOption,
                                                            initialGrade === option && styles.gradeOptionSelected,
                                                        ]}
                                                        onPress={() => {
                                                            setInitialGrade(option);
                                                            setShowGradeOptions(false);
                                                        }}>
                                                        <Text style={[
                                                            styles.gradeOptionText,
                                                            initialGrade === option && styles.gradeOptionTextSelected,
                                                        ]}>{option}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Class Type</Text>
                                    <View style={styles.genderRow}>
                                        {(['regular', 'summer'] as const).map(type => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[styles.genderBtn, classType === type && styles.genderBtnActive]}
                                                onPress={() => setClassType(type)}
                                                disabled={saving}>
                                                <Text style={[styles.genderBtnText, classType === type && styles.genderBtnTextActive]}>
                                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {classType === 'regular' && (
                                    <>
                                        {['Class Day 1', 'Class Day 2', 'Compensation Day'].map((label, idx) => (
                                            <View key={label} style={styles.inputGroup}>
                                                <Text style={styles.label}>{label}</Text>
                                                <View style={styles.daySelector}>
                                                    {DAYS_OF_WEEK.map(day => {
                                                        const isTaken = classSlots.some((slot, i) => i !== idx && slot.day === day);
                                                        return (
                                                            <TouchableOpacity
                                                                key={day}
                                                                style={[
                                                                    styles.dayButton,
                                                                    classSlots[idx].day === day && styles.dayButtonActive,
                                                                    isTaken && { opacity: 0.3 },
                                                                ]}
                                                                onPress={() => handleSlotDaySelect(idx, day)}
                                                                disabled={saving || isTaken}>
                                                                <Text style={[
                                                                    styles.dayButtonText,
                                                                    classSlots[idx].day === day && styles.dayButtonTextActive,
                                                                ]}>
                                                                    {day}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                                <View style={[styles.timingSelector, { marginTop: 8 }]}>
                                                    {BATCH_OPTIONS.map(batch => (
                                                        <TouchableOpacity
                                                            key={batch}
                                                            style={[
                                                                styles.timingButton,
                                                                classSlots[idx].batch === batch && styles.timingButtonActive,
                                                            ]}
                                                            onPress={() => handleSlotBatchSelect(idx, batch)}
                                                            disabled={saving}>
                                                            <Text style={[
                                                                styles.timingButtonText,
                                                                classSlots[idx].batch === batch && styles.timingButtonTextActive,
                                                            ]}>
                                                                {batch}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}

                                {classType === 'summer' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Summer Class</Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.timingButton,
                                                styles.timingButtonActive,
                                            ]}
                                            disabled>
                                            <Text style={[styles.timingButtonText, styles.timingButtonTextActive]}>
                                                ☀️ Summer Class
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <UserPlus size={20} color="#1e40af" />
                                    <Text style={styles.cardTitle}>Father's Details</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Father Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Father's Name"
                                        placeholderTextColor="#94a3b8"
                                        value={fatherName}
                                        onChangeText={setFatherName}
                                        editable={!saving}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Father Phone</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone"
                                        placeholderTextColor="#94a3b8"
                                        value={fatherPhone}
                                        onChangeText={setFatherPhone}
                                        keyboardType="phone-pad"
                                        editable={!saving}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Father Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="father@email.com"
                                        placeholderTextColor="#94a3b8"
                                        value={fatherEmail}
                                        onChangeText={setFatherEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!saving}
                                    />
                                </View>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <UserPlus size={20} color="#1e40af" />
                                    <Text style={styles.cardTitle}>Mother's Details</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mother Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mother's Name"
                                        placeholderTextColor="#94a3b8"
                                        value={motherName}
                                        onChangeText={setMotherName}
                                        editable={!saving}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mother Phone</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone"
                                        placeholderTextColor="#94a3b8"
                                        value={motherPhone}
                                        onChangeText={setMotherPhone}
                                        keyboardType="phone-pad"
                                        editable={!saving}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mother Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="mother@email.com"
                                        placeholderTextColor="#94a3b8"
                                        value={motherEmail}
                                        onChangeText={setMotherEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!saving}
                                    />
                                </View>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <MapPin size={20} color="#1e40af" />
                                    <Text style={styles.cardTitle}>Address</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <TextInput
                                        style={[styles.input, styles.addressInput]}
                                        placeholder="Enter full address"
                                        placeholderTextColor="#94a3b8"
                                        value={parentAddress}
                                        onChangeText={setParentAddress}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                        editable={!saving}
                                    />
                                </View>
                            </View>
                        </>

                    ) : (

                        <View style={styles.row}>
                            <View style={styles.column}>
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <UserPlus size={20} color="#1e40af" />
                                        <Text style={styles.cardTitle}>Student Details</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Full Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Student Name"
                                            placeholderTextColor="#94a3b8"
                                            value={fullName}
                                            onChangeText={setFullName}
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Gender</Text>
                                        <View style={styles.genderRow}>
                                            {(['male', 'female'] as const).map(g => (
                                                <TouchableOpacity
                                                    key={g}
                                                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                                    onPress={() => setGender(g)}
                                                    disabled={saving}>
                                                    <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Instrument *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Piano, Violin"
                                            placeholderTextColor="#94a3b8"
                                            value={instrument}
                                            onChangeText={setInstrument}
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={[styles.row, isMobile && styles.rowMobile]}>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>Joining Date *</Text>
                                            <View style={styles.dateInputRow}>
                                                <TextInput
                                                    style={[styles.input, styles.dateInput]}
                                                    placeholder="DD-MM-YYYY"
                                                    placeholderTextColor="#94a3b8"
                                                    value={enrollmentDate}
                                                    onChangeText={(text) => setEnrollmentDate(formatDDMMYYYY(text))}
                                                    keyboardType="numeric"
                                                    maxLength={10}
                                                    editable={!saving}
                                                />
                                                <TouchableOpacity
                                                    style={styles.calendarButton}
                                                    onPress={() => openWebPicker('enrollment')}
                                                    disabled={saving}>
                                                    <Calendar size={18} color="#1e40af" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                            <Text style={styles.label}>Date of Birth</Text>
                                            <View style={styles.dateInputRow}>
                                                <TextInput
                                                    style={[styles.input, styles.dateInput]}
                                                    placeholder="DD-MM-YYYY"
                                                    placeholderTextColor="#94a3b8"
                                                    value={dob}
                                                    onChangeText={(text) => setDob(formatDDMMYYYY(text))}
                                                    keyboardType="numeric"
                                                    maxLength={10}
                                                    editable={!saving}
                                                />
                                                <TouchableOpacity
                                                    style={styles.calendarButton}
                                                    onPress={() => openWebPicker('dob')}
                                                    disabled={saving}>
                                                    <Calendar size={18} color="#1e40af" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {Platform.OS === 'web' && (
                                        <input
                                            ref={webEnrollmentRef as any}
                                            type="date"
                                            style={{ position: 'absolute', top: '20px', left: '30%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
                                            onChange={(e) => handleWebDateChange('enrollment', e.target.value)}
                                        />
                                    )}

                                    {Platform.OS === 'web' && (
                                        <input
                                            ref={webDobRef as any}
                                            type="date"
                                            style={{ position: 'absolute', top: '20px', left: '70%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
                                            onChange={(e) => handleWebDateChange('dob', e.target.value)}
                                        />
                                    )}

                                    {Platform.OS !== 'web' && showEnrollmentPicker && (
                                        Platform.OS === 'ios' ? (
                                            <Modal visible={showEnrollmentPicker} transparent animationType="fade">
                                                <View style={styles.modalOverlay}>
                                                    <View style={styles.modalContent}>
                                                        <DateTimePicker
                                                            value={parseDDMMYYYY(enrollmentDate) || new Date()}
                                                            mode="date"
                                                            display="spinner"
                                                            onChange={(_, selectedDate) => {
                                                                if (selectedDate) setEnrollmentDate(toDDMMYYYY(selectedDate));
                                                                setShowEnrollmentPicker(false);
                                                            }}
                                                        />
                                                        <TouchableOpacity style={styles.modalButton} onPress={() => setShowEnrollmentPicker(false)}>
                                                            <Text style={styles.modalButtonText}>Done</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </Modal>
                                        ) : (
                                            <DateTimePicker
                                                value={parseDDMMYYYY(enrollmentDate) || new Date()}
                                                mode="date"
                                                display="default"
                                                onChange={(_, selectedDate) => {
                                                    setShowEnrollmentPicker(false);
                                                    if (selectedDate) setEnrollmentDate(toDDMMYYYY(selectedDate));
                                                }}
                                            />
                                        )
                                    )}

                                    {Platform.OS !== 'web' && showDobPicker && (
                                        Platform.OS === 'ios' ? (
                                            <Modal visible={showDobPicker} transparent animationType="fade">
                                                <View style={styles.modalOverlay}>
                                                    <View style={styles.modalContent}>
                                                        <DateTimePicker
                                                            value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                                                            mode="date"
                                                            display="spinner"
                                                            onChange={(_, selectedDate) => {
                                                                if (selectedDate) setDob(toDDMMYYYY(selectedDate));
                                                                setShowDobPicker(false);
                                                            }}
                                                        />
                                                        <TouchableOpacity style={styles.modalButton} onPress={() => setShowDobPicker(false)}>
                                                            <Text style={styles.modalButtonText}>Done</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </Modal>
                                        ) : (
                                            <DateTimePicker
                                                value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                                                mode="date"
                                                display="default"
                                                onChange={(_, selectedDate) => {
                                                    setShowDobPicker(false);
                                                    if (selectedDate) setDob(toDDMMYYYY(selectedDate));
                                                }}
                                            />
                                        )
                                    )}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Grade Completed while Joining</Text>
                                        <View style={styles.gradeSelectorContainer}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Not completed"
                                                placeholderTextColor="#94a3b8"
                                                value={initialGrade}
                                                onChangeText={(text) => {
                                                    setInitialGrade(text);
                                                    setShowGradeOptions(false);
                                                }}
                                                editable={!saving}
                                                onFocus={() => setShowGradeOptions(true)}
                                            />
                                            <TouchableOpacity
                                                style={styles.dropdownToggle}
                                                onPress={() => setShowGradeOptions(!showGradeOptions)}
                                                disabled={saving}>
                                                <ChevronDown size={18} color={showGradeOptions ? '#1e40af' : '#64748b'} />
                                            </TouchableOpacity>
                                        </View>
                                        {showGradeOptions && (
                                            <View style={styles.gradeOptionsList}>
                                                <ScrollView style={styles.gradeOptionsScroll} showsVerticalScrollIndicator={false}>
                                                    {INITIAL_GRADE_OPTIONS.map((option) => (
                                                        <TouchableOpacity
                                                            key={option}
                                                            style={[
                                                                styles.gradeOption,
                                                                initialGrade === option && styles.gradeOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                setInitialGrade(option);
                                                                setShowGradeOptions(false);
                                                            }}>
                                                            <Text style={[
                                                                styles.gradeOptionText,
                                                                initialGrade === option && styles.gradeOptionTextSelected,
                                                            ]}>{option}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Class Type</Text>
                                        <View style={styles.genderRow}>
                                            {(['regular', 'summer'] as const).map(type => (
                                                <TouchableOpacity
                                                    key={type}
                                                    style={[styles.genderBtn, classType === type && styles.genderBtnActive]}
                                                    onPress={() => setClassType(type)}
                                                    disabled={saving}>
                                                    <Text style={[styles.genderBtnText, classType === type && styles.genderBtnTextActive]}>
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {classType === 'regular' && (
                                        <>
                                            {['Class Day 1', 'Class Day 2', 'Compensation Day'].map((label, idx) => (
                                                <View key={label} style={styles.inputGroup}>
                                                    <Text style={styles.label}>{label}</Text>
                                                    <View style={styles.daySelector}>
                                                        {DAYS_OF_WEEK.map(day => {
                                                            const isTaken = classSlots.some((slot, i) => i !== idx && slot.day === day);
                                                            return (
                                                                <TouchableOpacity
                                                                    key={day}
                                                                    style={[
                                                                        styles.dayButton,
                                                                        classSlots[idx].day === day && styles.dayButtonActive,
                                                                        isTaken && { opacity: 0.3 },
                                                                    ]}
                                                                    onPress={() => handleSlotDaySelect(idx, day)}
                                                                    disabled={saving || isTaken}>
                                                                    <Text style={[
                                                                        styles.dayButtonText,
                                                                        classSlots[idx].day === day && styles.dayButtonTextActive,
                                                                    ]}>
                                                                        {day}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                    <View style={[styles.timingSelector, { marginTop: 8 }]}>
                                                        {BATCH_OPTIONS.map(batch => (
                                                            <TouchableOpacity
                                                                key={batch}
                                                                style={[
                                                                    styles.timingButton,
                                                                    classSlots[idx].batch === batch && styles.timingButtonActive,
                                                                ]}
                                                                onPress={() => handleSlotBatchSelect(idx, batch)}
                                                                disabled={saving}>
                                                                <Text style={[
                                                                    styles.timingButtonText,
                                                                    classSlots[idx].batch === batch && styles.timingButtonTextActive,
                                                                ]}>
                                                                    {batch}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </View>
                                            ))}
                                        </>
                                    )}

                                    {classType === 'summer' && (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Summer Class</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.timingButton,
                                                    styles.timingButtonActive,
                                                ]}
                                                disabled>
                                                <Text style={[styles.timingButtonText, styles.timingButtonTextActive]}>
                                                    ☀️ Summer Class
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.column}>
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <UserPlus size={20} color="#1e40af" />
                                        <Text style={styles.cardTitle}>Father's Details</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Father Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Father's Name"
                                            placeholderTextColor="#94a3b8"
                                            value={fatherName}
                                            onChangeText={setFatherName}
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Father Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Phone"
                                            placeholderTextColor="#94a3b8"
                                            value={fatherPhone}
                                            onChangeText={setFatherPhone}
                                            keyboardType="phone-pad"
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Father Email</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="father@email.com"
                                            placeholderTextColor="#94a3b8"
                                            value={fatherEmail}
                                            onChangeText={setFatherEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!saving}
                                        />
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <UserPlus size={20} color="#1e40af" />
                                        <Text style={styles.cardTitle}>Mother's Details</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Mother Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Mother's Name"
                                            placeholderTextColor="#94a3b8"
                                            value={motherName}
                                            onChangeText={setMotherName}
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Mother Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Phone"
                                            placeholderTextColor="#94a3b8"
                                            value={motherPhone}
                                            onChangeText={setMotherPhone}
                                            keyboardType="phone-pad"
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Mother Email</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="mother@email.com"
                                            placeholderTextColor="#94a3b8"
                                            value={motherEmail}
                                            onChangeText={setMotherEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!saving}
                                        />
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <MapPin size={20} color="#1e40af" />
                                        <Text style={styles.cardTitle}>Address</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <TextInput
                                            style={[styles.input, styles.addressInput]}
                                            placeholder="Enter full address"
                                            placeholderTextColor="#94a3b8"
                                            value={parentAddress}
                                            onChangeText={setParentAddress}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                            editable={!saving}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, saving && styles.buttonDisabled]}
                        onPress={handleUpdateStudent}
                        disabled={saving}>
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Update Student</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    formContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: Platform.OS === 'android' ? 80 : 20,
        gap: 16,
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    rowMobile: {
        flexDirection: 'column',
        gap: 16,
    },
    column: {
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e40af',
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
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
    gradeOptionsList: {
        marginTop: 4,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    gradeOptionsScroll: {
        maxHeight: 220,
    },
    gradeOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    gradeOptionSelected: {
        backgroundColor: '#eff6ff',
    },
    gradeOptionText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    gradeOptionTextSelected: {
        color: '#1e40af',
        fontWeight: '700',
    },
    genderRow: {
        flexDirection: 'row',
        gap: 8,
    },
    genderBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    genderBtnActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    genderBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    genderBtnTextActive: {
        color: '#fff',
    },
    dateInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateInput: {
        flex: 1,
    },
    calendarButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerDone: {
        textAlign: 'center',
        color: '#1e40af',
        fontWeight: '700',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
    },
    modalButton: {
        backgroundColor: '#1e40af',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 32,
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    daySelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    dayButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    dayButtonTextActive: {
        color: '#fff',
    },
    timingSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    timingButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    timingButtonActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    timingButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    timingButtonTextActive: {
        color: '#fff',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    addressIcon: {
        marginTop: 12,
    },
    addressInput: {
        flex: 1,
        minHeight: 80,
    },
    submitButton: {
        backgroundColor: '#1e40af',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
