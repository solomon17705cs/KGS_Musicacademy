import { 
  PhoneAuthProvider, 
  signInWithCredential,
  Auth
} from 'firebase/auth';

const getApiKey = (): string => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Firebase API key not configured');
  }
  return apiKey;
};

export async function sendOTPviaSMS(phoneNumber: string): Promise<string> {
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

export async function verifyOTPandSignIn(
  auth: Auth,
  verificationId: string,
  otp: string
): Promise<void> {
  const credential = PhoneAuthProvider.credential(verificationId, otp);
  await signInWithCredential(auth, credential);
}