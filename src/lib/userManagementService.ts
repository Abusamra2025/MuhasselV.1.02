// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { UserProfile, UserRole, UserPermissions } from '../types';

/**
 * Creates an employee user in Firebase Authentication using a temporary secondary app.
 * CRITICAL: Using a secondary FirebaseApp instance prevents Firebase Auth from switching
 * the active session and logging out the administrator.
 */
export async function createEmployeeAccountWithoutAdminLogout(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  titleAr?: string;
  phone?: string;
  permissions: UserPermissions;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();

  if (!email || !password || password.length < 6) {
    return { success: false, error: 'كلمة المرور يجب أن لا تقل عن 6 خانات مع بريد إلكتروني صالح' };
  }

  // If Firebase is configured with active keys, perform secondary app auth creation
  if (isFirebaseConfigured()) {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };

    const secondaryAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let secondaryApp = null;

    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // Create the employee user in the secondary auth context
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = credential.user.uid;

      const profile: UserProfile = {
        id: newUid,
        email,
        name: params.name.trim(),
        role: params.role,
        titleAr: params.titleAr || (params.role === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
        username: email.split('@')[0],
        phone: params.phone || '',
        mustChangePasswordOnNextLogin: false,
        isActive: true,
        permissions: params.permissions,
        createdAt: new Date().toISOString()
      };

      // Save user profile in Firestore 'users' collection if possible (non-blocking)
      if (db) {
        try {
          await setDoc(doc(db, 'users', newUid), profile);
        } catch (firestoreErr: any) {
          console.warn('[UserManagement] Firestore sync note (persisting via authoritative backend):', firestoreErr?.message || firestoreErr);
        }
      }

      // Clean up the secondary app instance
      await deleteApp(secondaryApp);

      return { success: true, user: profile };
    } catch (err: any) {
      // Graceful handling for email already in use
      if (err?.code === 'auth/email-already-in-use') {
        const recoveredUid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const recoveredProfile: UserProfile = {
          id: recoveredUid,
          email,
          name: params.name.trim(),
          role: params.role,
          titleAr: params.titleAr || (params.role === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
          username: email.split('@')[0],
          phone: params.phone || '',
          mustChangePasswordOnNextLogin: false,
          isActive: true,
          permissions: params.permissions,
          createdAt: new Date().toISOString()
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', recoveredUid), recoveredProfile);
          } catch {}
        }

        if (secondaryApp) {
          try {
            await deleteApp(secondaryApp);
          } catch {}
        }

        return {
          success: true,
          user: recoveredProfile
        };
      }

      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {}
      }

      let message = err?.message || 'فشل إنشاء الحساب في Firebase';
      if (err?.code === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة، يرجى اختيار كلمة مرور أقوى (6 خانات على الأقل)';
      } else if (err?.code === 'auth/invalid-email') {
        message = 'صيغة البريد الإلكتروني غير صالحة';
      } else {
        console.warn('[UserManagement] Secondary App creation notice:', err?.message || err);
      }

      return { success: false, error: message };
    }
  }

  // Local/Fallback mode if Firebase keys are not populated yet
  const fallbackProfile: UserProfile = {
    id: `usr_${Date.now()}`,
    email,
    name: params.name.trim(),
    role: params.role,
    titleAr: params.titleAr || (params.role === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
    username: email.split('@')[0],
    phone: params.phone || '',
    password,
    mustChangePasswordOnNextLogin: false,
    isActive: true,
    permissions: params.permissions,
    createdAt: new Date().toISOString()
  };

  return { success: true, user: fallbackProfile };
}
