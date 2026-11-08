// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Mouhassil Reactive Store & Transactional State Manager
 * Provides ACID transactional guarantees, duplicate prevention,
 * strict double-entry ledger integration, and audit logging.
 */

import { withToken } from './apiAuth';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Account,
  Property,
  Unit,
  Tenant,
  Contract,
  Invoice,
  Payment,
  PropertyExpense,
  JournalEntry,
  UserProfile,
  UserPermissions,
  AuditLog,
  AccountingPeriod,
  FiscalPeriodType,
  PaymentAllocation,
  PaymentMethod,
  PaymentPurpose,
  ExpenseCategory,
  SystemSection,
  InventoryItem,
  InventoryTransaction,
  AssetMaintenanceLog,
  AggregatedDocument,
  FixedAsset,
  UserSession,
  AdminAlertMessage,
  DatabaseBackupRecord,
  BackupSettings,
  SmartAlertItem,
  SystemEnvironmentMode,
  SystemClearDataMode
} from '../types';
import { generateSmartAlerts } from './smartAlertsEngine';
import {
  INITIAL_USERS,
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_PROPERTIES,
  INITIAL_UNITS,
  INITIAL_TENANTS,
  INITIAL_CONTRACTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_ACCOUNTING_PERIODS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVENTORY_TRANSACTIONS,
  INITIAL_AGGREGATED_DOCUMENTS
} from './initialData';
import { validateJournalBalance, ROUND } from './accountingEngine';
import {
  buildAcquisition,
  generateDepreciation,
  validateFixedAssetInput,
  mergeMissingAccounts,
  type FixedAssetInput
} from './fixedAssetsService';
import {
  reconcileUnits,
  validateNewContract,
  validateTermination,
  applyTermination,
  todayISO
} from './propertyService';
import {
  isFirestoreReady,
  subscribeToFirestoreCollection,
  syncSetDoc,
  seedInitialFirestoreData
} from './firestoreSync';
import { auth, isFirebaseConfigured } from './firebase';
import { generateTempPassword } from './passwordUtils';
import { signOut } from 'firebase/auth';

const STORAGE_KEY = 'mouhassil_v2_system_state';

/**
 * ترحيل أي حالة قادمة من localStorage أو الخادم:
 *  - يضمن وجود fixedAssets.
 *  - يضيف حسابات الأصول الثابتة الناقصة إلى الشجرة القديمة دون المساس بالموجود.
 *  - يحذف أي كلمات مرور قديمة بنص صريح بقيت في المتصفح.
 */
function normalizeClientState<T extends Partial<StoreState>>(incoming: T): T {
  const next: any = { ...incoming };
  if (!Array.isArray(next.fixedAssets)) next.fixedAssets = [];
  if (Array.isArray(next.accounts)) {
    next.accounts = mergeMissingAccounts(next.accounts, INITIAL_CHART_OF_ACCOUNTS);
  }
  if (Array.isArray(next.users)) {
    next.users = next.users.map((u: any) => {
      const { password: _p, ...rest } = u || {};
      return rest;
    });
  }
  if (next.currentUser) {
    const { password: _p, ...rest } = next.currentUser;
    next.currentUser = rest;
  }
  return next as T;
}

