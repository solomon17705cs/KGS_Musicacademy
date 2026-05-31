import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { sendOTPviaSMS, verifyOTPandSignIn } from '@/lib/phoneAuth';
import { Phone, Mail, Lock, ArrowRight } from 'lucide-react-native';

type LoginMethod = 'email' | 'phone';

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleEmailSignIn() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Failed to sign in');
      setLoading(false);
    }
  }

  async function handleSendOTP() {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let digits = phone.trim().replace(/\D/g, '');

      if (digits.length === 0) {
        setError('Please enter a valid phone number');
        setLoading(false);
        return;
      }

      if (digits.length > 10) {
        if (digits.startsWith('91') && digits.length === 12) {
          digits = digits.substring(1);
        } else if (digits.startsWith('+91') && digits.length === 13) {
          digits = digits.substring(2);
        }
      }

      if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
        setError('Please enter a valid 10-digit mobile number (starting with 6-9)');
        setLoading(false);
        return;
      }

      const formattedPhone = '+91' + digits;
      console.log('Sending OTP to:', formattedPhone);

      const sessionInfo = await sendOTPviaSMS(formattedPhone, auth);
      setVerificationId(sessionInfo);
      console.log('OTP sent, sessionInfo:', sessionInfo);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      const msg = err.message || '';
      if (msg.includes('INVALID_PHONE_NUMBER')) {
        setError('Invalid phone number. Check the number and try again.');
      } else if (msg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        setError('Too many attempts. Please try again later.');
      } else if (msg.includes('QUOTA_EXCEEDED')) {
        setError('SMS quota exceeded. Try again later.');
      } else if (msg.includes('BLOCKED')) {
        setError('This number has been blocked due to unusual activity.');
      } else if (msg.includes('Failed to send OTP')) {
        setError(msg);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp || !verificationId) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOTPandSignIn(auth, verificationId, otp);
      console.log('✅ Firebase sign-in success');
      console.log('User UID:', auth.currentUser?.uid);
      console.log('Phone:', auth.currentUser?.phoneNumber);
      console.log('Email:', auth.currentUser?.email);
    } catch (err: any) {
      console.error('Verify error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Wrong OTP. Please check and try again.');
      } else if (err.code === 'auth/session-expired') {
        setError('OTP expired. Request a new one.');
      } else {
        setError(err.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneLogin() {
    if (verificationId) {
      handleVerifyOTP();
    } else {
      handleSendOTP();
    }
  }

  function resetPhoneLogin() {
    setPhone('');
    setOtp('');
    setVerificationId(null);
    setError('');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Image
            source={require('../Images/logo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>KGS Music Academy</Text>
          <Text style={styles.subtitle}>Sign in to track your musical journey</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loginMethod === 'email' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEmailSignIn}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>Or sign in with </Text>
                <TouchableOpacity onPress={() => setLoginMethod('phone')}>
                  <Text style={styles.switchLink}>Phone Number</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {!verificationId ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.inputContainer}>
                      <Phone size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 10-digit number"
                        placeholderTextColor="#94a3b8"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="number-pad"
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                    <Text style={styles.hint}>Auto-added +91 country code</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handlePhoneLogin}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Send OTP</Text>
                        <ArrowRight size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter OTP</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94a3b8"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!loading}
                      />
                    </View>
                    <Text style={styles.hint}>OTP sent to +91{phone.slice(-4)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handlePhoneLogin}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Verify & Sign In</Text>
                        <ArrowRight size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={resetPhoneLogin}
                    disabled={loading}>
                    <Text style={styles.resendText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>Or sign in with </Text>
                <TouchableOpacity onPress={() => { setLoginMethod('email'); resetPhoneLogin(); }}>
                  <Text style={styles.switchLink}>Email</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' && <View id="recaptcha-container" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#64748b',
    fontSize: 14,
  },
  switchLink: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  forgotText: {
    color: '#1e40af',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerLink: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
  },
  resendText: {
    color: '#64748b',
    fontSize: 13,
  },
});
