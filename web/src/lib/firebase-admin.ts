import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

export const getFirebaseAdmin = (): { app: App; auth: Auth } => {
  if (adminApp && adminAuth) {
    return { app: adminApp, auth: adminAuth };
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      'Firebase Admin SDK environment variables missing. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, and FIREBASE_ADMIN_CLIENT_EMAIL'
    );
  }

  try {
    // Check if app already exists
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
    } else {
      adminApp = getApps()[0];
    }

    adminAuth = getAuth(adminApp);
    return { app: adminApp, auth: adminAuth };
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed');
  }
};

export const verifyFirebaseIdToken = async (idToken: string) => {
  try {
    const { auth } = getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Failed to verify Firebase ID token:', error);
    throw new Error('Invalid Firebase ID token');
  }
};