interface StoreState {
  currentUser: UserProfile;
  users: UserProfile[];
  accounts: Account[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  contracts: Contract[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: PropertyExpense[];
  journalEntries: JournalEntry[];
  periods: AccountingPeriod[];
  auditLogs: AuditLog[];
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  aggregatedDocuments: AggregatedDocument[];
  fixedAssets: FixedAsset[];
  systemMode?: SystemEnvironmentMode;
}

interface StoreContextType extends StoreState {
  setCurrentUser: (user: UserProfile) => void;
  resetToDefaultData: () => void;
  clearSystemData: (params: {
    mode: SystemClearDataMode;
    adminPassword: string;
  }) => Promise<{ success: boolean; error?: string; systemMode?: SystemEnvironmentMode }>;
  
  // Payment operations
  recordPayment: (params: {
    tenantId: string;
    contractId?: string;
    purpose: PaymentPurpose;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    destinationAccountCode: string;
    checkNumber?: string;
    bankReference?: string;
    notes?: string;
    allocations?: PaymentAllocation[];
    idempotencyKey?: string;
  }) => { success: boolean; payment?: Payment; error?: string };

  reversePayment: (params: {
    paymentId: string;
    reason: string;
  }) => { success: boolean; error?: string };

  // Expense operations
  recordExpense: (params: {
    propertyId: string;
    unitId?: string;
    category: ExpenseCategory;
    expenseAccountCode: string;
    paymentAccountCode: string;
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
    payee: string;
    description: string;
  }) => { success: boolean; expense?: PropertyExpense; error?: string };

  // Invoice & Contract operations
  generateContractInvoice: (params: {
    contractId: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
  }) => { success: boolean; invoice?: Invoice; error?: string };

  generateRecurringInvoicesBatch: (params: {
    targetMonth: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    contractIds?: string[];
  }) => {
    success: boolean;
    generatedCount: number;
    skippedCount: number;
    totalAmount: number;
    invoices: Invoice[];
    errors: string[];
    error?: string;
  };

  createContract: (contract: Omit<Contract, 'id' | 'createdAt'>) => {
    success: boolean;
    contract?: Contract;
    error?: string;
  };

  terminateContract: (contractId: string, params: { date: string; reason?: string }) => {
    success: boolean;
    contract?: Contract;
    error?: string;
  };

  // Fixed assets (الأصول الثابتة)
  createFixedAsset: (input: FixedAssetInput) => {
    success: boolean;
    asset?: FixedAsset;
    entry?: JournalEntry;
    error?: string;
  };

  postDepreciation: (throughMonth: string) => {
    success: boolean;
    postedCount: number;
    totalAmount: number;
    blockedMonth?: string;
    error?: string;
  };

  createProperty: (prop: Omit<Property, 'id' | 'createdAt'>) => {
    success: boolean;
    property?: Property;
    error?: string;
  };

  createUnit: (unit: Omit<Unit, 'id'>) => {
    success: boolean;
    unit?: Unit;
    error?: string;
  };

  createTenant: (tenant: Omit<Tenant, 'id' | 'createdAt' | 'balance' | 'securityDepositHeld'>) => {
    success: boolean;
    tenant?: Tenant;
  };

  // Accounting operations
  createManualJournalEntry: (params: {
    date: string;
    description: string;
    lines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      propertyId?: string;
    }>;
  }) => { success: boolean; entry?: JournalEntry; error?: string };

  // Fiscal Period operations
  createFiscalPeriod: (params: {
    name: string;
    fiscalYear: number;
    periodType: FiscalPeriodType;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => { success: boolean; period?: AccountingPeriod; error?: string };

  updateFiscalPeriod: (periodId: string, params: {
    name: string;
    fiscalYear: number;
    periodType: FiscalPeriodType;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => { success: boolean; error?: string };

  closeAccountingPeriod: (periodId: string, reason?: string) => {
    success: boolean;
    error?: string;
  };

  reopenAccountingPeriod: (periodId: string, reason: string) => {
    success: boolean;
    error?: string;
  };

  deleteFiscalPeriod: (periodId: string) => {
    success: boolean;
    error?: string;
  };

  checkDatePostingStatus: (dateStr: string) => {
    allowed: boolean;
    matchingPeriod?: AccountingPeriod;
    message: string;
  };
  isPeriodClosedForDate: (dateStr: string) => boolean;
  getClosedPeriodForDate: (dateStr: string) => AccountingPeriod | undefined;

  // Supervisory Role & Permissions Check
  canUserPerform: (permission: Exclude<keyof UserPermissions, 'allowedSections'>) => boolean;
  isSectionAllowed: (section: SystemSection) => boolean;
  isSupervisoryOnly: boolean;

  // Inventory & Warehouse Operations
  recordInventoryTransaction: (params: {
    type: 'INBOUND' | 'OUTBOUND' | 'CUSTODY_ASSIGN';
    itemId: string;
    quantity: number;
    propertyId?: string;
    recipientName: string;
    notes?: string;
    date?: string;
  }) => { success: boolean; transaction?: InventoryTransaction; error?: string };

  addAssetMaintenanceLog: (itemId: string, log: Omit<AssetMaintenanceLog, 'id'>, nextMaintenanceDate?: string) => {
    success: boolean;
    error?: string;
    log?: AssetMaintenanceLog;
  };

  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => {
    success: boolean;
    error?: string;
  };

  // User & Password Management
  createUser: (userData: Omit<UserProfile, 'id'>) => UserProfile;
  updateUser: (userId: string, updates: Partial<UserProfile>) => void;
  resetUserInitialPassword: (userId: string, tempPassword?: string) => string;
  changeUserPassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => void;

  // Authentication & Session
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  loginUser: (usernameOrEmail: string, password: string) => { success: boolean; user?: UserProfile; error?: string };
  logoutUser: () => void;

  // Real-Time Online Sessions Surveillance & Administrative Controls
  activeSessions: UserSession[];
  currentSessionId: string | null;
  activeAlert: AdminAlertMessage | null;
  kickNotice: string | null;
  clearKickNotice: () => void;
  dismissAlert: () => void;
  reportActiveWindow: (windowName: string) => void;
  forceDisconnectSession: (sessionId: string, targetUserId?: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  sendAdminAlert: (params: { targetUserId?: string | null; targetUserName?: string; message: string; urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL' }) => Promise<{ success: boolean }>;
  toggleUserActiveStatus: (userId: string) => Promise<void>;
  updateUserPermissionsLive: (userId: string, permissions: Partial<UserPermissions>) => Promise<void>;

  // Real-Time Client-Server State
  isServerConnected: boolean;
  onlineCount: number;
  lastSyncMessage: string | null;

  // Database Backup & Disaster Recovery
  backups: DatabaseBackupRecord[];
  backupSettings: BackupSettings | null;
  isBackupLoading: boolean;
  refreshBackups: () => Promise<void>;
  createInstantBackup: (notes?: string) => Promise<{ success: boolean; error?: string; backup?: DatabaseBackupRecord }>;
  restoreDatabaseBackup: (backupId: string) => Promise<{ success: boolean; error?: string }>;
  updateBackupSettings: (newSettings: Partial<BackupSettings>) => Promise<{ success: boolean; error?: string }>;
  deleteBackup: (backupId: string) => Promise<{ success: boolean; error?: string }>;
  uploadAndRestoreBackup: (backupData: any, restoreImmediately?: boolean) => Promise<{ success: boolean; error?: string }>;

  // Smart Alerts & Intelligence
  smartAlerts: SmartAlertItem[];
  dismissSmartAlert: (alertId: string) => void;
  dismissedAlertIds: string[];
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);

  // تاريخ اليوم (يُحدَّث تلقائيًا عند منتصف الليل) لاشتقاق حالة الوحدات من العقود
  const [today, setToday] = useState<string>(() => todayISO());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = todayISO();
      setToday(prev => (prev === now ? prev : now));
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Sessions and live surveillance state
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('mouhassil_session_id');
    } catch {
      return null;
    }
  });
  const [activeAlert, setActiveAlert] = useState<AdminAlertMessage | null>(null);
  const [kickNotice, setKickNotice] = useState<string | null>(null);
  const [activeWindowName, setActiveWindowName] = useState<string>('نافذة النظام');

  // Database Backup & Disaster Recovery State
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [isBackupLoading, setIsBackupLoading] = useState<boolean>(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('mouhassil_dismissed_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [state, setState] = useState<StoreState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored state contains old mock properties or mock invoices, purge it immediately
        const hasLegacyMock = parsed && (
          (Array.isArray(parsed.properties) && parsed.properties.some((p: any) => p.id?.includes('andalus') || p.id?.includes('nakheel'))) ||
          (Array.isArray(parsed.invoices) && parsed.invoices.some((i: any) => i.id?.includes('inv_01')))
        );

        if (hasLegacyMock) {
          localStorage.removeItem(STORAGE_KEY);
        } else if (parsed && parsed.accounts) {
          return normalizeClientState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load stored state', e);
    }

    return {
      currentUser: INITIAL_USERS[0],
      users: INITIAL_USERS,
      accounts: INITIAL_CHART_OF_ACCOUNTS,
      properties: INITIAL_PROPERTIES,
      units: INITIAL_UNITS,
      tenants: INITIAL_TENANTS,
      contracts: INITIAL_CONTRACTS,
      invoices: INITIAL_INVOICES,
      payments: INITIAL_PAYMENTS,
      expenses: INITIAL_EXPENSES,
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      periods: INITIAL_ACCOUNTING_PERIODS,
      inventoryItems: INITIAL_INVENTORY_ITEMS,
      inventoryTransactions: INITIAL_INVENTORY_TRANSACTIONS,
      aggregatedDocuments: INITIAL_AGGREGATED_DOCUMENTS,
      fixedAssets: [],
      systemMode: 'DEMO',
      auditLogs: [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          actorName: 'النظام',
          actorRole: 'ADMIN',
          action: 'تهيئة النظام وقاعدة البيانات المحاسبية',
          entity: 'System',
          entityId: 'SYS_01',
          details: 'تم تحميل دليل الحسابات القياسي والبيانات الافتتاحية بنجاح'
        }
      ]
    };
  });

  // 1. Initial State Fetch from Server
  useEffect(() => {
    fetch('/api/state')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Server not ready');
      })
      .then(serverState => {
        if (serverState && Array.isArray(serverState.accounts)) {
          setState(prev => {
            // مزامنة المستخدم الحالي مع الخادم (حتى لا تبقى نسخة قديمة تطلب تغيير كلمة المرور من جديد)
            const serverCur = serverState.users?.find((u: any) => u.id === prev.currentUser?.id);
            return {
              ...normalizeClientState(serverState),
              currentUser: serverCur || prev.currentUser
            };
          });
          if (Array.isArray(serverState.users)) {
            try {
              localStorage.setItem('mouhassil_users_cache', JSON.stringify(serverState.users));
            } catch {}
          }
          setIsServerConnected(true);
        }
      })
      .catch(() => {
        // Fallback to local storage
      });
  }, [state.currentUser?.id]);

  // 2. Real-Time Server-Sent Events (SSE) Listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const queryParams = new URLSearchParams();
        if (state.currentUser?.id) queryParams.set('userId', state.currentUser.id);
        if (currentSessionId) queryParams.set('sessionId', currentSessionId);
        
        const url = `/api/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        eventSource = new EventSource(withToken(url));

        eventSource.onopen = () => {
          setIsServerConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
              setIsServerConnected(true);
              if (data.onlineCount) setOnlineCount(data.onlineCount);
              if (Array.isArray(data.sessions)) setActiveSessions(data.sessions);
            } else if (data.type === 'ONLINE_SESSIONS_UPDATE') {
              if (Array.isArray(data.sessions)) setActiveSessions(data.sessions);
              if (data.onlineCount) setOnlineCount(data.onlineCount);
            } else if (data.type === 'SESSION_KICKED') {
              // Check if current user is the one kicked
              if (
                data.targetUserId === state.currentUser?.id ||
                (data.sessionId && data.sessionId === currentSessionId) ||
                data.targetUserId === 'ALL'
              ) {
                setIsLoggedIn(false);
                setKickNotice(data.reason || 'تم إنهاء جلستك من قِبل المدير العام لدواعي رقابية');
                setCurrentSessionId(null);
                try {
                  sessionStorage.removeItem('mouhassil_session_id');
                } catch {}
              }
            } else if (data.type === 'ADMIN_ALERT') {
              if (
                !data.alert?.targetUserId ||
                data.alert?.targetUserId === state.currentUser?.id
              ) {
                setActiveAlert(data.alert);
              }
            } else if (data.type === 'STATE_UPDATE' && data.state) {
              setIsServerConnected(true);
              setState(prev => {
                // If current user was updated on server, sync permissions & status
                const updatedCur = data.state.users?.find((u: any) => u.id === prev.currentUser?.id);
                return {
                  ...normalizeClientState(data.state),
                  currentUser: updatedCur || prev.currentUser
                };
              });
              if (data.summary) {
                setLastSyncMessage(data.summary);
                setTimeout(() => setLastSyncMessage(null), 6000);
              }
            }
          } catch (e) {
            console.error('Error parsing SSE event', e);
          }
        };

        eventSource.onerror = () => {
          setIsServerConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        setIsServerConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [state.currentUser?.id, currentSessionId]);

  // 3. Heartbeat presence & navigation reporting
  useEffect(() => {
    if (!isLoggedIn || !currentSessionId) return;

    // Initial ping
    fetch('/api/sessions/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        userId: state.currentUser.id,
        currentWindow: activeWindowName
      })
    }).catch(() => {});

    // Periodic heartbeat every 20 seconds
    const interval = setInterval(() => {
      fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userId: state.currentUser.id,
          currentWindow: activeWindowName
        })
      }).catch(() => {});
    }, 20000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentSessionId, state.currentUser.id, activeWindowName]);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [state]);

  // Real-time Firestore synchronization using onSnapshot
  useEffect(() => {
    if (!isFirestoreReady()) {
      return;
    }

    // Seed database if newly connected Firestore has no records
    seedInitialFirestoreData({
      properties: state.properties,
      units: state.units,
      tenants: state.tenants,
      contracts: state.contracts,
      invoices: state.invoices,
      expenses: state.expenses,
      payments: state.payments,
      journalEntries: state.journalEntries,
      accounts: state.accounts,
      inventoryItems: state.inventoryItems
    });

    // 1. Subscribe to Expenses (سندات الصرف) in real-time
    const unsubExpenses = subscribeToFirestoreCollection<PropertyExpense>(
      'expenses',
      (expenses) => {
        if (expenses && expenses.length > 0) {
          setState(prev => ({ ...prev, expenses }));
        }
      }
    );

    // 2. Subscribe to Properties (العقارات)
    const unsubProperties = subscribeToFirestoreCollection<Property>(
      'properties',
      (properties) => {
        if (properties && properties.length > 0) {
          setState(prev => ({ ...prev, properties }));
        }
      }
    );

    // 3. Subscribe to Contracts (عقود الإيجار)
    const unsubContracts = subscribeToFirestoreCollection<Contract>(
      'contracts',
      (contracts) => {
        if (contracts && contracts.length > 0) {
          setState(prev => ({ ...prev, contracts }));
        }
      }
    );

    // 4. Subscribe to Payments (سندات القبض)
    const unsubPayments = subscribeToFirestoreCollection<Payment>(
      'payments',
      (payments) => {
        if (payments && payments.length > 0) {
          setState(prev => ({ ...prev, payments }));
        }
      }
    );

    // 5. Subscribe to Invoices (الفواتير)
    const unsubInvoices = subscribeToFirestoreCollection<Invoice>(
      'invoices',
      (invoices) => {
        if (invoices && invoices.length > 0) {
          setState(prev => ({ ...prev, invoices }));
        }
      }
    );

    // 6. Subscribe to Journal Entries (قيود اليومية)
    const unsubJournals = subscribeToFirestoreCollection<JournalEntry>(
      'journalEntries',
      (journalEntries) => {
        if (journalEntries && journalEntries.length > 0) {
          setState(prev => ({ ...prev, journalEntries }));
        }
      }
    );

    // 7. Subscribe to Users (المستخدمين والصلاحيات)
    const unsubUsers = subscribeToFirestoreCollection<UserProfile>(
      'users',
      (firestoreUsers) => {
        if (firestoreUsers && firestoreUsers.length > 0) {
          setState(prev => ({ ...prev, users: firestoreUsers }));
        }
      }
    );

    return () => {
      unsubExpenses?.();
      unsubProperties?.();
      unsubContracts?.();
      unsubPayments?.();
      unsubInvoices?.();
      unsubJournals?.();
      unsubUsers?.();
    };
  }, []);

  const addAuditLog = (action: string, entity: string, entityId: string, details: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: state.currentUser.name,
      actorRole: state.currentUser.role,
      action,
      entity,
      entityId,
      details
    };
    return newLog;
  };

  const apiPost = (url: string, body: any) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        actorName: state.currentUser.name,
        actorRole: state.currentUser.role
      })
    }).catch(err => {
      console.warn('API sync warning:', url, err);
    });
  };

  const apiPut = (url: string, body: any) => {
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        actorName: state.currentUser.name,
        actorRole: state.currentUser.role
      })
    }).catch(err => {
      console.warn('API sync warning:', url, err);
    });
  };

  const apiDelete = (url: string, body: any = {}) => {
    fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        actorName: state.currentUser.name,
        actorRole: state.currentUser.role
      })
    }).catch(err => {
      console.warn('API sync warning:', url, err);
    });
  };

  // ==========================================
  // Database Backup Operations & State Sync
  // ==========================================
  const refreshBackups = useCallback(async () => {
    setIsBackupLoading(true);
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
        setBackupSettings(data.settings || null);
      }
    } catch (e) {
      console.warn('Failed to fetch backups:', e);
    } finally {
      setIsBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBackups();
  }, [refreshBackups]);

  const createInstantBackup = useCallback(async (notes?: string) => {
    setIsBackupLoading(true);
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });
      const data = await res.json();
      if (data.success && data.backup) {
        setBackups(prev => [data.backup, ...prev]);
        await refreshBackups();
        return { success: true, backup: data.backup };
      }
      return { success: false, error: data.error || 'فشل إنشاء النسخة الاحتياطية' };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ في الاتصال بالخادم' };
    } finally {
      setIsBackupLoading(false);
    }
  }, [state.currentUser.name, state.currentUser.role, refreshBackups]);

  const restoreDatabaseBackup = useCallback(async (backupId: string) => {
    setIsBackupLoading(true);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId,
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });
      const data = await res.json();
      if (data.success) {
        await refreshBackups();
        return { success: true };
      }
      return { success: false, error: data.error || 'فشل استعادة النسخة الاحتياطية' };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ في الاتصال بالخادم' };
    } finally {
      setIsBackupLoading(false);
    }
  }, [state.currentUser.name, state.currentUser.role, refreshBackups]);

  const updateBackupSettings = useCallback(async (newSettings: Partial<BackupSettings>) => {
    try {
      const res = await fetch('/api/backups/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setBackupSettings(data.settings);
        return { success: true };
      }
      return { success: false, error: data.error || 'فشل تحديث الإعدادات' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteBackup = useCallback(async (backupId: string) => {
    try {
      const res = await fetch(`/api/backups/${backupId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBackups(prev => prev.filter(b => b.id !== backupId));
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const uploadAndRestoreBackup = useCallback(async (backupData: any, restoreImmediately = false) => {
    setIsBackupLoading(true);
    try {
      const res = await fetch('/api/backups/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData,
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role,
          restoreImmediately
        })
      });
      const data = await res.json();
      if (data.success) {
        await refreshBackups();
        return { success: true };
      }
      return { success: false, error: data.error || 'فشل معالجة ملف النسخة' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsBackupLoading(false);
    }
  }, [state.currentUser.name, state.currentUser.role, refreshBackups]);

