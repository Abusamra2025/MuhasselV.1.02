// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Read Firebase config from environment variables (Vite import.meta.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if Firebase is properly configured with real credentials
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('YourApiKey')
  );
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.info('[Muhassil Firebase] Initialized successfully with project:', firebaseConfig.projectId);
  } else {
    console.warn(
      '[Muhassil Firebase] Environment variables not configured or invalid. Running in local/demo hybrid mode. Add VITE_FIREBASE_* keys to .env'
    );
  }
} catch (error) {
  console.error('[Muhassil Firebase] Error initializing Firebase SDK:', error);
}

export { app, auth, db };
export default app;
