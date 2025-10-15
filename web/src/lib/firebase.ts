import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence
} from 'firebase/auth';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

const requiredEnvVars: Array<[keyof FirebaseConfig, string]> = [
  ['apiKey', 'NEXT_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'NEXT_PUBLIC_FIREBASE_APP_ID'],
];

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!requiredEnvVars.every(([, env]) => Boolean(process.env[env as keyof NodeJS.ProcessEnv]))) {
    const missing = requiredEnvVars
      .filter(([, env]) => !process.env[env as keyof NodeJS.ProcessEnv])
      .map(([, env]) => env)
      .join(', ');

    throw new Error(`Firebase environment variables missing: ${missing}`);
  }

  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApp();
};

export const getFirebaseAuth = async (): Promise<Auth> => {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  return auth;
};

export const googleAuthProvider = new GoogleAuthProvider();
