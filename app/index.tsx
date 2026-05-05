import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for the auth state to resolve and the navigation state to be ready
    if (loading || !rootNavigationState?.key) return;

    if (!profile) {
      router.replace('/login');
    } else if (profile.role === 'admin') {
      router.replace('/(admin)/dashboard');
    } else if (profile.role === 'staff') {
      router.replace('/(staff)/dashboard');
    } else {
      router.replace('/(tabs)/progress');
    }
  }, [profile, loading, rootNavigationState?.key]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1e40af" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
