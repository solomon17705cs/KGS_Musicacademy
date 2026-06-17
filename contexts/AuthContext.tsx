import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { profileService, studentService } from '@/lib/firestore';
import { Profile } from '@/types/database';
import { initializePushNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_CACHE_KEY = '@kgs_auth_profile';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'parent' | 'admin' | 'staff'
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function cacheProfile(profile: Profile | null) {
  try {
    if (profile) {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch (e) {
    console.warn('Failed to cache profile:', e);
  }
}

async function getCachedProfile(): Promise<Profile | null> {
  try {
    const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Profile;
    }
  } catch (e) {
    console.warn('Failed to get cached profile:', e);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const cached = await getCachedProfile();
      if (cached) {
        setProfile(cached);
      }
    }
    initAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let userProfile = await profileService.getProfile(firebaseUser.uid);

        if (!userProfile && firebaseUser.email) {
          const normalizedEmail = firebaseUser.email.toLowerCase();
          const students = await studentService.getStudentsByParentEmail(normalizedEmail);
          if (students.length > 0) {
            const parentName = students[0].father_name || students[0].mother_name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
            await profileService.createProfile(firebaseUser.uid, {
              email: firebaseUser.email.toLowerCase(),
              full_name: parentName,
              role: 'parent',
            });
            userProfile = await profileService.getProfile(firebaseUser.uid);
          }
        }

        if (!userProfile && firebaseUser.phoneNumber) {
          const students = await studentService.getStudentsByParentPhone(firebaseUser.phoneNumber);
          const parentName = students.length > 0
            ? students[0].father_name || students[0].mother_name || 'Parent'
            : 'Parent';
          await profileService.createProfile(firebaseUser.uid, {
            email: '',
            full_name: parentName,
            role: 'parent',
            phone: firebaseUser.phoneNumber,
          });
          userProfile = await profileService.getProfile(firebaseUser.uid);
        }

        setProfile(userProfile);
        await cacheProfile(userProfile);
      } else {
        setProfile(null);
        await cacheProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        initializePushNotifications(result.user.uid);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'parent' | 'admin' | 'staff'
  ) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      await profileService.createProfile(user.uid, {
        email,
        full_name: fullName,
        role,
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setProfile(null);
    await cacheProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
