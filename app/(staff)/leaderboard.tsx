import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { studentService } from '@/lib/firestore';
import { Student } from '@/types/database';
import {
    Trophy,
    Flame,
    ArrowLeft,
    Crown,
    Medal,
    TrendingUp,
    Award,
} from 'lucide-react-native';

export default function AdminLeaderboard() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [leaderboardType, setLeaderboardType] = useState<'streak' | 'points'>('streak');

    useEffect(() => {
        loadLeaderboard();
    }, [leaderboardType]);

    async function loadLeaderboard() {
        try {
            setError('');
            const data = await studentService.getLeaderboard(leaderboardType);
            setStudents(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load leaderboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLeaderboard();
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <Crown size={24} color="#fbbf24" />;
            case 1:
                return <Medal size={24} color="#94a3b8" />;
            case 2:
                return <Medal size={24} color="#b45309" />;
            default:
                return (
                    <View style={styles.rankCircle}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                );
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    {leaderboardType === 'streak' ? (
                        <Flame size={28} color="#ef4444" />
                    ) : (
                        <Trophy size={28} color="#fbbf24" />
                    )}
                    <Text style={styles.headerTitle}>
                        {leaderboardType === 'streak' ? 'Streak Leaderboard' : 'Points Leaderboard'}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, leaderboardType === 'streak' && styles.toggleButtonActive]}
                    onPress={() => setLeaderboardType('streak')}>
                    <Flame size={18} color={leaderboardType === 'streak' ? '#fff' : '#64748b'} />
                    <Text style={[styles.toggleText, leaderboardType === 'streak' && styles.toggleTextActive]}>Streaks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, leaderboardType === 'points' && styles.toggleButtonActive]}
                    onPress={() => setLeaderboardType('points')}>
                    <Trophy size={18} color={leaderboardType === 'points' ? '#fff' : '#64748b'} />
                    <Text style={[styles.toggleText, leaderboardType === 'points' && styles.toggleTextActive]}>Points</Text>
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
                ) : (
                    <View style={styles.listContainer}>
                        {students.map((student, index) => (
                            <View
                                key={student.id}
                                style={[
                                    styles.card,
                                    index === 0 && styles.firstPlaceCard,
                                ]}>
                                <View style={styles.rankSection}>
                                    {getRankIcon(index)}
                                </View>

                                <View style={styles.studentInfo}>
                                    <Text style={styles.studentName}>{student.full_name}</Text>
                                    <Text style={styles.instrument}>{student.instrument}</Text>
                                </View>

                                <View style={styles.statsColumn}>
                                    <View style={[styles.statBadge, leaderboardType === 'streak' && styles.statBadgeActive]}>
                                        <Flame size={14} color={leaderboardType === 'streak' ? '#ef4444' : '#64748b'} />
                                        <Text style={[styles.statValue, leaderboardType === 'streak' && styles.statValueActive]}>
                                            {student.streak || 0}
                                        </Text>
                                    </View>
                                    <View style={[styles.statBadge, leaderboardType === 'points' && styles.statBadgeActive, { marginTop: 4 }]}>
                                        <Award size={14} color={leaderboardType === 'points' ? '#fbbf24' : '#64748b'} />
                                        <Text style={[styles.statValue, leaderboardType === 'points' && styles.statValueActive]}>
                                            {student.points || 0}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}

                        {students.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Trophy size={64} color="#cbd5e1" />
                                <Text style={styles.emptyTitle}>No Data Yet</Text>
                                <Text style={styles.emptyText}>
                                    Students will appear here once they start their streaks!
                                </Text>
                            </View>
                        )}
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
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1e293b',
    },
    content: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    firstPlaceCard: {
        backgroundColor: '#fffbeb',
        borderColor: '#fbbf24',
        borderWidth: 1,
        transform: [{ scale: 1.02 }],
    },
    rankSection: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rankCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
    },
    instrument: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: '#f1f5f9',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#1e40af',
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    toggleTextActive: {
        color: '#fff',
    },
    statsColumn: {
        alignItems: 'flex-end',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    statBadgeActive: {
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7',
        borderWidth: 1,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#64748b',
    },
    statValueActive: {
        color: '#1e293b',
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
        marginTop: 40,
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
});
