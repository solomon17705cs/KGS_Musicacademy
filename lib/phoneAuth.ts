import {
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  Auth,
  ConfirmationResult,
} from 'firebase/auth';
import { Platform } from 'react-native';

const getApiKey = (): string => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Firebase API key not configured');
  }
  return apiKey;
};

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

function resetRecaptcha(): void {
  if (typeof window !== 'undefined' && (window as any).grecaptcha) {
    try {
      (window as any).grecaptcha.reset();
    } catch (_) {}
  }
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (_) {}
    recaptchaVerifier = null;
  }
}

function createRecaptchaVerifier(auth: Auth): RecaptchaVerifier {
  resetRecaptcha();
  auth.settings.appVerificationDisabledForTesting = true;
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
  });
  return recaptchaVerifier;
}

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

  // Web: Follow Firebase docs — RecaptchaVerifier + signInWithPhoneNumber
  if (!auth) {
    throw new Error('Auth instance required for web OTP');
  }

  auth.languageCode = 'en';
  const appVerifier = createRecaptchaVerifier(auth);

  try {
    const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    confirmationResult = result;
    return result.verificationId;
  } catch (error: any) {
    resetRecaptcha();
    throw error;
  }
}

export async function verifyOTPandSignIn(
  auth: Auth,
  verificationId: string,
  otp: string
): Promise<void> {
  // Web: use ConfirmationResult.confirm() per Firebase docs
  if (Platform.OS === 'web' && confirmationResult) {
    try {
      await confirmationResult.confirm(otp);
      confirmationResult = null;
      resetRecaptcha();
      return;
    } catch (error: any) {
      resetRecaptcha();
      throw error;
    }
  }

  // Mobile fallback: PhoneAuthProvider.credential + signInWithCredential
  const credential = PhoneAuthProvider.credential(verificationId, otp);
  await signInWithCredential(auth, credential);
}

export function clearRecaptchaVerifier(): void {
  resetRecaptcha();
}