  // ==========================================
  // Smart Alerts Dynamic Computation
  // ==========================================
  const dismissSmartAlert = useCallback((alertId: string) => {
    setDismissedAlertIds(prev => {
      const updated = [...prev, alertId];
      try {
        localStorage.setItem('mouhassil_dismissed_alerts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const smartAlerts = useMemo(() => {
    const rawAlerts = generateSmartAlerts({
      contracts: state.contracts,
      invoices: state.invoices,
      payments: state.payments,
      expenses: state.expenses,
      tenants: state.tenants,
      properties: state.properties,
      units: reconcileUnits(state.units, state.contracts, today),
      accounts: state.accounts,
      periods: state.periods,
      users: state.users,
      journalEntries: state.journalEntries,
      backupSettings,
      lastBackup: backups[0] || null
    });
    return rawAlerts.filter(a => !dismissedAlertIds.includes(a.id));
  }, [
    today,
    state.contracts,
    state.invoices,
    state.payments,
    state.expenses,
    state.tenants,
    state.properties,
    state.units,
    state.accounts,
    state.periods,
    state.users,
    state.journalEntries,
    backupSettings,
    backups,
    dismissedAlertIds
  ]);

  const getClosedPeriodForDate = useCallback((dateStr: string): AccountingPeriod | undefined => {
    return state.periods.find(p => p.isClosed && dateStr >= p.startDate && dateStr <= p.endDate);
  }, [state.periods]);

  const isPeriodClosedForDate = useCallback((dateStr: string): boolean => {
    return !!getClosedPeriodForDate(dateStr);
  }, [getClosedPeriodForDate]);

  const checkDatePostingStatus = useCallback((dateStr: string): {
    allowed: boolean;
    matchingPeriod?: AccountingPeriod;
    message: string;
  } => {
    if (!dateStr) {
      return { allowed: false, message: 'يرجى إدخال تاريخ صحيح للتحقق منه' };
    }
    const closedPeriod = state.periods.find(p => p.isClosed && dateStr >= p.startDate && dateStr <= p.endDate);
    if (closedPeriod) {
      return {
        allowed: false,
        matchingPeriod: closedPeriod,
        message: `حظر الترحيل: التاريخ (${dateStr}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name}: من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}). يُحظر الترحيل والتعديل بأثر رجعي منعاً للتلاعب في الحسابات الختامية.`
      };
    }

    const openPeriod = state.periods.find(p => !p.isClosed && dateStr >= p.startDate && dateStr <= p.endDate);
    if (openPeriod) {
      return {
        allowed: true,
        matchingPeriod: openPeriod,
        message: `مسموح بالترحيل: التاريخ يقع ضمن الفترة المحاسبية النشطة والمفتوحة (${openPeriod.name}: من ${openPeriod.startDate} إلى ${openPeriod.endDate}).`
      };
    }

    return {
      allowed: true,
      message: `مسموح بالترحيل: التاريخ (${dateStr}) لا يقع ضمن أي فترة مقفلة حالياً. يُوصى بتعريف فترة مالية رسمية مطابقة.`
    };
  }, [state.periods]);

  const setCurrentUser = useCallback((user: UserProfile) => {
    setState(prev => ({ ...prev, currentUser: user }));
  }, []);

  const resetToDefaultData = useCallback(() => {
    const freshState: StoreState = {
      currentUser: INITIAL_USERS[0],
      users: INITIAL_USERS,
      accounts: INITIAL_CHART_OF_ACCOUNTS,
      properties: INITIAL_PROPERTIES,
      units: INITIAL_UNITS,
      tenants: INITIAL_TENANTS,
      contracts: INITIAL_CONTRACTS,
      invoices: INITIAL_INVOICES,
      payments: INITIAL_PAYMENTS,
      expenses: INITIAL_EXPENSES,
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      periods: INITIAL_ACCOUNTING_PERIODS,
      inventoryItems: INITIAL_INVENTORY_ITEMS,
      inventoryTransactions: INITIAL_INVENTORY_TRANSACTIONS,
      aggregatedDocuments: INITIAL_AGGREGATED_DOCUMENTS,
      fixedAssets: [],
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorName: 'المدير العام',
          actorRole: 'ADMIN',
          action: 'إعادة تهيئة النظام وتنظيف بيانات الاختبار',
          entity: 'System',
          entityId: 'SYS_RESET',
          details: 'تم تعيين بيانات المدير العام (admin) وتفريغ الموظفين ليتم إنشاؤهم من قبل المدير'
        }
      ]
    };
    setState(freshState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    apiPost('/api/reset', {});
  }, []);

  // Secure Clear Data & Environment Toggle (بكلمة سر المدير العام)
  const clearSystemData = useCallback(async (params: {
    mode: SystemClearDataMode;
    adminPassword: string;
  }): Promise<{ success: boolean; error?: string; systemMode?: SystemEnvironmentMode }> => {
    try {
      const res = await fetch('/api/system/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: params.mode,
          adminPassword: params.adminPassword,
          actorName: state.currentUser?.name || 'المدير العام',
          actorRole: state.currentUser?.role || 'ADMIN'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'فشل تنفيذ عملية تصفير البيانات' };
      }

      if (data.state) {
        const normalized = normalizeClientState(data.state);
        setState(prev => ({
          ...normalized,
          currentUser: prev.currentUser
        }));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {}
      }

      await refreshBackups();
      return { success: true, systemMode: data.systemMode };
    } catch (err: any) {
      // لا يوجد تحقق محلي من كلمة المرور: الخادم وحده يملك الصلاحية لتصفير البيانات حمايةً للسجلات المحاسبية
      return {
        success: false,
        error: 'تعذّر الاتصال بالخادم. لا يمكن تنفيذ تصفير البيانات إلا من خلال الخادم للتحقق من كلمة مرور المدير العام.'
      };
    }
  }, [state.currentUser, state.users, refreshBackups, resetToDefaultData]);

  // 1. RECORD PAYMENT TRANSACTION
  const recordPayment = useCallback((params: {
    tenantId: string;
    contractId?: string;
    purpose: PaymentPurpose;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    destinationAccountCode: string;
    checkNumber?: string;
    bankReference?: string;
    notes?: string;
    allocations?: PaymentAllocation[];
    idempotencyKey?: string;
  }) => {
    if (params.amount <= 0) {
      return { success: false, error: 'يجب أن يكون مبلغ السند أكبر من صفر' };
    }

    const closedPeriod = getClosedPeriodForDate(params.paymentDate);
    if (closedPeriod) {
      return {
        success: false,
        error: `حظر الترحيل: التاريخ (${params.paymentDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name} من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}) لمنع التعديل بأثر رجعي`
      };
    }

    // DUPLICATE PREVENTION: Idempotency Key check
    if (params.idempotencyKey) {
      const existing = state.payments.find(p => p.idempotencyKey === params.idempotencyKey);
      if (existing) {
        return {
          success: false,
          error: `تم رفض المعاملة: السند مكرر بنفس مفتاح العملية (${existing.receiptNumber})`
        };
      }
    }

    // DUPLICATE CHECK: Recent identical payment check (same tenant, amount, date)
    const duplicate = state.payments.find(
      p => p.tenantId === params.tenantId &&
           p.amount === params.amount &&
           p.paymentDate === params.paymentDate &&
           p.status === 'POSTED' &&
           p.purpose === params.purpose &&
           Math.abs(Date.now() - new Date(p.createdAt).getTime()) < 30000 // 30 sec guard
    );
    if (duplicate) {
      return {
        success: false,
        error: `تحذير منع التكرار: تم تسجيل دفعة مطابقة قبل قليل برقم (${duplicate.receiptNumber})`
      };
    }

    const tenant = state.tenants.find(t => t.id === params.tenantId);
    if (!tenant) {
      return { success: false, error: 'المستأجر غير موجود في النظام' };
    }

    const nextReceiptNum = `REC-2026-${String(state.payments.length + 1).padStart(4, '0')}`;
    const nextJvNum = `JV-2026-${String(state.journalEntries.length + 1).padStart(4, '0')}`;
    const paymentId = `pay_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    let contract = state.contracts.find(c => c.id === params.contractId);
    if (!contract && params.tenantId) {
      contract = state.contracts.find(c => c.tenantId === params.tenantId && c.status === 'ACTIVE');
    }

    const updatedInvoices = [...state.invoices];
    const allocations: PaymentAllocation[] = [];
    let remainingAmountToAllocate = params.amount;

    if (params.purpose === 'RENT_INVOICE') {
      if (params.allocations && params.allocations.length > 0) {
        // Explicit allocation
        for (const alloc of params.allocations) {
          const invIndex = updatedInvoices.findIndex(i => i.id === alloc.invoiceId);
          if (invIndex >= 0) {
            const inv = updatedInvoices[invIndex];
            if (alloc.amount > inv.balance) {
              return {
                success: false,
                error: `مبلغ التخصيص (${alloc.amount}) يتجاوز المتبقي على الفاتورة (${inv.balance})`
              };
            }
            const newPaid = ROUND(inv.paidAmount + alloc.amount);
            const newBal = ROUND(inv.amount - newPaid);
            updatedInvoices[invIndex] = {
              ...inv,
              paidAmount: newPaid,
              balance: newBal,
              status: newBal === 0 ? 'PAID' : 'PARTIAL'
            };
            allocations.push({ invoiceId: inv.id, amount: alloc.amount });
            remainingAmountToAllocate = ROUND(remainingAmountToAllocate - alloc.amount);
          }
        }
      } else {
        // Automatic allocation to oldest unpaid invoices of this tenant
        const openInvoices = updatedInvoices
          .filter(i => i.tenantId === params.tenantId && i.balance > 0)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        for (const inv of openInvoices) {
          if (remainingAmountToAllocate <= 0) break;
          const allocAmount = Math.min(remainingAmountToAllocate, inv.balance);
          const invIndex = updatedInvoices.findIndex(i => i.id === inv.id);
          const newPaid = ROUND(inv.paidAmount + allocAmount);
          const newBal = ROUND(inv.amount - newPaid);
          updatedInvoices[invIndex] = {
            ...inv,
            paidAmount: newPaid,
            balance: newBal,
            status: newBal === 0 ? 'PAID' : 'PARTIAL'
          };
          allocations.push({ invoiceId: inv.id, amount: allocAmount });
          remainingAmountToAllocate = ROUND(remainingAmountToAllocate - allocAmount);
        }
      }
    }

    // Determine target credit account
    let creditAccountCode = '1130'; // مدينو الإيجارات (افتراضي)
    let creditAccountName = 'مدينو الإيجارات (ذمم المستأجرين)';
    if (params.purpose === 'SECURITY_DEPOSIT') {
      creditAccountCode = '2110';
      creditAccountName = 'تأمينات المستأجرين المستردة';
    } else if (params.purpose === 'ADVANCE_RENT' || remainingAmountToAllocate > 0) {
      // Any excess is Unearned Rental Income!
      creditAccountCode = '2120';
      creditAccountName = 'إيرادات إيجار مقبوضة مقدماً';
    }

    const destAccount = state.accounts.find(a => a.code === params.destinationAccountCode) || state.accounts[2];

    // ATOMIC BALANCED JOURNAL ENTRY
    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date: params.paymentDate,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: params.purpose === 'SECURITY_DEPOSIT' ? 'SECURITY_DEPOSIT' : 'PAYMENT',
      refId: paymentId,
      description: `سند قبض ${nextReceiptNum} - ${params.notes || 'تحصيل من المستأجر ' + tenant.name}`,
      lines: [
        {
          id: `jl_${Date.now()}_dr`,
          accountCode: destAccount.code,
          accountName: destAccount.nameAr,
          debit: params.amount,
          credit: 0,
          description: `إيداع في ${destAccount.nameAr} من ${tenant.name}`
        },
        {
          id: `jl_${Date.now()}_cr`,
          accountCode: creditAccountCode,
          accountName: creditAccountName,
          debit: 0,
          credit: params.amount,
          description: `تسوية حساب ${tenant.name}`,
          propertyId: contract?.propertyId,
          unitId: contract?.unitId,
          tenantId: tenant.id
        }
      ],
      totalDebit: params.amount,
      totalCredit: params.amount,
      isBalanced: true,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const newPayment: Payment = {
      id: paymentId,
      receiptNumber: nextReceiptNum,
      contractId: contract?.id,
      tenantId: params.tenantId,
      propertyId: contract?.propertyId,
      unitId: contract?.unitId,
      purpose: params.purpose,
      amount: params.amount,
      paymentDate: params.paymentDate,
      paymentMethod: params.paymentMethod,
      destinationAccountCode: params.destinationAccountCode,
      checkNumber: params.checkNumber,
      bankReference: params.bankReference,
      receivedBy: state.currentUser.name,
      status: 'POSTED',
      notes: params.notes,
      journalEntryId: jvId,
      allocations,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    // Update Tenant Balance & Security Deposit
    const updatedTenants = state.tenants.map(t => {
      if (t.id === params.tenantId) {
        if (params.purpose === 'SECURITY_DEPOSIT') {
          return {
            ...t,
            securityDepositHeld: ROUND(t.securityDepositHeld + params.amount)
          };
        } else {
          return {
            ...t,
            balance: ROUND(t.balance - params.amount)
          };
        }
      }
      return t;
    });

    const auditLog = addAuditLog(
      'سند قبض وترحيل محاسبي',
      'Payment',
      nextReceiptNum,
      `تم استلام مبلغ ${params.amount} ر.س من ${tenant.name} بطريقة ${params.paymentMethod} وترحيل القيد ${nextJvNum}`
    );

    setState(prev => ({
      ...prev,
      payments: [newPayment, ...prev.payments],
      invoices: updatedInvoices,
      tenants: updatedTenants,
      journalEntries: [newJournalEntry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/payments', params);
    syncSetDoc('payments', newPayment.id, newPayment);
    syncSetDoc('journalEntries', newJournalEntry.id, newJournalEntry);
    for (const inv of updatedInvoices) {
      syncSetDoc('invoices', inv.id, inv);
    }

    return { success: true, payment: newPayment };
  }, [state, isPeriodClosedForDate]);

  // 2. REVERSE PAYMENT (إلغاء وعكس سند قبض)
  const reversePayment = useCallback((params: {
    paymentId: string;
    reason: string;
  }) => {
    const payment = state.payments.find(p => p.id === params.paymentId);
    if (!payment) return { success: false, error: 'سند القبض غير موجود' };
    if (payment.status === 'REVERSED') return { success: false, error: 'السند معكوس بالفعل' };

    // RBAC: Cashier cannot reverse!
    if (state.currentUser.role === 'CASHIER' || state.currentUser.role === 'AUDITOR') {
      return { success: false, error: 'غير مصرح: إلغاء وعكس السندات يتطلب صلاحية محاسب مالي أو مدير النظام' };
    }

    const closedPeriod = getClosedPeriodForDate(payment.paymentDate);
    if (closedPeriod) {
      return {
        success: false,
        error: `حظر الإلغاء: التاريخ (${payment.paymentDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name} من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}) لمنع التعديل بأثر رجعي`
      };
    }

    const tenant = state.tenants.find(t => t.id === payment.tenantId);
    const nextJvNum = `JV-2026-${String(state.journalEntries.length + 1).padStart(4, '0')}`;
    const reversalJvId = `jv_rev_${Date.now()}`;

    // Restore invoices
    const updatedInvoices = state.invoices.map(inv => {
      const alloc = payment.allocations.find(a => a.invoiceId === inv.id);
      if (alloc) {
        const newPaid = Math.max(0, ROUND(inv.paidAmount - alloc.amount));
        const newBal = ROUND(inv.amount - newPaid);
        return {
          ...inv,
          paidAmount: newPaid,
          balance: newBal,
          status: (newBal === inv.amount ? 'UNPAID' : newBal > 0 ? 'PARTIAL' : 'PAID') as any
        };
      }
      return inv;
    });

    // Restore tenant balance
    const updatedTenants = state.tenants.map(t => {
      if (t.id === payment.tenantId) {
        if (payment.purpose === 'SECURITY_DEPOSIT') {
          return {
            ...t,
            securityDepositHeld: Math.max(0, ROUND(t.securityDepositHeld - payment.amount))
          };
        } else {
          return {
            ...t,
            balance: ROUND(t.balance + payment.amount)
          };
        }
      }
      return t;
    });

    // Create Balanced Reversing Journal Entry
    const origJv = state.journalEntries.find(j => j.id === payment.journalEntryId);
    const creditAcc = origJv?.lines[1]?.accountCode || '1130';
    const creditAccName = origJv?.lines[1]?.accountName || 'مدينو الإيجارات (ذمم المستأجرين)';
    const debitAcc = origJv?.lines[0]?.accountCode || payment.destinationAccountCode;
    const debitAccName = origJv?.lines[0]?.accountName || 'الصندوق/البنك';

    const reversingEntry: JournalEntry = {
      id: reversalJvId,
      entryNumber: nextJvNum,
      date: new Date().toISOString().split('T')[0],
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'PAYMENT_REVERSAL',
      refId: payment.id,
      description: `قيد عكسي لسند القبض ${payment.receiptNumber} - السبب: ${params.reason}`,
      lines: [
        {
          id: `jl_rev_${Date.now()}_dr`,
          accountCode: creditAcc,
          accountName: creditAccName,
          debit: payment.amount,
          credit: 0,
          description: `عكس قيد تسوية حساب المستأجر ${tenant?.name || ''}`
        },
        {
          id: `jl_rev_${Date.now()}_cr`,
          accountCode: debitAcc,
          accountName: debitAccName,
          debit: 0,
          credit: payment.amount,
          description: `خصم المبلغ المعكوس من حساب ${debitAccName}`
        }
      ],
      totalDebit: payment.amount,
      totalCredit: payment.amount,
      isBalanced: true,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const updatedPayments = state.payments.map(p => {
      if (p.id === payment.id) {
        return {
          ...p,
          status: 'REVERSED' as const,
          reversedAt: new Date().toISOString(),
          reversedBy: state.currentUser.name,
          reversalReason: params.reason,
          reversalEntryId: reversalJvId
        };
      }
      return p;
    });

    const auditLog = addAuditLog(
      'عكس وإلغاء سند قبض',
      'Payment',
      payment.receiptNumber,
      `تم عكس السند بمبلغ ${payment.amount} ر.س. السبب: ${params.reason}. تم إنشاء القيد العكسي ${nextJvNum}`
    );

    setState(prev => ({
      ...prev,
      payments: updatedPayments,
      invoices: updatedInvoices,
      tenants: updatedTenants,
      journalEntries: [reversingEntry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost(`/api/payments/${params.paymentId}/reverse`, { reason: params.reason });

    return { success: true };
  }, [state, isPeriodClosedForDate]);

  // 3. RECORD EXPENSE (سند صرف مصروف عقار)
  const recordExpense = useCallback((params: {
    propertyId: string;
    unitId?: string;
    category: ExpenseCategory;
    expenseAccountCode: string;
    paymentAccountCode: string;
    amount: number;
    paymentMethod: PaymentMethod;
    date: string;
    payee: string;
    description: string;
  }) => {
    if (params.amount <= 0) return { success: false, error: 'مبلغ المصروف يجب أن يكون موجباً' };

    const closedPeriod = getClosedPeriodForDate(params.date);
    if (closedPeriod) {
      return {
        success: false,
        error: `حظر الترحيل: تاريخ المصروف (${params.date}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name} من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}) لمنع التعديل بأثر رجعي`
      };
    }

    if (state.currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'وظيفة المدير رقابية فقط ولا يصدر حركات محاسبية (سندات الصرف تسجل بواسطة المحاسب المالي)'
      };
    }

    if (state.currentUser.role === 'CASHIER' || state.currentUser.role === 'AUDITOR') {
      return { success: false, error: 'غير مصرح: تسجيل واعتماد المصروفات يتطلب صلاحية محاسب مالي' };
    }

    const expAccount = state.accounts.find(a => a.code === params.expenseAccountCode) || state.accounts.find(a => a.code === '5100') || { code: '5100', nameAr: 'مصروفات الصيانة والتشغيل' };
    const payAccount = state.accounts.find(a => a.code === params.paymentAccountCode) || state.accounts.find(a => a.code === '1120') || { code: '1120', nameAr: 'البنك - الحساب الجاري التشغيلي' };
    const property = state.properties.find(p => p.id === params.propertyId) || state.properties[0];

    const nextVoucherNum = `EXP-2026-${String(state.expenses.length + 1).padStart(3, '0')}`;
    const nextJvNum = `JV-2026-${String(state.journalEntries.length + 1).padStart(4, '0')}`;
    const expId = `exp_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    // Balanced Journal Entry: Dr Expense, Cr Cash/Bank
    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date: params.date,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'EXPENSE',
      refId: expId,
      description: `سند صرف ${nextVoucherNum} - ${params.description} (${property?.name})`,
      lines: [
        {
          id: `jl_exp_${Date.now()}_dr`,
          accountCode: expAccount.code,
          accountName: expAccount.nameAr,
          debit: params.amount,
          credit: 0,
          description: `${params.description} - ${property?.name}`,
          propertyId: params.propertyId,
          unitId: params.unitId
        },
        {
          id: `jl_exp_${Date.now()}_cr`,
          accountCode: payAccount.code,
          accountName: payAccount.nameAr,
          debit: 0,
          credit: params.amount,
          description: `سداد للمورد ${params.payee}`
        }
      ],
      totalDebit: params.amount,
      totalCredit: params.amount,
      isBalanced: true,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const newExpense: PropertyExpense = {
      id: expId,
      voucherNumber: nextVoucherNum,
      propertyId: params.propertyId,
      unitId: params.unitId,
      category: params.category,
      expenseAccountCode: expAccount.code,
      paymentAccountCode: payAccount.code,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      date: params.date,
      payee: params.payee,
      description: params.description,
      status: 'POSTED',
      journalEntryId: jvId,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const auditLog = addAuditLog(
      'تسجيل وترحيل سند صرف',
      'Expense',
      nextVoucherNum,
      `تم صرف مبلغ ${params.amount} ر.س لصالح ${params.payee} - عقار ${property?.name}`
    );

    setState(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      journalEntries: [newJournalEntry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/expenses', params);
    syncSetDoc('expenses', newExpense.id, newExpense);
    syncSetDoc('journalEntries', newJournalEntry.id, newJournalEntry);

    return { success: true, expense: newExpense };
  }, [state, isPeriodClosedForDate]);

  // 4. GENERATE CONTRACT INVOICE (استحقاق الإيجار الدوري)
  const generateContractInvoice = useCallback((params: {
    contractId: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
  }) => {
    const contract = state.contracts.find(c => c.id === params.contractId);
    if (!contract) return { success: false, error: 'عقد الإيجار غير موجود' };

    // Prevent duplicate rent charges for same contract and period!
    const existing = state.invoices.find(
      i => i.contractId === params.contractId &&
           i.periodStart === params.periodStart &&
           i.periodEnd === params.periodEnd
    );
    if (existing) {
      return {
        success: false,
        error: `توجد فاتورة مصدرة مسبقاً لنفس العقد والفترة (${existing.invoiceNumber})`
      };
    }

    const closedPeriod = getClosedPeriodForDate(params.dueDate);
    if (closedPeriod) {
      return {
        success: false,
        error: `حظر الترحيل: تاريخ استحقاق الفاتورة (${params.dueDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name} من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}) لمنع التعديل بأثر رجعي`
      };
    }

    const tenant = state.tenants.find(t => t.id === contract.tenantId);
    const nextInvNum = `INV-2026-${String(state.invoices.length + 1).padStart(3, '0')}`;
    const nextJvNum = `JV-2026-${String(state.journalEntries.length + 1).padStart(4, '0')}`;
    const invId = `inv_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    // Balanced Journal Entry: Dr Tenant AR (1130), Cr Rental Revenue (4100)
    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date: params.dueDate,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'INVOICE',
      refId: invId,
      description: `استحقاق فاتورة إيجار ${nextInvNum} - المستأجر ${tenant?.name}`,
      lines: [
        {
          id: `jl_inv_${Date.now()}_dr`,
          accountCode: '1130',
          accountName: 'مدينو الإيجارات (ذمم المستأجرين)',
          debit: params.amount,
          credit: 0,
          description: `استحقاق على ${tenant?.name}`,
          propertyId: contract.propertyId,
          unitId: contract.unitId,
          tenantId: tenant?.id
        },
        {
          id: `jl_inv_${Date.now()}_cr`,
          accountCode: '4100',
          accountName: 'إيرادات تأجير العقارات',
          debit: 0,
          credit: params.amount,
          description: `إيراد إيجار عن الفترة من ${params.periodStart} إلى ${params.periodEnd}`
        }
      ],
      totalDebit: params.amount,
      totalCredit: params.amount,
      isBalanced: true,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const newInvoice: Invoice = {
      id: invId,
      invoiceNumber: nextInvNum,
      contractId: contract.id,
      tenantId: contract.tenantId,
      propertyId: contract.propertyId,
      unitId: contract.unitId,
      dueDate: params.dueDate,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      amount: params.amount,
      paidAmount: 0,
      balance: params.amount,
      status: 'UNPAID',
      journalEntryId: jvId,
      createdAt: new Date().toISOString()
    };

    // Update Tenant balance
    const updatedTenants = state.tenants.map(t => {
      if (t.id === contract.tenantId) {
        return {
          ...t,
          balance: ROUND(t.balance + params.amount)
        };
      }
      return t;
    });

    const auditLog = addAuditLog(
      'إصدار فاتورة إيجار دورية',
      'Invoice',
      nextInvNum,
      `تم إصدار فاتورة بمبلغ ${params.amount} ر.س على المستأجر ${tenant?.name} وترحيل القيد ${nextJvNum}`
    );

    setState(prev => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
      tenants: updatedTenants,
      journalEntries: [newJournalEntry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/invoices', params);

    return { success: true, invoice: newInvoice };
  }, [state, isPeriodClosedForDate]);

  // 4b. GENERATE RECURRING INVOICES BATCH (توليد دفعة فواتير الإيجار الدورية)
  const generateRecurringInvoicesBatch = useCallback((params: {
    targetMonth: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    contractIds?: string[];
  }) => {
    const closedPeriod = getClosedPeriodForDate(params.dueDate);
    if (closedPeriod) {
      return {
        success: false,
        generatedCount: 0,
        skippedCount: 0,
        totalAmount: 0,
        invoices: [],
        errors: [`حظر الترحيل: تاريخ استحقاق الفواتير (${params.dueDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name}) لمنع التعديل بأثر رجعي`],
        error: `حظر الترحيل: تاريخ استحقاق الفواتير (${params.dueDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name})`
      };
    }

    const activeContracts = state.contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (params.contractIds && params.contractIds.length > 0) {
        return params.contractIds.includes(c.id);
      }
      return true;
    });

    if (activeContracts.length === 0) {
      return {
        success: false,
        generatedCount: 0,
        skippedCount: 0,
        totalAmount: 0,
        invoices: [],
        errors: ['لا توجد عقود نشطة مستهدفة للتوليد'],
        error: 'لا توجد عقود نشطة مستهدفة للتوليد'
      };
    }

    let currentInvCount = state.invoices.length;
    let currentJvCount = state.journalEntries.length;

    const newInvoices: Invoice[] = [];
    const newJournalEntries: JournalEntry[] = [];
    const tenantBalanceAdditions: Record<string, number> = {};
    const errors: string[] = [];
    let skippedCount = 0;
    let totalGeneratedAmount = 0;

    for (const contract of activeContracts) {
      // Check for duplicate invoice in the same period
      const existing = state.invoices.find(
        i => i.contractId === contract.id &&
             i.periodStart === params.periodStart &&
             i.periodEnd === params.periodEnd
      );

      if (existing) {
        skippedCount++;
        continue;
      }

      const tenant = state.tenants.find(t => t.id === contract.tenantId);
      const amount = contract.installmentAmount;

      if (!amount || amount <= 0) {
        errors.push(`العقد ${contract.contractNumber}: قيمة القسط غير صالحة`);
        skippedCount++;
        continue;
      }

      currentInvCount += 1;
      currentJvCount += 1;
      const invNum = `INV-2026-${String(currentInvCount).padStart(3, '0')}`;
      const jvNum = `JV-2026-${String(currentJvCount).padStart(4, '0')}`;
      const invId = `inv_rec_${Date.now()}_${contract.id.slice(-4)}_${currentInvCount}`;
      const jvId = `jv_rec_${Date.now()}_${contract.id.slice(-4)}_${currentJvCount}`;

      const newJv: JournalEntry = {
        id: jvId,
        entryNumber: jvNum,
        date: params.dueDate,
        postingDate: new Date().toISOString().split('T')[0],
        status: 'POSTED',
        refType: 'INVOICE',
        refId: invId,
        description: `استحقاق فاتورة دورية ${invNum} - شهر ${params.targetMonth} - المستأجر ${tenant?.name || ''}`,
        lines: [
          {
            id: `jl_rec_${Date.now()}_dr_${contract.id}`,
            accountCode: '1130',
            accountName: 'مدينو الإيجارات (ذمم المستأجرين)',
            debit: amount,
            credit: 0,
            description: `استحقاق دوري على ${tenant?.name || ''}`,
            propertyId: contract.propertyId,
            unitId: contract.unitId,
            tenantId: tenant?.id
          },
          {
            id: `jl_rec_${Date.now()}_cr_${contract.id}`,
            accountCode: '4100',
            accountName: 'إيرادات تأجير العقارات',
            debit: 0,
            credit: amount,
            description: `إيراد إيجار دوري لشهر ${params.targetMonth} (${params.periodStart} إلى ${params.periodEnd})`
          }
        ],
        totalDebit: amount,
        totalCredit: amount,
        isBalanced: true,
        createdBy: state.currentUser.name,
        createdAt: new Date().toISOString()
      };

      const newInv: Invoice = {
        id: invId,
        invoiceNumber: invNum,
        contractId: contract.id,
        tenantId: contract.tenantId,
        propertyId: contract.propertyId,
        unitId: contract.unitId,
        dueDate: params.dueDate,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        amount: amount,
        paidAmount: 0,
        balance: amount,
        status: 'UNPAID',
        journalEntryId: jvId,
        createdAt: new Date().toISOString()
      };

      newInvoices.push(newInv);
      newJournalEntries.push(newJv);
      totalGeneratedAmount = ROUND(totalGeneratedAmount + amount);
      tenantBalanceAdditions[contract.tenantId] = ROUND((tenantBalanceAdditions[contract.tenantId] || 0) + amount);
    }

    if (newInvoices.length === 0) {
      return {
        success: true,
        generatedCount: 0,
        skippedCount,
        totalAmount: 0,
        invoices: [],
        errors,
        error: skippedCount > 0 ? 'كافة العقود المستهدفة تم إصدار فواتير لها مسبقاً لنفس الفترة الإيجارية' : 'لم يتم توليد أي فواتير'
      };
    }

    // Update Tenant balances
    const updatedTenants = state.tenants.map(t => {
      const added = tenantBalanceAdditions[t.id];
      if (added) {
        return {
          ...t,
          balance: ROUND(t.balance + added)
        };
      }
      return t;
    });

    const auditLog = addAuditLog(
      'توليد دفعة فواتير دورية آلية',
      'InvoiceBatch',
      `${params.targetMonth} (${newInvoices.length} فواتير)`,
      `تم توليد ${newInvoices.length} فواتير إيجار دورية لشهر ${params.targetMonth} بإجمالي ${totalGeneratedAmount} ر.س وترحيل القيود المحاسبية المقابلة`
    );

    setState(prev => ({
      ...prev,
      invoices: [...newInvoices, ...prev.invoices],
      tenants: updatedTenants,
      journalEntries: [...newJournalEntries, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/invoices/batch', { targetMonth: params.targetMonth, count: newInvoices.length, total: totalGeneratedAmount });

    return {
      success: true,
      generatedCount: newInvoices.length,
      skippedCount,
      totalAmount: totalGeneratedAmount,
      invoices: newInvoices,
      errors
    };
  }, [state, isPeriodClosedForDate, addAuditLog]);

  // 5. CREATE CONTRACT & OCCUPY UNIT
  const createContract = useCallback((contractData: Omit<Contract, 'id' | 'createdAt'>) => {
    // التحقق من الصلاحية: تحرير وإبرام عقود الإيجار محصورة فقط بالمحاسب المالي المعتمد
    if (state.currentUser.role !== 'ACCOUNTANT' || (state.currentUser.permissions && state.currentUser.permissions.canManageContracts === false)) {
      return {
        success: false,
        error: 'غير مصرح: صلاحية تحرير وإبرام عقود الإيجار محصورة بالمحاسب المالي فقط ولا تمنح لبقية الأدوار'
      };
    }

    // التحقق الموحد (نفس الدالة يستخدمها الخادم): منع تداخل العقود ومنع تأجير وحدة قيد الصيانة
    const validation = validateNewContract({
      units: state.units,
      contracts: state.contracts,
      unitId: contractData.unitId,
      startDate: contractData.startDate,
      endDate: contractData.endDate
    });
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const id = `con_${Date.now()}`;
    const newContract: Contract = {
      ...contractData,
      id,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const tenant = state.tenants.find(t => t.id === contractData.tenantId);
    const auditLog = addAuditLog(
      'إنشاء عقد إيجار جديد',
      'Contract',
      newContract.contractNumber,
      `تم إبرام عقد جديد للمستأجر ${tenant?.name} بقيمة سنوية ${newContract.annualRent} ر.س`
    );

    // حالة الوحدة تُشتق من العقود (مصدر حقيقة واحد) بدل تعيينها يدويًا
    setState(prev => {
      const nextContracts = [newContract, ...prev.contracts];
      return {
        ...prev,
        contracts: nextContracts,
        units: reconcileUnits(prev.units, nextContracts),
        auditLogs: [auditLog, ...prev.auditLogs]
      };
    });

    // نرسل المعرّف نفسه للخادم كي لا يولّد معرّفًا مختلفًا
    apiPost('/api/contracts', { contractData: newContract });
    syncSetDoc('contracts', newContract.id, newContract);

    return { success: true, contract: newContract };
  }, [state]);

  // 5b. TERMINATE CONTRACT & RELEASE UNIT (إنهاء العقد وإخلاء الوحدة)
  const terminateContract = useCallback((contractId: string, params: { date: string; reason?: string }) => {
    if (state.currentUser.role !== 'ACCOUNTANT' || (state.currentUser.permissions && state.currentUser.permissions.canManageContracts === false)) {
      return {
        success: false,
        error: 'غير مصرح: صلاحية إنهاء عقود الإيجار محصورة بالمحاسب المالي فقط'
      };
    }

    const contract = state.contracts.find(c => c.id === contractId);
    const validation = validateTermination(contract, params.date);
    if (!validation.ok || !contract) {
      return { success: false, error: validation.error };
    }

    const terminated = applyTermination(contract, params);
    const unit = state.units.find(u => u.id === contract.unitId);
    const tenant = state.tenants.find(t => t.id === contract.tenantId);
    const auditLog = addAuditLog(
      'إنهاء عقد إيجار وإخلاء الوحدة',
      'Contract',
      contract.contractNumber,
      `تم إنهاء عقد ${contract.contractNumber} للمستأجر ${tenant?.name || ''} (الوحدة ${unit?.unitNumber || ''}) بتاريخ ${params.date}${params.reason ? ` — السبب: ${params.reason}` : ''}`
    );

    setState(prev => {
      const nextContracts = prev.contracts.map(c => (c.id === contractId ? terminated : c));
      return {
        ...prev,
        contracts: nextContracts,
        units: reconcileUnits(prev.units, nextContracts),
        auditLogs: [auditLog, ...prev.auditLogs]
      };
    });

    apiPost(`/api/contracts/${encodeURIComponent(contractId)}/terminate`, {
      date: params.date,
      reason: params.reason
    });
    syncSetDoc('contracts', terminated.id, terminated);

    return { success: true, contract: terminated };
  }, [state]);

  // 5c. FIXED ASSETS — اقتناء أصل ثابت بقيد مزدوج (مباني، أراضي، مولدات، معدات، أثاث، مركبات)
  const createFixedAsset = useCallback((input: FixedAssetInput) => {
    if (state.currentUser.role === 'ADMIN') {
      return { success: false, error: 'وظيفة المدير رقابية فقط، وتسجيل الأصول الثابتة يتم بواسطة المحاسب المالي' };
    }
    if (state.currentUser.role !== 'ACCOUNTANT' || state.currentUser.permissions?.canCreateJournalEntries === false) {
      return { success: false, error: 'غير مصرح: تسجيل الأصول الثابتة يتطلب صلاحية محاسب مالي' };
    }

    const validation = validateFixedAssetInput(input, state.accounts);
    if (!validation.ok) return { success: false, error: validation.error };

    const closed = getClosedPeriodForDate(input.purchaseDate);
    if (closed) {
      return {
        success: false,
        error: `حظر الترحيل: تاريخ الاقتناء (${input.purchaseDate}) يقع ضمن فترة محاسبية مقفلة (${closed.name})`
      };
    }

    const { asset, entry } = buildAcquisition({
      input,
      accounts: state.accounts,
      existingAssets: state.fixedAssets,
      existingEntries: state.journalEntries,
      createdBy: state.currentUser.name
    });

    const auditLog = addAuditLog(
      'تسجيل أصل ثابت جديد',
      'FixedAsset',
      asset.assetCode,
      `تم تسجيل الأصل ${asset.name} (${asset.assetCode}) بتكلفة ${asset.cost} وترحيل القيد ${entry.entryNumber}`
    );

    setState(prev => ({
      ...prev,
      fixedAssets: [asset, ...prev.fixedAssets],
      journalEntries: [entry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    // نرسل المعرّف نفسه كي يبقى واحدًا في العميل والخادم
    apiPost('/api/fixed-assets', { input, id: asset.id });

    return { success: true, asset, entry };
  }, [state.currentUser, state.accounts, state.fixedAssets, state.journalEntries, getClosedPeriodForDate, addAuditLog]);

  const postDepreciation = useCallback((throughMonth: string) => {
    if (state.currentUser.role === 'ADMIN') {
      return { success: false, postedCount: 0, totalAmount: 0, error: 'وظيفة المدير رقابية فقط، وترحيل الإهلاك يتم بواسطة المحاسب المالي' };
    }
    if (state.currentUser.role !== 'ACCOUNTANT' || state.currentUser.permissions?.canCreateJournalEntries === false) {
      return { success: false, postedCount: 0, totalAmount: 0, error: 'غير مصرح: ترحيل الإهلاك يتطلب صلاحية محاسب مالي' };
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(throughMonth)) {
      return { success: false, postedCount: 0, totalAmount: 0, error: 'الشهر المحدد غير صحيح' };
    }

    const result = generateDepreciation({
      assets: state.fixedAssets,
      accounts: state.accounts,
      existingEntries: state.journalEntries,
      throughMonth,
      createdBy: state.currentUser.name,
      isDateClosed: d => !!getClosedPeriodForDate(d)
    });

    if (result.entries.length === 0) {
      return {
        success: true,
        postedCount: 0,
        totalAmount: 0,
        blockedMonth: result.blockedMonth,
        error: result.blockedMonth
          ? `توقف الترحيل عند شهر ${result.blockedMonth} لأنه ضمن فترة محاسبية مقفلة`
          : undefined
      };
    }

    const auditLog = addAuditLog(
      'ترحيل إهلاك الأصول الثابتة',
      'FixedAsset',
      throughMonth,
      `تم ترحيل ${result.entries.length} قيد إهلاك بإجمالي ${result.totalAmount} حتى ${throughMonth}`
    );

    setState(prev => ({
      ...prev,
      fixedAssets: result.assets,
      journalEntries: [...result.entries].reverse().concat(prev.journalEntries),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/fixed-assets/depreciation', { throughMonth });

    return {
      success: true,
      postedCount: result.entries.length,
      totalAmount: result.totalAmount,
      blockedMonth: result.blockedMonth
    };
  }, [state.currentUser, state.fixedAssets, state.accounts, state.journalEntries, getClosedPeriodForDate, addAuditLog]);

  // 6. CREATE PROPERTY
  const createProperty = useCallback((propData: Omit<Property, 'id' | 'createdAt'>) => {
    // التحقق من الصلاحية: إضافة العقارات محصورة فقط بالمحاسب المالي المعتمد
    if (state.currentUser.role !== 'ACCOUNTANT' || (state.currentUser.permissions && state.currentUser.permissions.canManageProperties === false)) {
      return {
        success: false,
        error: 'غير مصرح: صلاحية إضافة العقارات محصورة بالمحاسب المالي فقط ولا تمنح لبقية الأدوار'
      };
    }

    const newProp: Property = {
      ...propData,
      id: `prop_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const auditLog = addAuditLog('إضافة عقار جديد', 'Property', newProp.code, `تمت إضافة ${newProp.name} في ${newProp.city}`);
    setState(prev => ({
      ...prev,
      properties: [newProp, ...prev.properties],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));
    apiPost('/api/properties', { property: newProp });
    syncSetDoc('properties', newProp.id, newProp);
    return { success: true, property: newProp };
  }, [state]);

  // 7. CREATE UNIT
  const createUnit = useCallback((unitData: Omit<Unit, 'id'>) => {
    // التحقق من الصلاحية: إضافة الوحدات تابعة لإدارة العقارات ومحصورة بالمحاسب المالي المعتمد
    if (state.currentUser.role !== 'ACCOUNTANT' || (state.currentUser.permissions && state.currentUser.permissions.canManageProperties === false)) {
      return {
        success: false,
        error: 'غير مصرح: صلاحية إضافة الوحدات محصورة بالمحاسب المالي فقط'
      };
    }

    const newUnit: Unit = {
      ...unitData,
      id: `unit_${Date.now()}`
    };
    const auditLog = addAuditLog('إضافة وحدة عقارية', 'Unit', newUnit.unitNumber, `تمت إضافة ${newUnit.unitNumber}`);
    setState(prev => ({
      ...prev,
      units: [...prev.units, newUnit],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));
    apiPost('/api/units', { unit: newUnit });
    return { success: true, unit: newUnit };
  }, [state]);

  // 8. CREATE TENANT
  const createTenant = useCallback((tenantData: Omit<Tenant, 'id' | 'createdAt' | 'balance' | 'securityDepositHeld'>) => {
    const newTenant: Tenant = {
      ...tenantData,
      id: `ten_${Date.now()}`,
      balance: 0,
      securityDepositHeld: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const auditLog = addAuditLog('إضافة مستأجر جديد', 'Tenant', newTenant.nationalId, `تم تسجيل المستأجر ${newTenant.name}`);
    setState(prev => ({
      ...prev,
      tenants: [newTenant, ...prev.tenants],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));
    apiPost('/api/tenants', { tenant: tenantData });
    return { success: true, tenant: newTenant };
  }, [state]);

  // 9. MANUAL BALANCED JOURNAL ENTRY
  const createManualJournalEntry = useCallback((params: {
    date: string;
    description: string;
    lines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      propertyId?: string;
    }>;
  }) => {
    if (state.currentUser.role === 'CASHIER' || state.currentUser.role === 'AUDITOR') {
      return { success: false, error: 'غير مصرح: تحرير القيود اليومية يتطلب صلاحية محاسب مالي' };
    }

    const closedPeriod = getClosedPeriodForDate(params.date);
    if (closedPeriod) {
      return {
        success: false,
        error: `حظر الترحيل: تاريخ القيد (${params.date}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closedPeriod.name} من ${closedPeriod.startDate} إلى ${closedPeriod.endDate}) لمنع التعديل بأثر رجعي`
      };
    }

    const journalLines = params.lines.map((l, idx) => {
      const acc = state.accounts.find(a => a.code === l.accountCode);
      return {
        id: `jl_man_${Date.now()}_${idx}`,
        accountCode: l.accountCode,
        accountName: acc?.nameAr || l.accountCode,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description,
        propertyId: l.propertyId
      };
    });

    const validation = validateJournalBalance(journalLines);
    if (!validation.isBalanced) {
      return {
        success: false,
        error: `القيد غير متوازن! إجمالي المدين: ${validation.totalDebit} ر.س | إجمالي الدائن: ${validation.totalCredit} ر.س (الفارق: ${validation.difference})`
      };
    }

    const nextJvNum = `JV-2026-${String(state.journalEntries.length + 1).padStart(4, '0')}`;
    const newEntry: JournalEntry = {
      id: `jv_man_${Date.now()}`,
      entryNumber: nextJvNum,
      date: params.date,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'MANUAL',
      description: params.description,
      lines: journalLines,
      totalDebit: validation.totalDebit,
      totalCredit: validation.totalCredit,
      isBalanced: true,
      createdBy: state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    const auditLog = addAuditLog(
      'تسجيل قيد يومية يدوي',
      'JournalEntry',
      nextJvNum,
      `تم ترحيل القيد ${nextJvNum}: ${params.description}`
    );

    setState(prev => ({
      ...prev,
      journalEntries: [newEntry, ...prev.journalEntries],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/journal', params);

    return { success: true, entry: newEntry };
  }, [state, isPeriodClosedForDate]);

  // 10. FISCAL PERIOD OPERATIONS (إدارة وتعريف وإقفال وإعادة فتح الفترات المالية)
  const createFiscalPeriod = useCallback((params: {
    name: string;
    fiscalYear: number;
    periodType: FiscalPeriodType;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => {
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.role !== 'ACCOUNTANT') {
      return { success: false, error: 'غير مصرح: تعريف الفترات المالية يتطلب صلاحيات المدير أو الإدارة المالية' };
    }

    if (!params.name.trim()) {
      return { success: false, error: 'يرجى إدخال اسم أو وصف الفترة المالية' };
    }

    if (params.startDate > params.endDate) {
      return { success: false, error: 'تاريخ بداية الفترة يجب أن يكون قبل أو مساوياً لتاريخ نهايتها' };
    }

    const existing = state.periods.find(
      p => p.name.trim().toLowerCase() === params.name.trim().toLowerCase() && p.fiscalYear === params.fiscalYear
    );
    if (existing) {
      return { success: false, error: `توجد فترة مالية معرفة مسبقاً بنفس الاسم (${params.name}) للسنة ${params.fiscalYear}` };
    }

    const newPeriod: AccountingPeriod = {
      id: `period_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: params.name.trim(),
      fiscalYear: params.fiscalYear,
      periodType: params.periodType,
      startDate: params.startDate,
      endDate: params.endDate,
      isClosed: false,
      notes: params.notes?.trim() || undefined
    };

    const auditLog = addAuditLog(
      'تعريف فترة مالية جديدة',
      'AccountingPeriod',
      newPeriod.name,
      `تم تعريف الفترة المالية (${newPeriod.name}: من ${newPeriod.startDate} إلى ${newPeriod.endDate}) للسنة ${newPeriod.fiscalYear}`
    );

    setState(prev => ({
      ...prev,
      periods: [...prev.periods, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/periods', params);

    return { success: true, period: newPeriod };
  }, [state, addAuditLog]);

  const updateFiscalPeriod = useCallback((periodId: string, params: {
    name: string;
    fiscalYear: number;
    periodType: FiscalPeriodType;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => {
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.role !== 'ACCOUNTANT') {
      return { success: false, error: 'غير مصرح: تعديل الفترات المالية يتطلب صلاحيات المدير أو الإدارة المالية' };
    }

    const period = state.periods.find(p => p.id === periodId);
    if (!period) return { success: false, error: 'الفترة المالية غير موجودة' };

    if (period.isClosed) {
      return { success: false, error: 'لا يمكن تعديل فترة مالية مقفلة ومحمية؛ يجب إعادة فتحها أولاً بمبرر معتمد' };
    }

    if (params.startDate > params.endDate) {
      return { success: false, error: 'تاريخ بداية الفترة يجب أن يكون قبل تاريخ نهايتها' };
    }

    const updatedPeriods = state.periods.map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          name: params.name.trim(),
          fiscalYear: params.fiscalYear,
          periodType: params.periodType,
          startDate: params.startDate,
          endDate: params.endDate,
          notes: params.notes?.trim() || p.notes
        };
      }
      return p;
    });

    const auditLog = addAuditLog(
      'تحديث بيانات فترة مالية',
      'AccountingPeriod',
      params.name,
      `تم تعديل نطاق الفترة المالية (${params.name}: من ${params.startDate} إلى ${params.endDate})`
    );

    setState(prev => ({
      ...prev,
      periods: updatedPeriods.sort((a, b) => a.startDate.localeCompare(b.startDate)),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPut(`/api/periods/${periodId}`, params);

    return { success: true };
  }, [state, addAuditLog]);

  const closeAccountingPeriod = useCallback((periodId: string, reason?: string) => {
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.role !== 'ACCOUNTANT') {
      return { success: false, error: 'غير مصرح: إقفال الفترة المحاسبية يتطلب صلاحيات الإدارة المالية أو المدير' };
    }

    const period = state.periods.find(p => p.id === periodId);
    if (!period) return { success: false, error: 'الفترة المالية غير موجودة' };
    if (period.isClosed) return { success: false, error: 'الفترة مقفلة ومحمية بالفعل' };

    const effectiveReason = reason?.trim() || 'إقفال دوري معتمد وتدقيق ميزان المراجعة وحظر الترحيل بأثر رجعي';

    const updatedPeriods = state.periods.map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          isClosed: true,
          closedAt: new Date().toISOString().split('T')[0],
          closedBy: state.currentUser.name,
          closeReason: effectiveReason
        };
      }
      return p;
    });

    const auditLog = addAuditLog(
      'إقفال وحماية فترة محاسبية',
      'AccountingPeriod',
      period.name,
      `تم إقفال الفترة (${period.name}: من ${period.startDate} إلى ${period.endDate}) ومنع الترحيل بأثر رجعي بواسطة ${state.currentUser.name}. السبب: ${effectiveReason}`
    );

    setState(prev => ({
      ...prev,
      periods: updatedPeriods,
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost(`/api/periods/${periodId}/close`, { reason: effectiveReason });

    return { success: true };
  }, [state, addAuditLog]);

  const reopenAccountingPeriod = useCallback((periodId: string, reason: string) => {
    if (state.currentUser.role !== 'ADMIN' && state.currentUser.role !== 'ACCOUNTANT') {
      return { success: false, error: 'غير مصرح: إعادة فتح فترة مقفلة مقصور على المدير العام وكبير المحاسبين' };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: 'إلزامي: يجب كتابة مبرر رسمي معتمد لإعادة فتح الفترة المقفلة لأغراض الرقابة المالية' };
    }

    const period = state.periods.find(p => p.id === periodId);
    if (!period) return { success: false, error: 'الفترة المالية غير موجودة' };
    if (!period.isClosed) return { success: false, error: 'الفترة مفتوحة ونشطة بالفعل' };

    const updatedPeriods = state.periods.map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          isClosed: false,
          unlockedAt: new Date().toISOString().split('T')[0],
          unlockedBy: state.currentUser.name,
          unlockReason: reason.trim()
        };
      }
      return p;
    });

    const auditLog = addAuditLog(
      'إلغاء قفل وإعادة فتح فترة مالية',
      'AccountingPeriod',
      period.name,
      `تمت إعادة فتح الفترة (${period.name}: من ${period.startDate} إلى ${period.endDate}) بواسطة ${state.currentUser.name}. المبرر الرقابي: ${reason.trim()}`
    );

    setState(prev => ({
      ...prev,
      periods: updatedPeriods,
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost(`/api/periods/${periodId}/reopen`, { reason: reason.trim() });

    return { success: true };
  }, [state, addAuditLog]);

  const deleteFiscalPeriod = useCallback((periodId: string) => {
    if (state.currentUser.role !== 'ADMIN') {
      return { success: false, error: 'غير مصرح: حذف الفترات المالية مقصور على مدير النظام' };
    }

    const period = state.periods.find(p => p.id === periodId);
    if (!period) return { success: false, error: 'الفترة المالية غير موجودة' };
    if (period.isClosed) return { success: false, error: 'لا يمكن حذف فترة مالية مقفلة؛ يجب إعادة فتحها أولاً' };

    const hasEntries = state.journalEntries.some(j => j.date >= period.startDate && j.date <= period.endDate);
    if (hasEntries) {
      return { success: false, error: 'لا يمكن حذف فترة مالية تحتوي على قيود محاسبية مسجلة' };
    }

    const updatedPeriods = state.periods.filter(p => p.id !== periodId);
    const auditLog = addAuditLog(
      'حذف فترة مالية فارغة',
      'AccountingPeriod',
      period.name,
      `تم حذف الفترة المالية (${period.name})`
    );

    setState(prev => ({
      ...prev,
      periods: updatedPeriods,
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiDelete(`/api/periods/${periodId}`);

    return { success: true };
  }, [state, addAuditLog]);

  // Supervisory Role & Permissions Check (Admin can manage users, periods, reports)
  const isSupervisoryOnly =
    state.currentUser.role === 'ADMIN' ||
    (state.currentUser.role as any) === 'admin' ||
    state.currentUser.email?.toLowerCase() === 'ebow2012@gmail.com';

  const canUserPerform = useCallback((permission: Exclude<keyof UserPermissions, 'allowedSections'>): boolean => {
    const isEffectiveAdmin =
      state.currentUser.role === 'ADMIN' ||
      (state.currentUser.role as any) === 'admin' ||
      state.currentUser.email?.toLowerCase() === 'ebow2012@gmail.com';

    // المدير العام وظيفته رقابية فقط لا يصدر حركات محاسبية أو إدخالات تشغيلية، لكنه يدير المستخدمين والفترات والتقارير
    if (isEffectiveAdmin) {
      if (
        permission === 'canInput' ||
        permission === 'canIssueReceipts' ||
        permission === 'canReverseReceipts' ||
        permission === 'canRecordExpenses' ||
        permission === 'canCreateJournalEntries' ||
        permission === 'canManageContracts' ||
        permission === 'canManageProperties' ||
        permission === 'canManageInventory'
      ) {
        return false;
      }
      return true; // الفترات، الرقابة، استعراض وتصدير التقارير، طباعة المستندات، وإدارة المستخدمين (canManageUsers)
    }

    // صلاحيات إضافة عقار جديد وتحرير عقد إيجار محصورة فقط وحصرياً بالمحاسب المالي (ACCOUNTANT)
    if (permission === 'canManageProperties' || permission === 'canManageContracts') {
      if (state.currentUser.role !== 'ACCOUNTANT') {
        return false;
      }
    }

    // المحاسب المالي معتمد لتسجيل وترحيل سندات الصرف والقيود المحاسبية
    if (state.currentUser.role === 'ACCOUNTANT') {
      if (
        permission === 'canRecordExpenses' ||
        permission === 'canCreateJournalEntries' ||
        permission === 'canManageProperties' ||
        permission === 'canManageContracts'
      ) {
        if (state.currentUser.permissions && state.currentUser.permissions[permission] !== undefined) {
          return !!state.currentUser.permissions[permission];
        }
        return true;
      }
    }

    if (state.currentUser.permissions && state.currentUser.permissions[permission] !== undefined) {
      return !!state.currentUser.permissions[permission];
    }
    return true;
  }, [state.currentUser]);

  // فحص صلاحية فتح القسم أو النافذة للموظف بناءً على ما منحه المدير العام
  const isSectionAllowed = useCallback((section: SystemSection): boolean => {
    // المدير العام يملك استعراض كافة أقسام النظام للرقابة والتدقيق
    if (state.currentUser.role === 'ADMIN') return true;

    // الموظف تظهر له حصراً الأقسام المصرح بها من المدير
    const userSections = state.currentUser.permissions?.allowedSections;
    if (userSections && userSections.length > 0) {
      return userSections.includes(section);
    }

    // افتراضات الصلاحيات الممنوحة حسب الرتبة الوظيفية
    switch (state.currentUser.role) {
      case 'EXECUTIVE':
        return ['dashboard', 'reports', 'analytics', 'alerts'].includes(section);
      case 'ACCOUNTANT':
        return ['dashboard', 'properties', 'contracts', 'invoices', 'accounting', 'fixed_assets', 'expenses', 'reports'].includes(section);
      case 'CASHIER':
        return ['dashboard', 'payments', 'invoices', 'reports'].includes(section);
      case 'STOREKEEPER':
        return ['dashboard', 'inventory', 'reports'].includes(section);
      case 'AUDITOR':
        return ['dashboard', 'reports', 'audit', 'tests'].includes(section);
      default:
        return ['dashboard', 'reports'].includes(section);
    }
  }, [state.currentUser]);

  // تسجيل حركة مخزنية وسندات الصرف والتوريد والعهد (خاص بمحاسب المخازن)
  const recordInventoryTransaction = useCallback((params: {
    type: 'INBOUND' | 'OUTBOUND' | 'CUSTODY_ASSIGN';
    itemId: string;
    quantity: number;
    propertyId?: string;
    recipientName: string;
    notes?: string;
    date?: string;
  }) => {
    if (state.currentUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'وظيفة المدير العام رقابية وإشرافية فقط؛ حركات المخازن تسجل حصراً من نافذة محاسب المخازن'
      };
    }

    if (!canUserPerform('canManageInventory') && !canUserPerform('canInput')) {
      return {
        success: false,
        error: 'غير مصرح: لا تملك صلاحية إدخال حركات المستودع والعهد'
      };
    }

    const item = state.inventoryItems.find(i => i.id === params.itemId);
    if (!item) {
      return { success: false, error: 'الصنف المخزني غير موجود' };
    }

    const numQty = Number(params.quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return { success: false, error: 'الكمية المدخلة غير صحيحة' };
    }

    if ((params.type === 'OUTBOUND' || params.type === 'CUSTODY_ASSIGN') && item.quantityOnHand < numQty) {
      return {
        success: false,
        error: `الرصيد المتاح بالمستودع (${item.quantityOnHand}) غير كافٍ لصرف الكمية المطلوبة (${numQty})`
      };
    }

    const newQty = params.type === 'INBOUND' ? item.quantityOnHand + numQty : item.quantityOnHand - numQty;
    const updatedItem: InventoryItem = {
      ...item,
      quantityOnHand: newQty,
      totalValue: newQty * item.unitPrice,
      lastRestockedDate: params.type === 'INBOUND' ? (params.date || new Date().toISOString().split('T')[0]) : item.lastRestockedDate
    };

    const property = state.properties.find(p => p.id === params.propertyId);
    const docNumber = `TR-${new Date().getFullYear()}-${String(state.inventoryTransactions.length + 1).padStart(3, '0')}`;

    const newTx: InventoryTransaction = {
      id: `tr_inv_${Date.now()}`,
      documentNumber: docNumber,
      type: params.type,
      date: params.date || new Date().toISOString().split('T')[0],
      itemId: item.id,
      itemName: item.name,
      quantity: numQty,
      unitPrice: item.unitPrice,
      totalAmount: numQty * item.unitPrice,
      propertyId: property?.id,
      propertyName: property?.name,
      recipientName: params.recipientName,
      issuedBy: state.currentUser.name,
      notes: params.notes || ''
    };

    const actionAr = params.type === 'INBOUND' ? 'توريد واستلام مخزني' : params.type === 'OUTBOUND' ? 'صرف مواد صيانة' : 'تسليم ونقل عهدة';
    const auditLog = addAuditLog(
      actionAr,
      'InventoryTransaction',
      docNumber,
      `تم تسجيل ${actionAr} للصنف (${item.name}) بعدد ${numQty} إلى (${params.recipientName})`
    );

    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(i => i.id === item.id ? updatedItem : i),
      inventoryTransactions: [newTx, ...prev.inventoryTransactions],
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/inventory/transaction', params);
    return { success: true, transaction: newTx };
  }, [state.currentUser, state.inventoryItems, state.inventoryTransactions, state.properties, canUserPerform, addAuditLog]);

  const addAssetMaintenanceLog = useCallback((itemId: string, logData: Omit<AssetMaintenanceLog, 'id'>, nextMaintenanceDate?: string) => {
    const item = state.inventoryItems.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'الأصل / الصنف غير موجود' };
    }

    const newLog: AssetMaintenanceLog = {
      ...logData,
      id: `mnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };

    const updatedItem: InventoryItem = {
      ...item,
      lastMaintenanceDate: newLog.date,
      nextMaintenanceDate: nextMaintenanceDate || item.nextMaintenanceDate,
      maintenanceLogs: [newLog, ...(item.maintenanceLogs || [])]
    };

    const auditLog = addAuditLog(
      'تسجيل صيانة أصل',
      'InventoryItem',
      item.itemCode,
      `تم تسجيل عملية صيانة للأصل (${item.name} - ${item.itemCode}): ${newLog.title} بتكلفة ${newLog.cost} ريال`
    );

    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(i => i.id === itemId ? updatedItem : i),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost('/api/inventory/maintenance-log', {
      itemId,
      log: newLog,
      nextMaintenanceDate
    });

    return { success: true, log: newLog };
  }, [state.inventoryItems, addAuditLog]);

  const updateInventoryItem = useCallback((itemId: string, updates: Partial<InventoryItem>) => {
    const item = state.inventoryItems.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'الأصل غير موجود' };
    }

    const updatedItem: InventoryItem = {
      ...item,
      ...updates
    };

    const auditLog = addAuditLog(
      'تحديث بيانات أصل',
      'InventoryItem',
      item.itemCode,
      `تم تحديث بيانات الأصل (${item.name} - ${item.itemCode})`
    );

    setState(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(i => i.id === itemId ? updatedItem : i),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost(`/api/inventory/item/${itemId}`, { updates });
    return { success: true };
  }, [state.inventoryItems, addAuditLog]);

  // User Management
  const createUser = useCallback((userData: Omit<UserProfile, 'id'> | UserProfile): UserProfile => {
    const initialPwd = userData.initialPassword || userData.password || generateTempPassword();
    const safeId = (userData as any).id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const { password: _ignoredPlain, ...userWithoutPassword } = userData as UserProfile;
    const newUser: UserProfile = {
      ...userWithoutPassword,
      id: safeId,
      initialPassword: initialPwd, // تُعرض للمدير لتسليمها للموظف، ولا تُخزَّن بنص صريح في الخادم بعد تغييرها
      mustChangePasswordOnNextLogin: userData.mustChangePasswordOnNextLogin ?? true,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      permissions: userData.permissions || {
        canIssueReceipts: userData.role === 'CASHIER',
        canReverseReceipts: false,
        canRecordExpenses: userData.role === 'ACCOUNTANT',
        canCreateJournalEntries: userData.role === 'ACCOUNTANT',
        canManageContracts: userData.role === 'ACCOUNTANT',
        canManageProperties: userData.role === 'ACCOUNTANT',
        canClosePeriods: false,
        canExportReports: true,
        canManageUsers: userData.role === 'ADMIN'
      }
    };

    const auditLog = addAuditLog(
      'إضافة مستخدم ومنح الصلاحيات',
      'User',
      newUser.name,
      `تمت إضافة الموظف (${newUser.name} - ${newUser.titleAr}) بكلمة مرور أولية مؤقتة`
    );

    setState(prev => {
      const exists = prev.users.some(u => u.id === newUser.id || (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase()));
      const nextUsers = exists
        ? prev.users.map(u => (u.id === newUser.id || (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase())) ? newUser : u)
        : [...prev.users, newUser];
      return {
        ...prev,
        users: nextUsers,
        auditLogs: [auditLog, ...prev.auditLogs]
      };
    });

    apiPost('/api/users', { user: newUser });
    return newUser;
  }, [addAuditLog]);

  const updateUser = useCallback((userId: string, updates: Partial<UserProfile>) => {
    const existing = state.users.find(u => u.id === userId);
    if (!existing) return;

    const updatedUser = { ...existing, ...updates };
    const auditLog = addAuditLog(
      'تعديل صلاحيات وبيانات مستخدم',
      'User',
      updatedUser.name,
      `تم تعديل بيانات وصلاحيات المستخدم (${updatedUser.name})`
    );

    setState(prev => {
      const nextUsers = prev.users.map(u => (u.id === userId ? updatedUser : u));
      return {
        ...prev,
        users: nextUsers,
        currentUser: prev.currentUser.id === userId ? { ...prev.currentUser, ...updates } : prev.currentUser,
        auditLogs: [auditLog, ...prev.auditLogs]
      };
    });

    apiPut(`/api/users/${userId}`, { updates });
  }, [state.users, addAuditLog]);

  const resetUserInitialPassword = useCallback((userId: string, tempPassword?: string): string => {
    const target = state.users.find(u => u.id === userId);
    if (!target) return '';

    const newPwd = tempPassword || generateTempPassword();
    const updated: UserProfile = {
      ...target,
      initialPassword: newPwd,
      mustChangePasswordOnNextLogin: true
    };

    const auditLog = addAuditLog(
      'إعادة تعيين كلمة المرور الأولية',
      'User',
      target.name,
      `قام المدير بتعيين كلمة مرور أولية جديدة للمستخدم ${target.name} وإلزامه بالتغيير عند أول دخول`
    );

    setState(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === userId ? updated : u)),
      currentUser: prev.currentUser.id === userId ? updated : prev.currentUser,
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiPost(`/api/users/${userId}/reset-password`, { newInitialPassword: newPwd });
    return newPwd;
  }, [state.users, addAuditLog]);

  // تغيير كلمة المرور: الخادم هو الذي يتحقق من كلمة المرور الحالية (لا تُخزَّن ولا تُقارَن في المتصفح)
  const changeUserPassword = useCallback(async (userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const target = state.users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'المستخدم غير موجود' };
    }

    if (!currentPassword) {
      return { success: false, message: 'يرجى إدخال كلمة المرور الحالية' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' };
    }

    let data: any;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, actorName: target.name })
      });
      data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data?.error || data?.message || 'فشل تغيير كلمة المرور' };
      }
    } catch (e) {
      return { success: false, message: 'تعذّر الاتصال بالخادم، لم تتغير كلمة المرور. حاول مرة أخرى.' };
    }

    const auditLog = addAuditLog(
      'تغيير كلمة المرور بنجاح',
      'User',
      target.name,
      `قام الموظف ${target.name} بتغيير كلمة المرور بنجاح`
    );

    const clean = (u: UserProfile): UserProfile => {
      const { initialPassword: _i, ...rest } = u;
      return { ...rest, mustChangePasswordOnNextLogin: false, passwordChangedAt: new Date().toISOString() };
    };

    setState(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === userId ? clean(u) : u)),
      currentUser: prev.currentUser.id === userId ? clean(prev.currentUser) : prev.currentUser,
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    return { success: true, message: 'تم تغيير كلمة المرور بنجاح ومتابعة الدخول' };
  }, [state.users, addAuditLog]);

  const deleteUser = useCallback((userId: string) => {
    if (userId === 'usr_admin') return;
    const target = state.users.find(u => u.id === userId);
    if (!target) return;

    const auditLog = addAuditLog(
      'حذف مستخدم',
      'User',
      target.name,
      `تم حذف المستخدم ${target.name} من النظام بواسطة المدير`
    );

    setState(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
      auditLogs: [auditLog, ...prev.auditLogs]
    }));

    apiDelete(`/api/users/${userId}`);
  }, [state.users, addAuditLog]);

  // تسجيل الدخول يتم عبر الخادم فقط (AuthContext → /api/auth/login) ولا يوجد تحقق محلي من كلمات المرور.
  const loginUser = useCallback((_usernameOrEmail: string, _password: string): { success: boolean; user?: UserProfile; error?: string } => {
    return {
      success: false,
      error: 'تسجيل الدخول يتم عبر الخادم فقط. يرجى استخدام شاشة الدخول الرئيسية.'
    };
  }, []);

  const logoutUser = useCallback(() => {
    if (auth && isFirebaseConfigured()) {
      signOut(auth).catch(() => {});
    }
    try {
      localStorage.removeItem('muhassil_current_user');
      sessionStorage.removeItem('mouhassil_session_id');
    } catch {}

    if (currentSessionId) {
      fetch('/api/sessions/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userId: state.currentUser?.id,
          actorName: state.currentUser?.name,
          actorRole: state.currentUser?.role
        })
      }).catch(() => {});
      setCurrentSessionId(null);
    }
    setIsLoggedIn(false);
  }, [currentSessionId, state.currentUser]);

  const reportActiveWindow = useCallback((windowName: string) => {
    setActiveWindowName(windowName);
    if (currentSessionId && state.currentUser?.id) {
      fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userId: state.currentUser.id,
          currentWindow: windowName,
          actionIncrement: true
        })
      }).catch(() => {});
    }
  }, [currentSessionId, state.currentUser?.id]);

  const forceDisconnectSession = useCallback(async (sessionId: string, targetUserId?: string, reason?: string) => {
    try {
      const res = await fetch('/api/sessions/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetUserId,
          reason,
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'فشل الاتصال بالخادم' };
    }
  }, [state.currentUser]);

  const sendAdminAlert = useCallback(async (params: { targetUserId?: string | null; targetUserName?: string; message: string; urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL' }) => {
    try {
      const res = await fetch('/api/sessions/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          senderName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { success: false };
    }
  }, [state.currentUser]);

  const toggleUserActiveStatus = useCallback(async (userId: string) => {
    const user = state.users.find(u => u.id === userId);
    if (!user || user.role === 'ADMIN') return;
    const newStatus = !user.isActive;

    try {
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { isActive: newStatus },
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });

      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, isActive: newStatus } : u)
      }));
    } catch {}
  }, [state.users, state.currentUser]);

  const updateUserPermissionsLive = useCallback(async (userId: string, permissions: Partial<UserPermissions>) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const merged = { ...user.permissions, ...permissions };

    try {
      await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { permissions: merged },
          actorName: state.currentUser.name,
          actorRole: state.currentUser.role
        })
      });

      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, permissions: merged } : u)
      }));
    } catch {}
  }, [state.users, state.currentUser]);

  const clearKickNotice = useCallback(() => {
    setKickNotice(null);
  }, []);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const derivedUnits = useMemo(
    () => reconcileUnits(state.units, state.contracts, today),
    [state.units, state.contracts, today]
  );

  const value = {
    ...state,
    // حالة الوحدات مشتقة من العقود لحظيًا (تتحدث تلقائيًا عند تغيّر اليوم أو العقود)
    units: derivedUnits,
    setCurrentUser,
    resetToDefaultData,
    recordPayment,
    reversePayment,
    recordExpense,
    generateContractInvoice,
    generateRecurringInvoicesBatch,
    createContract,
    terminateContract,
    createFixedAsset,
    postDepreciation,
    createProperty,
    createUnit,
    createTenant,
    createManualJournalEntry,
    createFiscalPeriod,
    updateFiscalPeriod,
    closeAccountingPeriod,
    reopenAccountingPeriod,
    deleteFiscalPeriod,
    checkDatePostingStatus,
    isPeriodClosedForDate,
    getClosedPeriodForDate,
    canUserPerform,
    isSectionAllowed,
    isSupervisoryOnly,
    recordInventoryTransaction,
    addAssetMaintenanceLog,
    updateInventoryItem,
    createUser,
    updateUser,
    resetUserInitialPassword,
    changeUserPassword,
    deleteUser,
    loginUser,
    logoutUser,
    isLoggedIn,
    setIsLoggedIn,
    isServerConnected,
    onlineCount,
    lastSyncMessage,
    activeSessions,
    currentSessionId,
    activeAlert,
    kickNotice,
    clearKickNotice,
    dismissAlert,
    reportActiveWindow,
    forceDisconnectSession,
    sendAdminAlert,
    toggleUserActiveStatus,
    updateUserPermissionsLive,
    
    // Database Backup & Disaster Recovery
    backups,
    backupSettings,
    isBackupLoading,
    refreshBackups,
    createInstantBackup,
    restoreDatabaseBackup,
    updateBackupSettings,
    deleteBackup,
    uploadAndRestoreBackup,

    // Smart Alerts & Intelligence
    smartAlerts,
    dismissSmartAlert,
    dismissedAlertIds,

    // System Environment & Clear Data
    clearSystemData
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
