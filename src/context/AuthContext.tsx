// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import { setToken, clearToken } from '../lib/apiAuth';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  role: UserRole;
  isLoading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  logout: () => Promise<void>;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canAccessAdminPortal: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Arabic translations for Firebase Auth error codes
const mapFirebaseAuthError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صالحة، يرجى كتابة بريد إلكتروني صحيح';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب من قبل الإدارة';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة، يرجى الانتظار دقيقة';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بخوادم Firebase، يرجى التحقق من اتصالك بالإنترنت';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد الإلكتروني غير مفعل في Firebase Authentication Console';
    default:
      return 'فشل تسجيل الدخول: يرجى التحقق من صحة البريد وكلمة المرور';
  }
};

/**
 * Fetch user profile and determine role (admin or accountant) strictly from Firestore collection "users"
 */
async function fetchUserProfileFromFirestore(uid: string, email: string): Promise<UserProfile> {
  let docData: any = null;
  let docId = uid;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (db) {
    try {
      // 1. Direct lookup by Firebase Auth UID
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        docData = userSnap.data();
      }

      // 2. If not found, lookup by email as document ID
      if (!docData) {
        const emailDocRef = doc(db, 'users', cleanEmail);
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists()) {
          docData = emailSnap.data();
          docId = emailSnap.id;
        }
      }

      // 3. If still not found, query collection by email field
      if (!docData) {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', cleanEmail));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          docData = querySnap.docs[0].data();
          docId = querySnap.docs[0].id;
        }
      }

      // 4. Query with original email (case sensitive)
      if (!docData && email.trim() !== cleanEmail) {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', email.trim()));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          docData = querySnap.docs[0].data();
          docId = querySnap.docs[0].id;
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Firestore read error:', err);
    }
  }

  // Determine user role strictly from Firestore
  const rawRole = (
    docData?.role ||
    docData?.Role ||
    docData?.userRole ||
    docData?.permission ||
    ''
  ).toString().toUpperCase().trim();

  // If role in Firestore is admin or manager, or if account belongs to system owner
  const isAdmin =
    rawRole === 'ADMIN' ||
    rawRole.includes('ADMIN') ||
    rawRole === 'MANAGER' ||
    cleanEmail === 'ebow2012@gmail.com' ||
    false;

  let role: UserRole = 'ACCOUNTANT';
  if (isAdmin) {
    role = 'ADMIN';
  } else if (
    rawRole === 'EXECUTIVE' ||
    rawRole === 'CASHIER' ||
    rawRole === 'STOREKEEPER' ||
    rawRole === 'AUDITOR' ||
    rawRole === 'ACCOUNTANT'
  ) {
    role = rawRole as UserRole;
  }

  const titleAr =
    docData?.titleAr ||
    (role === 'ADMIN'
      ? 'المدير العام (إشراف ورقابة شاملة)'
      : role === 'EXECUTIVE'
      ? 'إدارة عليا (لوحات مؤشرات ورقابة)'
      : role === 'CASHIER'
      ? 'أمين صندوق ومحصل'
      : role === 'STOREKEEPER'
      ? 'أمين العهد والمستودع'
      : role === 'AUDITOR'
      ? 'مدقق حسابات ومراجع قانوني'
      : 'محاسب مالي معتمد');

  const name =
    docData?.name ||
    (role === 'ADMIN' ? 'المدير العام' : 'المحاسب المالي');

  const permissions = {
    allowedSections: role === 'ADMIN'
      ? ['manager_portal', 'dashboard', 'properties', 'contracts', 'invoices', 'payments', 'expenses', 'accounting', 'inventory', 'reports', 'users', 'audit', 'tests']
      : ['dashboard', 'properties', 'contracts', 'invoices', 'expenses', 'accounting', 'reports'],
    canInput: role !== 'ADMIN',
    canReviewReports: true,
    canPrintDocs: true,
    canIssueReceipts: false,
    canReverseReceipts: false,
    canRecordExpenses: role === 'ACCOUNTANT',
    canCreateJournalEntries: role === 'ACCOUNTANT',
    canManageContracts: role === 'ACCOUNTANT',
    canManageProperties: role === 'ACCOUNTANT',
    canManageInventory: false,
    canClosePeriods: role === 'ADMIN',
    canExportReports: true,
    canManageUsers: role === 'ADMIN',
    ...(docData?.permissions || {})
  };

  const profile: UserProfile = {
    id: docId,
    email: cleanEmail,
    name,
    role,
    titleAr,
    username: docData?.username || cleanEmail.split('@')[0],
    mustChangePasswordOnNextLogin: false,
    isActive: docData?.isActive !== undefined ? docData.isActive : true,
    permissions
  };

  // Sync to Firestore under user.uid so future queries by UID always succeed
  if (db) {
    try {
      await setDoc(doc(db, 'users', uid), {
        ...profile,
        role: role.toLowerCase()
      }, { merge: true });
    } catch (e) {
      console.warn('[AuthContext] Error storing user profile in Firestore:', e);
    }
  }

  return profile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('muhassil_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isFirebaseActive = isFirebaseConfigured() && !!auth && !!db;

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseActive || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        try {
          const profile = await fetchUserProfileFromFirestore(user.uid, user.email);
          setCurrentUser(profile);
          localStorage.setItem('muhassil_current_user', JSON.stringify(profile));
        } catch (err) {
          console.error('[AuthContext] Error syncing user on auth state change:', err);
        }
      } else {
        // If the user is logged in via server/employee credentials, preserve their active session!
        const saved = localStorage.getItem('muhassil_current_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id) {
              setCurrentUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch {}
        }
        setCurrentUser(null);
        localStorage.removeItem('muhassil_current_user');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseActive]);

  // Login via Firebase Auth or Authoritative Server System API
  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    setAuthError(null);
    setIsLoading(true);

    const trimmedId = (identifier || '').trim();
    const trimmedPassword = (password || '').trim();

    if (!trimmedId || !trimmedPassword) {
      const err = 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور';
      setAuthError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    const isEmailFormat = trimmedId.includes('@');

    // 1. If it looks like an email and Firebase Auth is active, attempt Firebase Auth
    if (isEmailFormat && isFirebaseActive && auth) {
      try {
        const credential = await signInWithEmailAndPassword(auth, trimmedId.toLowerCase(), trimmedPassword);
        const user = credential.user;

        // Fetch user document from Firestore collection "users" to determine role
        const profile = await fetchUserProfileFromFirestore(user.uid, user.email || trimmedId);

        setCurrentUser(profile);
        localStorage.setItem('muhassil_current_user', JSON.stringify(profile));

        setIsLoading(false);
        return { success: true, user: profile };
      } catch (err: any) {
        console.warn('[AuthContext] Firebase Auth note, verifying with server system auth:', err?.code || err?.message);
        // Fall through to server authentication below
      }
    }

    // 2. Authoritative System Authentication via Server API (/api/auth/login)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: trimmedPassword })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const userProfile: UserProfile = data.user;
        if (data.token) setToken(data.token);
        setCurrentUser(userProfile);
        localStorage.setItem('muhassil_current_user', JSON.stringify(userProfile));
        setIsLoading(false);
        return { success: true, user: userProfile };
      }

      if (data && data.error) {
        setIsLoading(false);
        setAuthError(data.error);
        return { success: false, error: data.error };
      }
    } catch (serverErr) {
      console.warn('[AuthContext] Server login endpoint unavailable:', serverErr);
    }

    setIsLoading(false);
    const err = 'بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم/البريد وكلمة المرور';
    setAuthError(err);
    return { success: false, error: err };
  };

  // Sign out
  const logout = async () => {
    if (isFirebaseActive && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signout error:', err);
      }
    }
    setCurrentUser(null);
    setFirebaseUser(null);
    clearToken();
    localStorage.removeItem('muhassil_current_user');
  };

  const role = currentUser?.role || 'ACCOUNTANT';
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  const canAccessAdminPortal = currentUser?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        role,
        isLoading,
        isFirebaseActive,
        login,
        logout,
        authError,
        setAuthError,
        hasRole,
        canAccessAdminPortal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
