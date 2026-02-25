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

        const inAuthGroup = segments[0] === '(admin)' || segments[0] === '(tabs)';
        const inAdminGroup = segments[0] === '(admin)';

        if (!profile && inAuthGroup) {
            // User is not signed in and trying to access protected route
            router.replace('/login');
        } else if (profile && !inAuthGroup && segments[0] !== '+not-found') {
            // User is signed in and trying to access public route (like login/index)
            if (profile.role === 'admin') {
                router.replace('/(admin)/dashboard');
            } else {
                router.replace('/(tabs)/progress');
            }
        } else if (profile && profile.role !== 'admin' && inAdminGroup) {
            // Non-admin trying to access admin route
            router.replace('/(tabs)/progress');
        }
    }, [profile, loading, segments, rootNavigationState?.key]);
}
