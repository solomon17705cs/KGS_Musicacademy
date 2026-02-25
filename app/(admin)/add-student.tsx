import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, CompletedGrade } from '@/types/database';
import { ArrowLeft, UserPlus, Calendar, Music, GraduationCap, Award, Plus, Trash2, Users, Search } from 'lucide-react-native';

export default function AddStudentScreen() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    const getTodayDDMMYYYY = () => {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        return `${d}-${m}-${y}`;
    };

    const formatDateForDB = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        // Check if it's already YYYY-MM-DD
        if (parts[0].length === 4) return dateStr;
        const [d, m, y] = parts;
        return `${y}-${m}-${d}`;
    };

    const [fullName, setFullName] = useState('');
    const [instrument, setInstrument] = useState('');
    const [enrollmentDate, setEnrollmentDate] = useState(getTodayDDMMYYYY());
    const [initialGrade, setInitialGrade] = useState('');

    // Dynamic list for completed grades
    const [completedGrades, setCompletedGrades] = useState<CompletedGrade[]>([]);

    const addGradeField = () => {
        setCompletedGrades([
            ...completedGrades,
            { grade: '', date: '', mark: 'Pass', type: 'practical' }
        ]);
    };

    const removeGradeField = (index: number) => {
        const updated = completedGrades.filter((_, i) => i !== index);
        setCompletedGrades(updated);
    };

    const updateGradeField = (index: number, field: keyof CompletedGrade, value: string) => {
        const updated = [...completedGrades];
        updated[index] = { ...updated[index], [field]: value };
        setCompletedGrades(updated);
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [parents, setParents] = useState<Profile[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [loadingParents, setLoadingParents] = useState(true);
    const [parentSearchQuery, setParentSearchQuery] = useState('');

    useEffect(() => {
        loadParents();
    }, []);

    async function loadParents() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'parent');

            if (error) throw error;
            setParents(data || []);
        } catch (err) {
            console.error('Error loading parents:', err);
        } finally {
            setLoadingParents(false);
        }
    }

    useEffect(() => {
        if (authLoading || !rootNavigationState?.key) return;
        if (profile?.role !== 'admin') {
            router.replace('/login');
        }
    }, [profile, authLoading, rootNavigationState?.key]);

    async function handleAddStudent() {
        if (!fullName || !instrument || !enrollmentDate) {
            setError('Please fill in required fields (Name, Instrument, Joining Date)');
            return;
        }

        // Basic validation for DD-MM-YYYY
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(enrollmentDate)) {
            setError('Please use DD-MM-YYYY format for Joining Date');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error: insertError } = await supabase
                .from('students')
                .insert({
                    full_name: fullName,
                    instrument,
                    enrollment_date: formatDateForDB(enrollmentDate),
                    initial_grade: initialGrade || null,
                    completed_grades: completedGrades.map(g => ({
                        ...g,
                        date: formatDateForDB(g.date)
                    })),
                    parent_id: selectedParentId,
                    updated_at: new Date().toISOString(),
                });

            if (insertError) throw insertError;

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
            </View>
        );
    }

    return (
        <View style={styles.container}>
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

                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <UserPlus size={18} color="#64748b" />
                            <Text style={styles.label}>Full Name *</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Student Name"
                            value={fullName}
                            onChangeText={setFullName}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <Music size={18} color="#64748b" />
                            <Text style={styles.label}>Instrument *</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Piano, Violin, Guitar"
                            value={instrument}
                            onChangeText={setInstrument}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <Calendar size={18} color="#64748b" />
                            <Text style={styles.label}>Date of Joining (DD-MM-YYYY) *</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="DD-MM-YYYY"
                            value={enrollmentDate}
                            onChangeText={setEnrollmentDate}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <GraduationCap size={18} color="#64748b" />
                            <Text style={styles.label}>Grade / Level while Joining</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Last Completed Grade"
                            value={initialGrade}
                            onChangeText={setInitialGrade}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.sectionHeader}>
                        <Users size={20} color="#1e40af" />
                        <Text style={styles.sectionTitle}>Link Parent Account</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.smallLabel}>Search and assign a parent account (Optional)</Text>
                        {loadingParents ? (
                            <ActivityIndicator size="small" color="#1e40af" style={{ marginTop: 12 }} />
                        ) : (
                            <View style={styles.parentSelectorContainer}>
                                {parents.length === 0 ? (
                                    <Text style={styles.emptyText}>No parent accounts found. Parents must sign up first.</Text>
                                ) : (
                                    <>
                                        {/* Search Bar */}
                                        <View style={styles.searchBarContainer}>
                                            <Search size={18} color="#64748b" />
                                            <TextInput
                                                style={styles.searchBarInput}
                                                placeholder="Search parent name..."
                                                value={parentSearchQuery}
                                                onChangeText={setParentSearchQuery}
                                            />
                                        </View>

                                        {/* Result Area */}
                                        <View style={styles.parentsResultContainer}>
                                            <ScrollView
                                                style={styles.parentsVerticalList}
                                                nestedScrollEnabled={true}
                                                contentContainerStyle={{ gap: 8 }}>

                                                {/* Clear Selection Option */}
                                                <TouchableOpacity
                                                    style={[styles.parentResultItem, selectedParentId === null && styles.parentResultItemActive]}
                                                    onPress={() => {
                                                        setSelectedParentId(null);
                                                        setParentSearchQuery('');
                                                    }}>
                                                    <View style={[styles.statusDot, selectedParentId === null && styles.statusDotActive]} />
                                                    <Text style={[styles.parentResultText, selectedParentId === null && styles.parentResultTextActive]}>
                                                        None (No parent assigned)
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Filtered Parents */}
                                                {(parentSearchQuery.length > 0 ? parents.filter(p => p.full_name.toLowerCase().includes(parentSearchQuery.toLowerCase())) : parents.slice(0, 5)).map((parent) => (
                                                    <TouchableOpacity
                                                        key={parent.id}
                                                        style={[styles.parentResultItem, selectedParentId === parent.id && styles.parentResultItemActive]}
                                                        onPress={() => {
                                                            setSelectedParentId(parent.id);
                                                            setParentSearchQuery('');
                                                        }}>
                                                        <View style={[styles.statusDot, selectedParentId === parent.id && styles.statusDotActive]} />
                                                        <View>
                                                            <Text style={[styles.parentResultText, selectedParentId === parent.id && styles.parentResultTextActive]}>
                                                                {parent.full_name}
                                                            </Text>
                                                            <Text style={styles.parentResultEmail}>{parent.email}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}

                                                {parentSearchQuery.length > 0 && parents.filter(p => p.full_name.toLowerCase().includes(parentSearchQuery.toLowerCase())).length === 0 && (
                                                    <Text style={styles.noResultsText}>No parents match "{parentSearchQuery}"</Text>
                                                )}

                                                {parentSearchQuery.length === 0 && parents.length > 5 && (
                                                    <Text style={styles.searchHintText}>Type to search from {parents.length} parents...</Text>
                                                )}
                                            </ScrollView>
                                        </View>

                                        {/* Selected Parent Preview (when search is collapsed) */}
                                        {selectedParentId && !parentSearchQuery && (
                                            <View style={styles.selectedParentBox}>
                                                <Text style={styles.selectedLabel}>Selected Parent:</Text>
                                                <Text style={styles.selectedName}>
                                                    {parents.find(p => p.id === selectedParentId)?.full_name}
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.sectionHeader}>
                        <Award size={20} color="#1e40af" />
                        <Text style={styles.sectionTitle}>Completed Grades</Text>
                    </View>

                    {completedGrades.map((item, index) => (
                        <View key={index} style={styles.gradeCard}>
                            <View style={styles.gradeCardHeader}>
                                <Text style={styles.gradeCardTitle}>Grade Entry #{index + 1}</Text>
                                <TouchableOpacity onPress={() => removeGradeField(index)}>
                                    <Trash2 size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.smallLabel}>Grade</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Which Grade"
                                    value={item.grade}
                                    onChangeText={(val) => updateGradeField(index, 'grade', val)}
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.smallLabel}>Examination Type</Text>
                                <View style={styles.selectorRow}>
                                    {['theory', 'practical'].map((typ) => (
                                        <TouchableOpacity
                                            key={typ}
                                            style={[
                                                styles.selectorButton,
                                                item.type === typ && styles.selectorButtonActive,
                                            ]}
                                            onPress={() => updateGradeField(index, 'type', typ)}>
                                            <Text
                                                style={[
                                                    styles.selectorButtonText,
                                                    item.type === typ && styles.selectorButtonTextActive,
                                                ]}>
                                                {typ.charAt(0).toUpperCase() + typ.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                                    <Text style={styles.smallLabel}>Date (Month Year)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Dec 2024"
                                        value={item.date}
                                        onChangeText={(val) => updateGradeField(index, 'date', val)}
                                        editable={!loading}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 2.5 }]}>
                                    <Text style={styles.smallLabel}>Result</Text>
                                    <View style={styles.marksSelectorRow}>
                                        {['Distinction', 'Merit', 'Pass', 'Fail'].map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[
                                                    styles.markSegment,
                                                    item.mark === m && styles.markSegmentActive,
                                                ]}
                                                onPress={() => updateGradeField(index, 'mark', m)}>
                                                <Text
                                                    style={[
                                                        styles.markSegmentText,
                                                        item.mark === m && styles.markSegmentTextActive,
                                                    ]}>
                                                    {m}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addGradeButton} onPress={addGradeField}>
                        <Plus size={18} color="#1e40af" />
                        <Text style={styles.addGradeButtonText}>Add Grade Achievement</Text>
                    </TouchableOpacity>

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
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 24,
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 24,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1e293b',
    },
    submitButton: {
        backgroundColor: '#1e40af',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 32,
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
        marginBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    gradeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    gradeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    gradeCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e40af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    smallLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    addGradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#1e40af',
        borderStyle: 'dashed',
        marginTop: 8,
    },
    addGradeButtonText: {
        color: '#1e40af',
        fontSize: 15,
        fontWeight: '700',
    },
    selectorRow: {
        flexDirection: 'row',
        gap: 10,
    },
    selectorButton: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    selectorButtonActive: {
        backgroundColor: '#dbeafe',
        borderColor: '#1e40af',
    },
    selectorButtonText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    selectorButtonTextActive: {
        color: '#1e40af',
        fontWeight: '700',
    },
    marksSelectorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    markSegment: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    markSegmentActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    markSegmentText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    markSegmentTextActive: {
        color: '#fff',
    },
    selectedMarkHint: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 6,
    },
    boldText: {
        fontWeight: '700',
        color: '#1e293b',
    },
    parentSelectorContainer: {
        marginTop: 8,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
        gap: 10,
    },
    searchBarInput: {
        flex: 1,
        fontSize: 15,
        color: '#1e293b',
    },
    parentsResultContainer: {
        marginTop: 12,
        maxHeight: 200,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    parentsVerticalList: {
        padding: 10,
    },
    parentResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        gap: 12,
    },
    parentResultItemActive: {
        backgroundColor: '#dbeafe',
        borderColor: '#1e40af',
        borderWidth: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#cbd5e1',
    },
    statusDotActive: {
        backgroundColor: '#1e40af',
    },
    parentResultText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    parentResultTextActive: {
        color: '#1e40af',
        fontWeight: '700',
    },
    parentResultEmail: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 1,
    },
    noResultsText: {
        padding: 20,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 14,
        fontStyle: 'italic',
    },
    searchHintText: {
        padding: 10,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
    },
    selectedParentBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#1e40af',
    },
    selectedLabel: {
        fontSize: 11,
        color: '#1e40af',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    selectedName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginTop: 2,
    },
    parentChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginRight: 10,
    },
    parentChipActive: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    parentChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    parentChipTextActive: {
        color: '#fff',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: 8,
    },
});
