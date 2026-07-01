import React, { createContext, useContext, useState, useCallback } from 'react';
import { auth, phoneAuthProvider, signInWithPhoneCredential } from '@/lib/firebase';
import { signInWithCredential } from 'firebase/auth';
import { initializePushNotifications } from '@/lib/notifications';

interface PhoneAuthContextType {
  verificationId: string | null;
  loading: boolean;
  error: string | null;
  sendOTP: (phoneNumber: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  reset: () => void;
}

const PhoneAuthContext = createContext<PhoneAuthContextType | undefined>(undefined);

export function PhoneAuthProvider({ children }: { children: React.ReactNode }) {
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOTP = useCallback(async (phoneNumber: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      phoneAuthProvider.verifyPhoneNumber(
        auth,
        phoneNumber,
        {
          timeout: 60,
        },
        (vid) => {
          setVerificationId(vid);
          setLoading(false);
          resolve(true);
        },
        (err) => {
          setError(err.message || 'Failed to send OTP');
          setLoading(false);
          resolve(false);
        },
        () => {}
      );
    });
  }, []);

  const verifyOTP = useCallback(async (code: string): Promise<boolean> => {
    if (!verificationId) {
      setError('No verification ID found');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const credential = await signInWithPhoneCredential(verificationId, code);
      const result = await signInWithCredential(auth, credential);
      if (result.user) {
        initializePushNotifications(result.user.uid).catch(err =>
          console.log('[Push] Failed to init after phone login:', err)
        );
      }
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setLoading(false);
      return false;
    }
  }, [verificationId]);

  const reset = useCallback(() => {
    setVerificationId(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
    <PhoneAuthContext.Provider value={{ verificationId, loading, error, sendOTP, verifyOTP, reset }}>
      {children}
    </PhoneAuthContext.Provider>
  );
}

export function usePhoneAuth() {
  const context = useContext(PhoneAuthContext);
  if (!context) {
    throw new Error('usePhoneAuth must be used within PhoneAuthProvider');
  }
  return context;
}