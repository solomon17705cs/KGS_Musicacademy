import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function NotFoundScreen() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      if (profile.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else if (profile.role === 'staff') {
        router.replace('/(staff)/dashboard');
      } else {
        router.replace('/(tabs)/progress');
      }
    } else {
      router.replace('/login');
    }
  }, [user, profile, loading]);

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
