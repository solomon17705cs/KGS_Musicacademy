import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { profileService, studentService } from '@/lib/firestore';
import { Profile } from '@/types/database';
import { initializePushNotifications } from '@/lib/notifications';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'student' | 'admin' | 'staff'
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let userProfile = await profileService.getProfile(firebaseUser.uid);
        
        if (!userProfile && firebaseUser.email) {
          const normalizedEmail = firebaseUser.email.toLowerCase();
          const students = await studentService.getStudentsByParentEmail(normalizedEmail);
          if (students.length > 0) {
            const parentName = students[0].parent_name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
            await profileService.createProfile(firebaseUser.uid, {
              email: firebaseUser.email.toLowerCase(),
              full_name: parentName,
              role: 'student',
            });
            userProfile = await profileService.getProfile(firebaseUser.uid);
          }
        }

        if (!userProfile && firebaseUser.phoneNumber) {
          const students = await studentService.getStudentsByParentPhone(firebaseUser.phoneNumber);
          const parentName = students.length > 0 
            ? students[0].parent_name || 'Parent'
            : 'Parent';
          await profileService.createProfile(firebaseUser.uid, {
            email: '',
            full_name: parentName,
            role: 'student',
            phone: firebaseUser.phoneNumber,
          });
          userProfile = await profileService.getProfile(firebaseUser.uid);
        }
        
        setProfile(userProfile);
      } else {
        setProfile(null);
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
    role: 'student' | 'admin' | 'staff'
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
