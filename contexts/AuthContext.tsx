import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { profileService, studentService } from '@/lib/firestore';
import { Profile } from '@/types/database';

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
          const students = await studentService.getStudentsByParentEmail(firebaseUser.email);
          if (students.length > 0) {
            const parentName = students[0].parent_name || firebaseUser.displayName || firebaseUser.email.split('@')[0];
            await profileService.createProfile(firebaseUser.uid, {
              email: firebaseUser.email,
              full_name: parentName,
              role: 'student',
            });
            userProfile = await profileService.getProfile(firebaseUser.uid);
          }
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
      await signInWithEmailAndPassword(auth, email, password);
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
