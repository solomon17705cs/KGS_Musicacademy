import React, { useState, useRef } from 'react';
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
    Modal,
    useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/lib/firestore';
import { ArrowLeft, UserPlus, Calendar, Music, Phone, MapPin, Clock } from 'lucide-react-native';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

export default function AddStudentScreen() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

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
    const [enrollmentDate, setEnrollmentDate] = useState(toDDMMYYYY(new Date()));
    const [dob, setDob] = useState('');
    const [initialGrade, setInitialGrade] = useState('');
    const [classDays, setClassDays] = useState<string[]>([]);
    const [classTiming, setClassTiming] = useState<string | null>(null);

    // Parent & Contact Information
    const [fatherName, setFatherName] = useState('');
    const [fatherPhone, setFatherPhone] = useState('');
    const [fatherEmail, setFatherEmail] = useState('');
    const [motherName, setMotherName] = useState('');
    const [motherPhone, setMotherPhone] = useState('');
    const [motherEmail, setMotherEmail] = useState('');
    const [parentAddress, setParentAddress] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 768;

    const toggleDay = (day: string) => {
        if (classDays.includes(day)) {
            setClassDays(classDays.filter(d => d !== day));
        } else if (classDays.length < 3) {
            setClassDays([...classDays, day]);
        }
    };

    const formatDateForDB = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        if (parts[0].length === 4) return dateStr;
        const [d, m, y] = parts;
        return `${y}-${m}-${d}`;
    };

    async function handleAddStudent() {
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

        setLoading(true);
        setError('');

        try {
            await studentService.createStudent({
                user_id: null,
                father_name: fatherName.trim() || null,
                father_phone: fatherPhone.trim() || null,
                father_email: fatherEmail.toLowerCase().trim() || null,
                mother_name: motherName.trim() || null,
                mother_phone: motherPhone.trim() || null,
                mother_email: motherEmail.toLowerCase().trim() || null,
                parent_address: parentAddress.trim() || null,
                full_name: fullName,
                gender: gender || null,
                date_of_birth: dob ? formatDateForDB(dob) : null,
                enrollment_date: formatDateForDB(enrollmentDate) || '',
                instrument,
                initial_grade: initialGrade || null,
                class_days: classDays,
                class_timing: classTiming || null,
                completed_grades: [],
                streak: 0,
                points: 0,
                fee_status: 'pending',
            });

            router.back();
        } catch (err: any) {
            setError(err.message || 'Failed to add student');
            setLoading(false);
        }
    }

    if (authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container(isMobile)}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>Add New Student</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                            Provide at least one parent's information. Parents can log in with their email to view their child's progress.
                        </Text>
                    </View>

                    <View style={[styles.row, isMobile && styles.rowMobile]}>
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
                                        editable={!loading}
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
                                                disabled={loading}>
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
                                        editable={!loading}
                                    />
                                </View>

<View style={styles.row}>
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
                                                editable={!loading}
                                            />
                                            <TouchableOpacity
                                                style={styles.calendarButton}
                                                onPress={() => openWebPicker('enrollment')}
                                                disabled={loading}>
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
                                                editable={!loading}
                                            />
                                            <TouchableOpacity
                                                style={styles.calendarButton}
                                                onPress={() => openWebPicker('dob')}
                                                disabled={loading}>
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
                                    <Modal visible={showEnrollmentPicker} transparent animationType="fade">
                                        <View style={styles.modalOverlay}>
                                            <View style={styles.modalContent}>
                                                <Text style={styles.modalTitle}>Select Joining Date</Text>
                                                <DateTimePicker
                                                    value={parseDDMMYYYY(enrollmentDate) || new Date()}
                                                    mode="date"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={(_, selectedDate) => {
                                                        if (selectedDate) {
                                                            setEnrollmentDate(toDDMMYYYY(selectedDate));
                                                        }
                                                    }}
                                                />
                                                <TouchableOpacity style={styles.modalButton} onPress={() => setShowEnrollmentPicker(false)}>
                                                    <Text style={styles.modalButtonText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                )}

                                {Platform.OS !== 'web' && showDobPicker && (
                                    <Modal visible={showDobPicker} transparent animationType="fade">
                                        <View style={styles.modalOverlay}>
                                            <View style={styles.modalContent}>
                                                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                                                <DateTimePicker
                                                    value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                                                    mode="date"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={(_, selectedDate) => {
                                                        if (selectedDate) {
                                                            setDob(toDDMMYYYY(selectedDate));
                                                        }
                                                    }}
                                                />
                                                <TouchableOpacity style={styles.modalButton} onPress={() => setShowDobPicker(false)}>
                                                    <Text style={styles.modalButtonText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Grade completed while joining</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Grade 1"
                                        placeholderTextColor="#94a3b8"
                                        value={initialGrade}
                                        onChangeText={setInitialGrade}
                                        editable={!loading}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Class Days (max 3)</Text>
                                    <View style={styles.daySelector}>
                                        {DAYS_OF_WEEK.map(day => (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.dayButton,
                                                    classDays.includes(day) && styles.dayButtonActive,
                                                ]}
                                                onPress={() => toggleDay(day)}
                                                disabled={loading && !classDays.includes(day)}>
                                                <Text style={[
                                                    styles.dayButtonText,
                                                    classDays.includes(day) && styles.dayButtonTextActive,
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Class Timing</Text>
                                    <View style={styles.timingSelector}>
                                        {BATCH_OPTIONS.map(batch => (
                                            <TouchableOpacity
                                                key={batch}
                                                style={[
                                                    styles.timingButton,
                                                    classTiming === batch && styles.timingButtonActive,
                                                ]}
                                                onPress={() => setClassTiming(batch)}
                                                disabled={loading}>
                                                <Clock size={14} color={classTiming === batch ? '#fff' : '#64748b'} />
                                                <Text style={[
                                                    styles.timingButtonText,
                                                    classTiming === batch && styles.timingButtonTextActive,
                                                ]}>
                                                    {batch}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
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
                                        editable={!loading}
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
                                        editable={!loading}
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
                                        editable={!loading}
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
                                        editable={!loading}
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
                                        editable={!loading}
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
                                        editable={!loading}
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
                                        editable={!loading}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.buttonDisabled]}
                        onPress={handleAddStudent}
                        disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Register Student</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
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
    infoBox: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: '#1e40af',
    },
    infoBoxText: {
        fontSize: 13,
        color: '#334155',
        lineHeight: 20,
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
        gap: 6,
    },
    dayButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
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
