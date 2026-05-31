import { PhoneAuthProvider, signInWithCredential, signInWithPhoneNumber, RecaptchaVerifier, Auth } from 'firebase/auth';
import { Platform } from 'react-native';

const getApiKey = (): string => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Firebase API key not configured');
  }
  return apiKey;
};

let confirmationResult: any = null;

export async function sendOTPviaSMS(phoneNumber: string, auth?: Auth): Promise<string> {
  // Mobile: use REST API (silent reCAPTCHA)
  if (Platform.OS !== 'web') {
    const apiKey = getApiKey();
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        recaptchaToken: 'faketoken',
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Failed to send OTP');
    }

    return data.sessionInfo;
  }

  // Web: use RecaptchaVerifier + signInWithPhoneNumber
  if (!auth) {
    throw new Error('Auth instance required for web OTP');
  }

  const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
  });

  const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  confirmationResult = result;
  return result.verificationId;
}

export async function verifyOTPandSignIn(
  auth: Auth,
  verificationId: string,
  otp: string
): Promise<void> {
  if (Platform.OS === 'web' && confirmationResult) {
    await confirmationResult.confirm(otp);
    confirmationResult = null;
    return;
  }

  const credential = PhoneAuthProvider.credential(verificationId, otp);
  await signInWithCredential(auth, credential);
}
