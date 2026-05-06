import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function useProtectedRoute() {
    const { profile, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const rootNavigationState = useRootNavigationState();

    useEffect(() => {
        // If navigation state is not ready, do nothing
        if (!rootNavigationState?.key) return;

        // If auth state is still loading, do nothing
        if (loading) return;

        const inAuthGroup = segments[0] === '(admin)' || segments[0] === '(tabs)' || segments[0] === '(staff)' || segments[0] === 'full-report' || segments[0] === 'notification';
        const inAdminGroup = segments[0] === '(admin)';
        const inStaffGroup = segments[0] === '(staff)';

        if (!profile && inAuthGroup) {
            // User is not signed in and trying to access protected route
            router.replace('/login');
        } else if (profile && !inAuthGroup && segments[0] !== '+not-found') {
            // User is signed in and trying to access public route (like login/index)
            if (profile.role === 'admin') {
                router.replace('/(admin)/dashboard');
            } else if (profile.role === 'staff') {
                router.replace('/(staff)/dashboard');
            } else {
                router.replace('/(tabs)/progress');
            }
        } else if (profile && profile.role !== 'admin' && inAdminGroup) {
            // Non-admin trying to access admin route
            if (profile.role === 'staff') {
                router.replace('/(staff)/dashboard');
            } else {
                router.replace('/(tabs)/progress');
            }
        } else if (profile && profile.role !== 'staff' && inStaffGroup) {
            // Non-staff trying to access staff route
            if (profile.role === 'admin') {
                router.replace('/(admin)/dashboard');
            } else {
                router.replace('/(tabs)/progress');
            }
        }
    }, [profile, loading, segments, rootNavigationState?.key]);
}
