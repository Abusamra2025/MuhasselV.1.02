// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Mouhassil — Real-Time Client-Server Backend Engine
 * Express + Server-Sent Events (SSE) + Authoritative Persistent Storage
 */

import 'dotenv/config'; // تحميل ملف .env (ADMIN_INITIAL_PASSWORD, PORT, ...)
import os from 'node:os';
import { loadSecret, signToken, verifyToken, LoginLimiter } from './auth';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
  INITIAL_AGGREGATED_DOCUMENTS,
  INITIAL_WORK_ORDERS,
  INITIAL_SETTLEMENTS
} from '../lib/initialData';
import { validateJournalBalance, ROUND } from '../lib/accountingEngine';
import {
  reconcileUnits,
  validateNewContract,
  validateTermination,
  applyTermination
} from '../lib/propertyService';
import {
  buildAcquisition,
  generateDepreciation,
  validateFixedAssetInput,
  mergeMissingAccounts
} from '../lib/fixedAssetsService';
import {
  hashPassword,
  verifyPassword,
  isHashedPassword,
  generatePassword,
  sanitizeUser,
  sanitizeUsers
} from './passwords';
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
  AuditLog,
  SystemSection,
  AccountingPeriod,
  PaymentAllocation,
  PaymentMethod,
  PaymentPurpose,
  ExpenseCategory,
  FiscalPeriodType,
  InventoryItem,
  InventoryTransaction,
  AssetMaintenanceLog,
  AggregatedDocument,
  UserSession,
  AdminAlertMessage,
  DatabaseBackupRecord,
  BackupSettings,
  BackupTrigger,
  BackupStatsSummary,
  MaintenanceWorkOrder,
  MoveOutSettlement,
  FixedAsset
} from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory: locate package.json from either app root or bundle path
const ROOT_DIR = fs.existsSync(path.resolve(__dirname, 'package.json'))
  ? __dirname
  : fs.existsSync(path.resolve(__dirname, '..', 'package.json'))
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '..', '..');

const PORT = parseInt(process.env.PORT || '3000', 10);
// يمكن توجيه البيانات إلى قرص دائم على منصات الاستضافة عبر المتغير MUHASSIL_DATA_DIR
const DATA_DIR = process.env.MUHASSIL_DATA_DIR
  ? path.resolve(process.env.MUHASSIL_DATA_DIR)
  : path.resolve(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'mouhassil_db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_SETTINGS_FILE = path.join(DATA_DIR, 'backup_settings.json');
const distPath = path.resolve(ROOT_DIR, 'dist');

// Ensure data and backup directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

interface ServerState {
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
  workOrders: MaintenanceWorkOrder[];
  settlements: MoveOutSettlement[];
  fixedAssets: FixedAsset[];
  systemMode?: 'DEMO' | 'PRODUCTION';
}

function getInitialState(): ServerState {
  return {
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
    workOrders: INITIAL_WORK_ORDERS,
    settlements: INITIAL_SETTLEMENTS,
    fixedAssets: [],
    systemMode: 'DEMO',
    auditLogs: [
      {
        id: 'log_server_init',
        timestamp: new Date().toISOString(),
        actorName: 'الخادم السحابي (Cloud Server)',
        actorRole: 'ADMIN',
        action: 'تشغيل وبدء خادم مُحصّل السحابي',
        entity: 'Server',
        entityId: 'SRV-01',
        details: 'تم تجهيز قاعدة البيانات المحاسبية المركزية بنجاح والمزامنة الحية مفعلة'
      }
    ]
  };
}

let dbState: ServerState;

function loadState(): ServerState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.invoices)) {
        if (!parsed.inventoryItems || parsed.inventoryItems.length === 0) parsed.inventoryItems = INITIAL_INVENTORY_ITEMS;
        if (!parsed.inventoryTransactions || parsed.inventoryTransactions.length === 0) parsed.inventoryTransactions = INITIAL_INVENTORY_TRANSACTIONS;
        if (!parsed.aggregatedDocuments) parsed.aggregatedDocuments = INITIAL_AGGREGATED_DOCUMENTS;
        if (!parsed.workOrders) parsed.workOrders = INITIAL_WORK_ORDERS;
        if (!parsed.settlements) parsed.settlements = INITIAL_SETTLEMENTS;
        
        const normalized = normalizeState(parsed);
        // نحفظ فورًا حتى لا تبقى كلمات مرور قديمة بنص صريح على القرص، ولا تتغير كلمة المرور الأولى عند كل إعادة تشغيل
        saveState(normalized);
        flushState();
        return normalized;
      }
    }
  } catch (err) {
    console.error('Error loading state from disk, using initial state:', err);
  }
  const initial = normalizeState(getInitialState());
  saveState(initial);
  return initial;
}

/**
 * ترحيل الحالة المحمّلة: يضمن وجود الحقول الجديدة، ويضيف الحسابات الناقصة،
 * ويعيد اشتقاق حالة الوحدات من العقود، ويؤمّن حساب المدير العام.
 */
function normalizeState(state: ServerState): ServerState {
  if (!Array.isArray(state.fixedAssets)) state.fixedAssets = [];
  state.accounts = mergeMissingAccounts(state.accounts, INITIAL_CHART_OF_ACCOUNTS);
  state.units = reconcileUnits(state.units || [], state.contracts || []);
  // المحاسبون الحاليون لديهم قائمة أقسام محفوظة؛ نضيف لهم قسم الأصول الثابتة (ويمكن للمدير سحبه لاحقًا)
  for (const u of state.users) {
    const sections = u.permissions?.allowedSections as string[] | undefined;
    if (u.role === 'ACCOUNTANT' && sections && sections.includes('accounting') && !sections.includes('fixed_assets')) {
      u.permissions.allowedSections = [...sections, 'fixed_assets'] as typeof u.permissions.allowedSections;
    }
  }
  ensureCredentials(state);
  return state;
}

const FIRST_RUN_PASSWORD_FILE = path.join(DATA_DIR, 'FIRST_RUN_ADMIN_PASSWORD.txt');

/**
 * سياسة كلمات المرور (كما في README):
 *  - لا توجد كلمات مرور افتراضية في الكود.
 *  - حساب المدير العام بلا كلمة مرور يأخذ ADMIN_INITIAL_PASSWORD، وإن لم تُضبط تُولَّد كلمة عشوائية
 *    تظهر مرة واحدة في سجل الخادم وفي data/FIRST_RUN_ADMIN_PASSWORD.txt، ويُلزَم بتغييرها عند أول دخول.
 *  - أي كلمة مرور قديمة بنص صريح تُحوَّل إلى مشفّرة.
 */
function ensureCredentials(state: ServerState) {
  for (const u of state.users) {
    if (u.password && !isHashedPassword(u.password)) {
      u.password = hashPassword(u.password);
    }
    // كلمة المرور المؤقتة لا تبقى على القرص بعد أن يغيّرها صاحبها
    if (u.mustChangePasswordOnNextLogin !== true && u.initialPassword) {
      delete u.initialPassword;
    }
  }

  const admin = state.users.find(u => u.role === 'ADMIN' || u.username === 'admin');
  if (!admin || admin.password) return;

  const fromEnv = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
  if (fromEnv && fromEnv.length < 8) {
    console.warn('[مُحصّل] ADMIN_INITIAL_PASSWORD أقصر من 8 خانات، سيتم توليد كلمة مرور عشوائية بدلًا منها.');
  }
  const useEnv = fromEnv.length >= 8;
  const initial = useEnv ? fromEnv : generatePassword(14);

  admin.password = hashPassword(initial);
  admin.mustChangePasswordOnNextLogin = true;
  delete admin.initialPassword;

  if (!useEnv) {
    try {
      fs.writeFileSync(
        FIRST_RUN_PASSWORD_FILE,
        `كلمة مرور المدير العام (admin) لأول دخول:\n${initial}\n\nسيُطلب منك تغييرها عند أول تسجيل دخول، ويُحذف هذا الملف تلقائيًا بعد التغيير.\n`,
        { encoding: 'utf-8', mode: 0o600 }
      );
    } catch (err) {
      console.error('[مُحصّل] تعذّر كتابة ملف كلمة المرور الأولى:', err);
    }
    console.log('============================================================');
    console.log(`[مُحصّل] كلمة مرور المدير العام لأول دخول (تظهر مرة واحدة): ${initial}`);
    console.log('============================================================');
  }
}

// الحفظ: دمج الكتابات المتتالية في كتابة واحدة (تأخير 200ms) مع كتابة ذرية (ملف مؤقت ثم إعادة تسمية)
let pendingSave: ServerState | null = null;
let saveTimer: NodeJS.Timeout | null = null;

function flushState() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingSave) return;
  const snapshot = pendingSave;
  pendingSave = null;
  try {
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snapshot), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('Error saving state to disk:', err);
  }
}

function saveState(stateToSave: ServerState) {
  pendingSave = stateToSave;
  if (saveTimer) return;
  saveTimer = setTimeout(flushState, 200);
}

process.on('exit', flushState);
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    flushState();
    process.exit(0);
  });
}

/** نسخة الحالة الآمنة للإرسال للمتصفح (بدون كلمات مرور) */
function publicState() {
  return { ...dbState, users: sanitizeUsers(dbState.users) };
}

dbState = loadState();

// ==========================================
// Central Automatic Backup Engine & Helpers
// ==========================================
const defaultBackupSettings: BackupSettings = {
  autoBackupEnabled: true,
  intervalMinutes: 30, // Default: every 30 minutes
  maxRetentionCount: 30, // Keep last 30 snapshots
  autoBackupOnPeriodClose: true,
  autoBackupOnReset: true,
  lastBackupTime: undefined,
  nextScheduledBackup: undefined
};

function loadBackupSettings(): BackupSettings {
  try {
    if (fs.existsSync(BACKUP_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BACKUP_SETTINGS_FILE, 'utf-8'));
      return { ...defaultBackupSettings, ...data };
    }
  } catch (e) {
    console.error('Error loading backup settings:', e);
  }
  return { ...defaultBackupSettings };
}

function saveBackupSettings(settings: BackupSettings) {
  try {
    fs.writeFileSync(BACKUP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving backup settings:', e);
  }
}

function calculateDbStats(state: ServerState): BackupStatsSummary {
  const totalCollections = (state.payments || []).filter(p => p.status === 'POSTED').reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalInvoiced = (state.invoices || []).reduce((acc, i) => acc + (i.amount || 0), 0);
  return {
    propertiesCount: state.properties?.length || 0,
    unitsCount: state.units?.length || 0,
    tenantsCount: state.tenants?.length || 0,
    contractsCount: state.contracts?.length || 0,
    invoicesCount: state.invoices?.length || 0,
    paymentsCount: state.payments?.length || 0,
    expensesCount: state.expenses?.length || 0,
    journalEntriesCount: state.journalEntries?.length || 0,
    inventoryItemsCount: state.inventoryItems?.length || 0,
    auditLogsCount: state.auditLogs?.length || 0,
    totalCollections: Math.round(totalCollections * 100) / 100,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100
  };
}

function pruneOldBackups(maxCount: number) {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
    if (files.length <= maxCount) return;

    const fileDetails = files.map(file => {
      const p = path.join(BACKUPS_DIR, file);
      return { file, path: p, mtime: fs.statSync(p).mtime.getTime() };
    }).sort((a, b) => a.mtime - b.mtime);

    const toDeleteCount = fileDetails.length - maxCount;
    for (let i = 0; i < toDeleteCount; i++) {
      fs.unlinkSync(fileDetails[i].path);
    }
  } catch (err) {
    console.error('Error pruning old backups:', err);
  }
}

function createBackupSnapshot(
  trigger: BackupTrigger,
  actorName: string = 'النظام السحابي الآلي',
  notes?: string
): DatabaseBackupRecord | null {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const nowIso = new Date().toISOString();
    const safeDate = nowIso.replace(/[:.]/g, '-');
    const backupId = `bkp_${safeDate}_${trigger.toLowerCase()}`;
    const filename = `${backupId}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    const stats = calculateDbStats(dbState);
    const backupPayload = {
      metadata: {
        id: backupId,
        filename,
        createdAt: nowIso,
        trigger,
        actorName,
        notes: notes || (trigger === 'AUTOMATIC_SCHEDULED' ? 'نسخ احتياطي تلقائي مجدول دورياً' : 'نسخة احتياطية يدوية'),
        stats,
        version: '2.5-PRO'
      },
      data: dbState
    };

    const serialized = JSON.stringify(backupPayload, null, 2);
    fs.writeFileSync(filePath, serialized, 'utf-8');

    const sizeBytes = Buffer.byteLength(serialized, 'utf-8');
    const record: DatabaseBackupRecord = {
      id: backupId,
      filename,
      createdAt: nowIso,
      sizeBytes,
      trigger,
      actorName,
      notes: backupPayload.metadata.notes,
      stats
    };

    const currentSettings = loadBackupSettings();
    currentSettings.lastBackupTime = nowIso;
    currentSettings.nextScheduledBackup = new Date(Date.now() + currentSettings.intervalMinutes * 60 * 1000).toISOString();
    saveBackupSettings(currentSettings);

    pruneOldBackups(currentSettings.maxRetentionCount || 30);

    return record;
  } catch (err) {
    console.error('Failed to create database backup snapshot:', err);
    return null;
  }
}

function getBackupList(): DatabaseBackupRecord[] {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
    const records: DatabaseBackupRecord[] = [];

    for (const file of files) {
      try {
        const p = path.join(BACKUPS_DIR, file);
        const stat = fs.statSync(p);
        const content = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && (parsed.data || parsed.accounts)) {
          const meta = parsed.metadata || {};
          const stateData = parsed.data || parsed;
          records.push({
            id: meta.id || file.replace('.json', ''),
            filename: file,
            createdAt: meta.createdAt || stat.mtime.toISOString(),
            sizeBytes: stat.size,
            trigger: meta.trigger || 'MANUAL_USER',
            actorName: meta.actorName || 'المستخدم',
            notes: meta.notes || 'نسخة احتياطية محفوظة',
            stats: meta.stats || calculateDbStats(stateData)
          });
        }
      } catch (e) {
        // Skip invalid file
      }
    }

    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error('Error reading backup list:', err);
    return [];
  }
}

// SSE Clients Registry
interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
  sessionId?: string;
}
const sseClients: SSEClient[] = [];
const activeSessions: Map<string, UserSession> = new Map();

function broadcastSessions() {
  const now = Date.now();
  // Mark idle if lastActiveTime was > 60 seconds ago
  const list = Array.from(activeSessions.values()).map(s => {
    if (s.status === 'ONLINE') {
      const diffSec = (now - new Date(s.lastActiveTime).getTime()) / 1000;
      if (diffSec > 60) {
        return { ...s, status: 'IDLE' as const };
      }
    }
    return s;
  });

  const payload = JSON.stringify({
    type: 'ONLINE_SESSIONS_UPDATE',
    sessions: list,
    onlineCount: list.filter(s => s.status !== 'DISCONNECTED').length,
    timestamp: new Date().toISOString()
  });

  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client dead
    }
  });
}

function broadcastStateUpdate(actionType: string, summary: string, actorName?: string) {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    actionType,
    summary,
    actorName: actorName || 'النظام',
    timestamp: new Date().toISOString(),
    state: publicState()
  });

  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client connection might be dead
    }
  });
}

// Server Audit Helper
function addServerAuditLog(
  actorName: string,
  actorRole: any,
  action: string,
  entity: string,
  entityId: string,
  details: string
) {
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorName: actorName || 'مستخدم',
    actorRole: actorRole || 'ADMIN',
    action,
    entity,
    entityId,
    details
  };
  dbState.auditLogs.unshift(newLog);
}

function isPeriodClosed(dateStr: string): AccountingPeriod | undefined {
  return dbState.periods.find(p => p.isClosed && dateStr >= p.startDate && dateStr <= p.endDate);
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ---- المصادقة: كل مسارات /api (عدا الدخول وفحص الصحة) تتطلب رمز جلسة صالحًا ----
  app.set('trust proxy', true);
  const sessionSecret = loadSecret(DATA_DIR);
  const loginLimiter = new LoginLimiter();
  app.use('/api', (req: Request, res: Response, next) => {
    if (req.path === '/auth/login' || req.path === '/health') return next();
    const hdr = req.headers.authorization;
    const raw = hdr && hdr.startsWith('Bearer ') ? hdr.slice(7) : (typeof req.query.token === 'string' ? req.query.token : '');
    const parsed = verifyToken(sessionSecret, raw);
    const user = parsed ? dbState.users.find(u => u.id === parsed.uid && u.isActive !== false) : undefined;
    if (!user) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'انتهت الجلسة، يرجى تسجيل الدخول من جديد' });
    }
    (req as any).authUser = user;
    // هوية المنفّذ تُؤخذ من الرمز لا من ما يرسله المتصفح
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      req.body.actorName = user.name;
      req.body.actorRole = user.role;
    }
    if (req.query) {
      (req.query as any).actorName = user.name;
      (req.query as any).actorRole = user.role;
    }
    // مسارات الإدارة العليا: للمدير العام فقط (يُتحقق من الرمز لا من ما يرسله المتصفح)
    const adminOnly: Array<[string, RegExp]> = [
      ['POST', /^\/users$/], ['PUT', /^\/users\/[^/]+$/], ['DELETE', /^\/users\/[^/]+$/],
      ['POST', /^\/users\/[^/]+\/reset-password$/], ['POST', /^\/users\/update$/],
      ['POST', /^\/backups\/(restore|settings|upload)$/], ['DELETE', /^\/backups\/[^/]+$/],
      ['GET', /^\/backups\/[^/]+\/download$/],
      ['POST', /^\/reset$/], ['POST', /^\/system\/clear-data$/]
    ];
    if (user.role !== 'ADMIN' && adminOnly.some(([m, re]) => m === req.method && re.test(req.path))) {
      return res.status(403).json({ success: false, error: 'هذه العملية للمدير العام فقط' });
    }
    next();
  });

  // 1. SSE Real-Time Sync Stream
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;

    const newClient: SSEClient = { id: clientId, res, userId, sessionId };
    sseClients.push(newClient);

    // Initial message to confirm connection + send active sessions
    const sessionsList = Array.from(activeSessions.values());
    res.write(`data: ${JSON.stringify({
      type: 'CONNECTED',
      clientId,
      onlineCount: sessionsList.filter(s => s.status !== 'DISCONNECTED').length || 1,
      sessions: sessionsList
    })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === clientId);
      if (idx !== -1) {
        const closedClient = sseClients[idx];
        sseClients.splice(idx, 1);
        if (closedClient.sessionId && activeSessions.has(closedClient.sessionId)) {
          const s = activeSessions.get(closedClient.sessionId)!;
          // Only mark disconnected if no other SSE client has the same sessionId
          const stillActive = sseClients.some(c => c.sessionId === closedClient.sessionId);
          if (!stillActive) {
            s.status = 'DISCONNECTED';
            s.lastActiveTime = new Date().toISOString();
            activeSessions.set(closedClient.sessionId, s);
            broadcastSessions();
          }
        }
      }
    });
  });

  // 1.1 Sessions API: Get all active sessions
  app.get('/api/sessions', (req: Request, res: Response) => {
    const list = Array.from(activeSessions.values());
    res.json({
      sessions: list,
      onlineCount: list.filter(s => s.status !== 'DISCONNECTED').length
    });
  });

  // 1.15 Direct Authentication API: Verify user credentials (email/username/phone + password/initialPassword)
  // عناوين الشبكة المحلية لمشاركة النظام مع الموظفين على نفس الواي فاي
  app.get('/api/network-info', (_req: Request, res: Response) => {
    const lan: string[] = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const i of ifaces[name] || []) {
        if (i.family === 'IPv4' && !i.internal) lan.push(i.address);
      }
    }
    res.json({ port: PORT, lan });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const identifier = (req.body.identifier || req.body.email || req.body.username || '').toString().trim();
      const password = (req.body.password || '').toString().trim();

      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' });
      }

      const cleanId = identifier.toLowerCase();
      const phoneDigits = identifier.replace(/[\s+-]/g, '');

      const limiterKey = `${req.ip}|${cleanId}`;
      const waitMs = loginLimiter.retryAfterMs(limiterKey);
      if (waitMs > 0) {
        return res.status(429).json({ success: false, error: `محاولات كثيرة خاطئة. حاول بعد ${Math.ceil(waitMs / 60000)} دقيقة` });
      }

      // Search dbState.users
      let user = dbState.users.find(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUsername = (u.username || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();
        const uPhoneDigits = (u.phone || '').replace(/[\s+-]/g, '');
        const uId = (u.id || '').toLowerCase().trim();

        return (
          uEmail === cleanId ||
          uUsername === cleanId ||
          uName === cleanId ||
          uId === cleanId ||
          (phoneDigits.length >= 7 && uPhoneDigits && uPhoneDigits.endsWith(phoneDigits))
        );
      });

      // Special check: Admin account fallback
      if (!user && (cleanId === 'ebow2012@gmail.com' || cleanId === 'admin')) {
        user = dbState.users.find(u => u.role === 'ADMIN');
      }

      if (!user) {
        loginLimiter.fail(limiterKey);
        return res.status(404).json({
          success: false,
          error: 'اسم المستخدم أو البريد الإلكتروني غير مسجل في النظام'
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          error: 'تم تجميد أو إيقاف هذا الحساب من قِبل الإدارة العامة'
        });
      }

      // التحقق من كلمة المرور: المشفّرة، أو المؤقتة ما دام تغييرها لا يزال مطلوبًا.
      // لا توجد أي كلمات مرور افتراضية أو مخفية في الكود.
      const matchesMain = verifyPassword(password, user.password);
      const matchesTemp =
        !matchesMain &&
        user.mustChangePasswordOnNextLogin === true &&
        verifyPassword(password, user.initialPassword);
      const isMatch = matchesMain || matchesTemp;

      // ترقية الحسابات القديمة المخزّنة بنص صريح إلى كلمة مرور مشفّرة
      if (matchesMain && user.password && !isHashedPassword(user.password)) {
        user.password = hashPassword(password);
      }

      if (!isMatch) {
        loginLimiter.fail(limiterKey);
        return res.status(401).json({
          success: false,
          error: 'كلمة المرور غير صحيحة، يرجى التأكد من الرمز المدخل'
        });
      }
      loginLimiter.success(limiterKey);

      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      const newSession: UserSession = {
        sessionId,
        userId: user.id,
        username: user.username || user.name,
        userName: user.name,
        userRole: user.role,
        titleAr: user.titleAr || 'موظف',
        loginTime: new Date().toISOString(),
        lastActiveTime: new Date().toISOString(),
        currentWindow: user.role === 'ADMIN' ? 'لوحة إشراف المدير العام الموحدة' : 'نافذة القسم المصرح به',
        ipAddress: Array.isArray(ip) ? ip[0] : String(ip),
        deviceType: req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 45) : 'متصفح ويب',
        status: 'ONLINE',
        totalActionsCount: 1
      };

      activeSessions.set(sessionId, newSession);

      addServerAuditLog(
        user.name,
        user.role,
        'تسجيل دخول ناجح للمستخدم',
        'UserSession',
        sessionId,
        `قام الموظف (${user.name} - ${user.titleAr}) بتسجيل الدخول إلى النظام بنجاح`
      );

      // Ensure allowedSections and report permissions are present on returned user object
      if (!user.permissions || !user.permissions.allowedSections || user.permissions.allowedSections.length === 0) {
        user.permissions = {
          ...(user.permissions || {}),
          allowedSections: getRoleSections(user.role),
          canReviewReports: true,
          canExportReports: true
        };
      }

      saveState(dbState);
      broadcastSessions();

      return res.json({
        success: true,
        user: sanitizeUser(user),
        sessionId,
        token: signToken(sessionSecret, user.id)
      });
    } catch (err: any) {
      console.error('[Auth API] Login error:', err);
      return res.status(500).json({ success: false, error: 'حدث خطأ في خادم المصادقة' });
    }
  });

  // 1.2 Sessions API: Register user login
  app.post('/api/sessions/login', (req: Request, res: Response) => {
    const { userId, username, userName, userRole, titleAr, currentWindow, deviceType } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'معرف المستخدم مطلوب' });
    }

    const user = dbState.users.find(u => u.id === userId);
    if (user && user.isActive === false) {
      return res.status(403).json({ success: false, error: 'تم تجميد هذا الحساب من قِبل المدير العام' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const newSession: UserSession = {
      sessionId,
      userId,
      username: username || user?.username || 'user',
      userName: userName || user?.name || 'مستخدم',
      userRole: userRole || user?.role || 'ACCOUNTANT',
      titleAr: titleAr || user?.titleAr || 'موظف',
      loginTime: new Date().toISOString(),
      lastActiveTime: new Date().toISOString(),
      currentWindow: currentWindow || 'نافذة الدخول الرئيسية',
      ipAddress: Array.isArray(ip) ? ip[0] : String(ip),
      deviceType: deviceType || (req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 45) : 'متصفح ويب'),
      status: 'ONLINE',
      totalActionsCount: 1
    };

    // If user already had another session, mark it replaced
    for (const [key, s] of activeSessions.entries()) {
      if (s.userId === userId && s.status !== 'DISCONNECTED') {
        s.status = 'DISCONNECTED';
        activeSessions.set(key, s);
      }
    }

    activeSessions.set(sessionId, newSession);

    addServerAuditLog(
      newSession.userName,
      newSession.userRole,
      'تسجيل دخول أونلاين للنظام',
      'UserSession',
      sessionId,
      `تم تسجيل دخول الموظف (${newSession.userName} - ${newSession.titleAr}) إلى النظام بنجاح من جهاز: ${newSession.deviceType}`
    );

    saveState(dbState);
    broadcastSessions();

    res.json({ success: true, sessionId, session: newSession });
  });

  // 1.3 Sessions API: Heartbeat & Navigation Ping
  app.post('/api/sessions/heartbeat', (req: Request, res: Response) => {
    const { sessionId, userId, currentWindow, actionIncrement } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    let session = activeSessions.get(sessionId);
    if (!session && userId) {
      const user = dbState.users.find(u => u.id === userId);
      if (user) {
        session = {
          sessionId,
          userId: user.id,
          username: user.username || 'user',
          userName: user.name,
          userRole: user.role,
          titleAr: user.titleAr,
          loginTime: new Date().toISOString(),
          lastActiveTime: new Date().toISOString(),
          currentWindow: currentWindow || 'نافذة النظام',
          status: 'ONLINE',
          totalActionsCount: 1
        };
        activeSessions.set(sessionId, session);
      }
    }

    if (session) {
      session.lastActiveTime = new Date().toISOString();
      session.status = 'ONLINE';
      if (currentWindow) session.currentWindow = currentWindow;
      if (actionIncrement) session.totalActionsCount = (session.totalActionsCount || 0) + 1;
      activeSessions.set(sessionId, session);
      broadcastSessions();
    }

    res.json({ success: true, status: session?.status || 'ONLINE' });
  });

  // 1.4 Sessions API: Logout
  app.post('/api/sessions/logout', (req: Request, res: Response) => {
    const { sessionId, actorName, actorRole } = req.body;
    if (sessionId && activeSessions.has(sessionId)) {
      const s = activeSessions.get(sessionId)!;
      s.status = 'DISCONNECTED';
      s.lastActiveTime = new Date().toISOString();
      activeSessions.set(sessionId, s);

      addServerAuditLog(
        actorName || s.userName,
        actorRole || s.userRole,
        'تسجيل خروج من النظام',
        'UserSession',
        sessionId,
        `قام الموظف (${s.userName}) بتسجيل الخروج رسمياً وإغلاق الجلسة`
      );

      saveState(dbState);
      broadcastSessions();
    }
    res.json({ success: true });
  });

  // 1.5 Sessions API: Force Disconnect / Kick (Manager Only)
  app.post('/api/sessions/disconnect', (req: Request, res: Response) => {
    const { sessionId, targetUserId, reason, actorName, actorRole } = req.body;
    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'فقط المدير العام يملك صلاحية إنهاء جلسات المستخدمين' });
    }

    let targetName = 'الموظف';
    if (sessionId && activeSessions.has(sessionId)) {
      const s = activeSessions.get(sessionId)!;
      targetName = s.userName;
      s.status = 'DISCONNECTED';
      s.lastActiveTime = new Date().toISOString();
      activeSessions.set(sessionId, s);
    } else if (targetUserId) {
      const targetUser = dbState.users.find(u => u.id === targetUserId);
      if (targetUser) targetName = targetUser.name;
      for (const [k, s] of activeSessions.entries()) {
        if (s.userId === targetUserId) {
          s.status = 'DISCONNECTED';
          activeSessions.set(k, s);
        }
      }
    }

    const reasonText = reason || 'إجراء رقابي مباشر من قِبل المدير العام';

    addServerAuditLog(
      actorName || 'المدير العام',
      'ADMIN',
      'إنهاء جلسة مستخدم إدارياً (طرد فوري)',
      'UserSession',
      sessionId || targetUserId || 'ALL',
      `قام المدير العام بإنهاء جلسة (${targetName}) فورياً وإسقاط اتصاله. السبب: ${reasonText}`
    );

    // Broadcast direct kick SSE event to close the user screen
    const kickPayload = JSON.stringify({
      type: 'SESSION_KICKED',
      sessionId,
      targetUserId,
      reason: reasonText,
      timestamp: new Date().toISOString()
    });

    sseClients.forEach(client => {
      try {
        client.res.write(`data: ${kickPayload}\n\n`);
      } catch (e) {}
    });

    saveState(dbState);
    broadcastSessions();

    res.json({ success: true, message: `تم إنهاء جلسة ${targetName} فوراً بنجاح` });
  });

  // 1.6 Sessions API: Send Administrative Live Alert (Manager Only)
  app.post('/api/sessions/alert', (req: Request, res: Response) => {
    const { targetUserId, targetUserName, message, urgency, senderName, actorRole } = req.body;
    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'فقط المدير العام يملك صلاحية إرسال التنبيهات الإدارية' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'نص التنبيه مطلوب' });
    }

    const alert: AdminAlertMessage = {
      id: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      targetUserId: targetUserId || null,
      targetUserName: targetUserName || (targetUserId ? 'موظف محدد' : 'كافة الموظفين المتصلين أونلاين'),
      senderName: senderName || 'المدير العام',
      message: message.trim(),
      urgency: urgency || 'URGENT'
    };

    addServerAuditLog(
      senderName || 'المدير العام',
      'ADMIN',
      'إرسال تنبيه إداري فوري',
      'AdminAlert',
      alert.id,
      `تم إرسال تنبيه إداري إلى (${alert.targetUserName}): "${alert.message}" [مستوى الأهمية: ${alert.urgency}]`
    );

    const alertPayload = JSON.stringify({
      type: 'ADMIN_ALERT',
      alert,
      timestamp: new Date().toISOString()
    });

    sseClients.forEach(client => {
      try {
        client.res.write(`data: ${alertPayload}\n\n`);
      } catch (e) {}
    });

    saveState(dbState);
    res.json({ success: true, alert });
  });

  // Helper: Get default allowed sections per role
  const getRoleSections = (userRole: string): SystemSection[] => {
    switch (userRole) {
      case 'EXECUTIVE':
        return ['dashboard', 'reports'];
      case 'ACCOUNTANT':
        return ['dashboard', 'properties', 'contracts', 'invoices', 'accounting', 'fixed_assets', 'expenses', 'reports'];
      case 'CASHIER':
        return ['dashboard', 'payments', 'invoices', 'reports'];
      case 'STOREKEEPER':
        return ['dashboard', 'inventory', 'reports'];
      case 'AUDITOR':
        return ['dashboard', 'reports', 'audit', 'tests'];
      case 'ADMIN':
      default:
        return ['manager_portal', 'dashboard', 'properties', 'contracts', 'invoices', 'payments', 'expenses', 'accounting', 'fixed_assets', 'inventory', 'reports', 'users', 'audit', 'tests'];
    }
  };

  // 1.7 Users Management: Get all users (with normalized allowedSections)
  app.get('/api/users', (req: Request, res: Response) => {
    dbState.users = dbState.users.map(u => {
      const currentSections = u.permissions?.allowedSections;
      if (!currentSections || currentSections.length === 0) {
        return {
          ...u,
          permissions: {
            ...(u.permissions || {}),
            allowedSections: getRoleSections(u.role),
            canReviewReports: true,
            canExportReports: true
          }
        };
      }
      return u;
    });
    res.json({ success: true, users: sanitizeUsers(dbState.users) });
  });

  // 1.8 Users Management: Create new user account
  app.post('/api/users', (req: Request, res: Response) => {
    try {
      const incoming = req.body.user || req.body;
      const {
        name,
        email,
        role,
        titleAr,
        username,
        phone,
        password,
        initialPassword,
        permissions,
        actorName,
        actorRole
      } = incoming;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'اسم الموظف مطلوب' });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = dbState.users.find(
        u => u.email?.trim().toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        return res.status(200).json({
          success: true,
          user: sanitizeUser(existingUser),
          message: 'المستخدم مسجل مسبقاً في النظام'
        });
      }

      const safeId = incoming.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const safePwd = initialPassword || password || generatePassword(10);
      const userRole = role || 'ACCOUNTANT';

      const newUser: UserProfile = {
        id: safeId,
        name: name.trim(),
        email: normalizedEmail,
        username: (username || normalizedEmail.split('@')[0]).trim(),
        role: userRole,
        titleAr: titleAr || (userRole === 'ADMIN' ? 'المدير العام' : userRole === 'EXECUTIVE' ? 'إدارة عليا (لوحات مؤشرات ورقابة)' : 'محاسب مالي معتمد'),
        phone: (phone || '').trim(),
        initialPassword: safePwd,
        password: hashPassword(safePwd),
        mustChangePasswordOnNextLogin: incoming.mustChangePasswordOnNextLogin ?? true,
        isActive: incoming.isActive !== undefined ? incoming.isActive : true,
        permissions: {
          allowedSections: permissions?.allowedSections || getRoleSections(userRole),
          canInput: permissions?.canInput !== undefined ? permissions.canInput : (userRole === 'ACCOUNTANT' || userRole === 'CASHIER' || userRole === 'STOREKEEPER'),
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: permissions?.canIssueReceipts !== undefined ? permissions.canIssueReceipts : userRole === 'CASHIER',
          canReverseReceipts: false,
          canRecordExpenses: permissions?.canRecordExpenses !== undefined ? permissions.canRecordExpenses : userRole === 'ACCOUNTANT',
          canCreateJournalEntries: permissions?.canCreateJournalEntries !== undefined ? permissions.canCreateJournalEntries : userRole === 'ACCOUNTANT',
          canManageContracts: permissions?.canManageContracts !== undefined ? permissions.canManageContracts : userRole === 'ACCOUNTANT',
          canManageProperties: permissions?.canManageProperties !== undefined ? permissions.canManageProperties : false,
          canManageInventory: permissions?.canManageInventory !== undefined ? permissions.canManageInventory : userRole === 'STOREKEEPER',
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: userRole === 'ADMIN',
          ...(permissions || {})
        },
        createdAt: incoming.createdAt || new Date().toISOString()
      };

      dbState.users.push(newUser);

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'إضافة موظف جديد ومنح الصلاحيات',
        'UserProfile',
        newUser.id,
        `تم تسجيل حساب الموظف (${newUser.name}) برتبة (${newUser.titleAr}) وبريد (${newUser.email})`
      );

      saveState(dbState);
      broadcastStateUpdate(
        'USER_CREATED',
        `تمت إضافة الموظف الجديد (${newUser.name} - ${newUser.titleAr}) بنجاح`,
        actorName
      );

      res.status(201).json({ success: true, user: sanitizeUser(newUser) });
    } catch (err: any) {
      console.error('Error in POST /api/users:', err);
      res.status(500).json({ success: false, error: err.message || 'حدث خطأ أثناء حفظ المستخدم' });
    }
  });

  // 1.9 Users Management: Delete user
  app.delete('/api/users/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { actorName, actorRole } = req.body;

      if (id === 'usr_admin') {
        return res.status(403).json({ success: false, error: 'لا يمكن حذف حساب المدير العام الرئيسي' });
      }

      const userIndex = dbState.users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      }

      const deletedUser = dbState.users[userIndex];
      dbState.users.splice(userIndex, 1);

      // Disconnect user session if active
      for (const [k, s] of activeSessions.entries()) {
        if (s.userId === id) {
          s.status = 'DISCONNECTED';
          activeSessions.set(k, s);
        }
      }

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'حذف مستخدم من النظام',
        'UserProfile',
        id,
        `تم حذف حساب الموظف (${deletedUser.name}) نهائياً من قاعدة البيانات`
      );

      saveState(dbState);
      broadcastStateUpdate('USER_DELETED', `تم حذف حساب المستخدم (${deletedUser.name})`, actorName);
      broadcastSessions();

      res.json({ success: true, message: `تم حذف المستخدم ${deletedUser.name} بنجاح` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1.10 Users Management: Update user profile & permissions
  app.post('/api/users/update', (req: Request, res: Response) => {
    const { userId, updates, actorName, actorRole } = req.body;
    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'فقط المدير العام مخول بتعديل الصلاحيات والمستخدمين' });
    }

    const userIndex = dbState.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const oldUser = dbState.users[userIndex];
    const safeUpdates: Partial<UserProfile> = { ...(updates || {}) };
    if (typeof safeUpdates.password === 'string' && safeUpdates.password.trim()) {
      safeUpdates.password = hashPassword(safeUpdates.password.trim());
    } else {
      delete safeUpdates.password;
    }
    const updatedUser: UserProfile = {
      ...oldUser,
      ...safeUpdates
    };
    dbState.users[userIndex] = updatedUser;

    addServerAuditLog(
      actorName || 'المدير العام',
      'ADMIN',
      'تعديل صلاحيات/بيانات مستخدم',
      'UserProfile',
      userId,
      `تم تحديث بيانات وصلاحيات (${updatedUser.name}) - الحالة: ${updatedUser.isActive ? 'نشط' : 'موقف ومجمد'}`
    );

    // If disabled, force kick active session immediately
    if (updatedUser.isActive === false) {
      for (const [k, s] of activeSessions.entries()) {
        if (s.userId === userId) {
          s.status = 'DISCONNECTED';
          activeSessions.set(k, s);
        }
      }
      const kickPayload = JSON.stringify({
        type: 'SESSION_KICKED',
        targetUserId: userId,
        reason: 'تم تجميد حسابك وسحب الصلاحيات من قِبل المدير العام',
        timestamp: new Date().toISOString()
      });
      sseClients.forEach(c => {
        try { c.res.write(`data: ${kickPayload}\n\n`); } catch(e) {}
      });
      broadcastSessions();
    }

    saveState(dbState);
    broadcastStateUpdate('USER_UPDATED', `تم تحديث بيانات وصلاحيات الموظف (${updatedUser.name})`, actorName);

    res.json({ success: true, user: sanitizeUser(updatedUser) });
  });

  // 2. Health & Status Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      onlineClients: sseClients.length,
      serverTime: new Date().toISOString(),
      periodsCount: dbState.periods.length,
      paymentsCount: dbState.payments.length
    });
  });

  // 3. Get Full State
  app.get('/api/state', (req: Request, res: Response) => {
    res.json(publicState());
  });

  // 4. Record Payment (سند قبض)
  app.post('/api/payments', (req: Request, res: Response) => {
    const {
      tenantId,
      contractId,
      purpose,
      amount,
      paymentDate,
      paymentMethod,
      destinationAccountCode,
      checkNumber,
      bankReference,
      notes,
      allocations,
      idempotencyKey,
      actorName,
      actorRole
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ السند غير صحيح' });
    }

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط ولا يصدر حركات محاسبية (سندات القبض تصدر بواسطة أمين الصندوق والمحاسب المخول)'
      });
    }

    const closed = isPeriodClosed(paymentDate);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الترحيل: التاريخ (${paymentDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closed.name}: من ${closed.startDate} إلى ${closed.endDate}) لمنع التعديل بأثر رجعي`
      });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = dbState.payments.find(p => p.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `تم رفض المعاملة: السند مسجل مسبقاً برقم (${existing.receiptNumber})`
        });
      }
    }

    const tenant = dbState.tenants.find(t => t.id === tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'المستأجر غير موجود في النظام' });
    }

    const nextReceiptNum = `REC-2026-${String(dbState.payments.length + 1).padStart(4, '0')}`;
    const nextJvNum = `JV-2026-${String(dbState.journalEntries.length + 1).padStart(4, '0')}`;
    const paymentId = `pay_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    let contract = dbState.contracts.find(c => c.id === contractId);
    if (!contract && tenantId) {
      contract = dbState.contracts.find(c => c.tenantId === tenantId && c.status === 'ACTIVE');
    }

    // Allocation logic
    const recordedAllocations: PaymentAllocation[] = [];
    let remainingAmount = numAmount;

    if (purpose === 'RENT_INVOICE') {
      if (Array.isArray(allocations) && allocations.length > 0) {
        for (const alloc of allocations) {
          const invIndex = dbState.invoices.findIndex(i => i.id === alloc.invoiceId);
          if (invIndex >= 0) {
            const inv = dbState.invoices[invIndex];
            const allocAmt = Number(alloc.amount);
            if (allocAmt > inv.balance) {
              return res.status(400).json({
                success: false,
                error: `مبلغ التخصيص (${allocAmt}) يتجاوز المتبقي على الفاتورة (${inv.balance})`
              });
            }
            const newPaid = ROUND(inv.paidAmount + allocAmt);
            const newBal = ROUND(inv.amount - newPaid);
            dbState.invoices[invIndex] = {
              ...inv,
              paidAmount: newPaid,
              balance: newBal,
              status: newBal === 0 ? 'PAID' : 'PARTIAL'
            };
            recordedAllocations.push({ invoiceId: inv.id, amount: allocAmt });
            remainingAmount = ROUND(remainingAmount - allocAmt);
          }
        }
      } else {
        const openInvoices = dbState.invoices
          .filter(i => i.tenantId === tenantId && i.balance > 0)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        for (const inv of openInvoices) {
          if (remainingAmount <= 0) break;
          const allocAmount = Math.min(remainingAmount, inv.balance);
          const invIndex = dbState.invoices.findIndex(i => i.id === inv.id);
          const newPaid = ROUND(inv.paidAmount + allocAmount);
          const newBal = ROUND(inv.amount - newPaid);
          dbState.invoices[invIndex] = {
            ...inv,
            paidAmount: newPaid,
            balance: newBal,
            status: newBal === 0 ? 'PAID' : 'PARTIAL'
          };
          recordedAllocations.push({ invoiceId: inv.id, amount: allocAmount });
          remainingAmount = ROUND(remainingAmount - allocAmount);
        }
      }
    }

    // Determine target credit account
    let creditAccountCode = '1130';
    let creditAccountName = 'مدينو الإيجارات (ذمم المستأجرين)';
    if (purpose === 'SECURITY_DEPOSIT') {
      creditAccountCode = '2110';
      creditAccountName = 'تأمينات المستأجرين المستردة';
    } else if (purpose === 'ADVANCE_RENT' || remainingAmount > 0) {
      creditAccountCode = '2120';
      creditAccountName = 'إيرادات إيجار مقبوضة مقدماً';
    }

    const destAccount = dbState.accounts.find(a => a.code === destinationAccountCode) || dbState.accounts[2];

    // Balanced Journal Entry
    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date: paymentDate,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: purpose === 'SECURITY_DEPOSIT' ? 'SECURITY_DEPOSIT' : 'PAYMENT',
      refId: paymentId,
      description: `سند قبض ${nextReceiptNum} - ${notes || 'تحصيل من المستأجر ' + tenant.name}`,
      lines: [
        {
          id: `jl_${Date.now()}_dr`,
          accountCode: destAccount.code,
          accountName: destAccount.nameAr,
          debit: numAmount,
          credit: 0,
          description: `إيداع في ${destAccount.nameAr} من ${tenant.name}`
        },
        {
          id: `jl_${Date.now()}_cr`,
          accountCode: creditAccountCode,
          accountName: creditAccountName,
          debit: 0,
          credit: numAmount,
          description: `تسوية حساب ${tenant.name}`,
          propertyId: contract?.propertyId,
          unitId: contract?.unitId,
          tenantId: tenant.id
        }
      ],
      totalDebit: numAmount,
      totalCredit: numAmount,
      isBalanced: true,
      createdBy: actorName || 'أمين الصندوق',
      createdAt: new Date().toISOString()
    };

    const newPayment: Payment = {
      id: paymentId,
      receiptNumber: nextReceiptNum,
      contractId: contract?.id,
      tenantId,
      propertyId: contract?.propertyId,
      unitId: contract?.unitId,
      purpose,
      amount: numAmount,
      paymentDate,
      paymentMethod,
      destinationAccountCode,
      checkNumber,
      bankReference,
      receivedBy: actorName || 'أمين الصندوق',
      status: 'POSTED',
      notes,
      journalEntryId: jvId,
      allocations: recordedAllocations,
      idempotencyKey,
      createdAt: new Date().toISOString()
    };

    // Update tenant balance
    const tenantIndex = dbState.tenants.findIndex(t => t.id === tenantId);
    if (tenantIndex >= 0) {
      if (purpose === 'SECURITY_DEPOSIT') {
        dbState.tenants[tenantIndex].securityDepositHeld = ROUND(dbState.tenants[tenantIndex].securityDepositHeld + numAmount);
      } else {
        dbState.tenants[tenantIndex].balance = ROUND(dbState.tenants[tenantIndex].balance - numAmount);
      }
    }

    dbState.payments.unshift(newPayment);
    dbState.journalEntries.unshift(newJournalEntry);

    addServerAuditLog(
      actorName,
      actorRole,
      'إصدار سند قبض وترحيل محاسبي',
      'Payment',
      nextReceiptNum,
      `تم استلام مبلغ ${numAmount} ر.س من ${tenant.name} بطريقة ${paymentMethod} وترحيل القيد ${nextJvNum}`
    );

    saveState(dbState);
    broadcastStateUpdate('PAYMENT_RECORDED', `تم تسجيل سند قبض ${nextReceiptNum} بمبلغ ${numAmount} ر.س من ${tenant.name}`, actorName);

    res.json({ success: true, payment: newPayment });
  });

  // 5. Reverse Payment (عكس سند قبض)
  app.post('/api/payments/:id/reverse', (req: Request, res: Response) => {
    const paymentId = req.params.id;
    const { reason, actorName, actorRole } = req.body;

    if (actorRole === 'CASHIER' || actorRole === 'AUDITOR') {
      return res.status(403).json({ success: false, error: 'غير مصرح: عكس السندات مقصور على المحاسب والمدير' });
    }

    const paymentIndex = dbState.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, error: 'سند القبض غير موجود' });
    }

    const payment = dbState.payments[paymentIndex];
    if (payment.status === 'REVERSED') {
      return res.status(400).json({ success: false, error: 'السند ملغى ومعكوس بالفعل' });
    }

    const closed = isPeriodClosed(payment.paymentDate);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الإلغاء: التاريخ (${payment.paymentDate}) يقع ضمن فترة مقفلة ومحمية (${closed.name}) لمنع التعديل بأثر رجعي`
      });
    }

    const tenant = dbState.tenants.find(t => t.id === payment.tenantId);
    const nextJvNum = `JV-2026-${String(dbState.journalEntries.length + 1).padStart(4, '0')}`;
    const reversalJvId = `jv_rev_${Date.now()}`;

    // Restore invoices
    payment.allocations.forEach(alloc => {
      const invIndex = dbState.invoices.findIndex(i => i.id === alloc.invoiceId);
      if (invIndex >= 0) {
        const inv = dbState.invoices[invIndex];
        const newPaid = Math.max(0, ROUND(inv.paidAmount - alloc.amount));
        const newBal = ROUND(inv.amount - newPaid);
        dbState.invoices[invIndex] = {
          ...inv,
          paidAmount: newPaid,
          balance: newBal,
          status: newBal === inv.amount ? 'UNPAID' : newBal > 0 ? 'PARTIAL' : 'PAID'
        };
      }
    });

    // Restore tenant balance
    const tenantIndex = dbState.tenants.findIndex(t => t.id === payment.tenantId);
    if (tenantIndex >= 0) {
      if (payment.purpose === 'SECURITY_DEPOSIT') {
        dbState.tenants[tenantIndex].securityDepositHeld = Math.max(0, ROUND(dbState.tenants[tenantIndex].securityDepositHeld - payment.amount));
      } else {
        dbState.tenants[tenantIndex].balance = ROUND(dbState.tenants[tenantIndex].balance + payment.amount);
      }
    }

    // Balanced Reversing Journal Entry
    const origJv = dbState.journalEntries.find(j => j.id === payment.journalEntryId);
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
      description: `قيد عكسي لسند القبض ${payment.receiptNumber} - السبب: ${reason || 'خطأ إداري'}`,
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
      createdBy: actorName || 'المحاسب',
      createdAt: new Date().toISOString()
    };

    dbState.payments[paymentIndex] = {
      ...payment,
      status: 'REVERSED',
      reversedAt: new Date().toISOString(),
      reversedBy: actorName || 'المحاسب',
      reversalReason: reason,
      reversalEntryId: reversalJvId
    };

    dbState.journalEntries.unshift(reversingEntry);

    addServerAuditLog(
      actorName,
      actorRole,
      'عكس وإلغاء سند قبض',
      'Payment',
      payment.receiptNumber,
      `تم عكس السند بمبلغ ${payment.amount} ر.س. السبب: ${reason}. قيد عكسي: ${nextJvNum}`
    );

    saveState(dbState);
    broadcastStateUpdate('PAYMENT_REVERSED', `تم عكس سند القبض ${payment.receiptNumber} بمبلغ ${payment.amount} ر.س`, actorName);

    res.json({ success: true });
  });

  // 6. Record Expense (سند صرف)
  app.post('/api/expenses', (req: Request, res: Response) => {
    const {
      propertyId,
      unitId,
      category,
      expenseAccountCode,
      paymentAccountCode,
      amount,
      paymentMethod,
      date,
      payee,
      description,
      actorName,
      actorRole
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ المصروف غير صحيح' });
    }

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط ولا يصدر حركات محاسبية (سندات الصرف تسجل بواسطة المحاسب المالي)'
      });
    }

    const closed = isPeriodClosed(date);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الترحيل: تاريخ المصروف (${date}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closed.name})`
      });
    }

    const expAccount = dbState.accounts.find(a => a.code === expenseAccountCode) || dbState.accounts.find(a => a.code === '5100')!;
    const payAccount = dbState.accounts.find(a => a.code === paymentAccountCode) || dbState.accounts.find(a => a.code === '1120')!;
    const property = dbState.properties.find(p => p.id === propertyId);

    const nextVoucherNum = `EXP-2026-${String(dbState.expenses.length + 1).padStart(3, '0')}`;
    const nextJvNum = `JV-2026-${String(dbState.journalEntries.length + 1).padStart(4, '0')}`;
    const expId = `exp_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'EXPENSE',
      refId: expId,
      description: `سند صرف ${nextVoucherNum} - ${description} (${property?.name})`,
      lines: [
        {
          id: `jl_exp_${Date.now()}_dr`,
          accountCode: expAccount.code,
          accountName: expAccount.nameAr,
          debit: numAmount,
          credit: 0,
          description: `${description} - ${property?.name}`,
          propertyId,
          unitId
        },
        {
          id: `jl_exp_${Date.now()}_cr`,
          accountCode: payAccount.code,
          accountName: payAccount.nameAr,
          debit: 0,
          credit: numAmount,
          description: `سداد للمورد ${payee}`
        }
      ],
      totalDebit: numAmount,
      totalCredit: numAmount,
      isBalanced: true,
      createdBy: actorName || 'المحاسب',
      createdAt: new Date().toISOString()
    };

    const newExpense: PropertyExpense = {
      id: expId,
      voucherNumber: nextVoucherNum,
      propertyId,
      unitId,
      category,
      expenseAccountCode: expAccount.code,
      paymentAccountCode: payAccount.code,
      amount: numAmount,
      paymentMethod,
      date,
      payee,
      description,
      status: 'POSTED',
      journalEntryId: jvId,
      createdBy: actorName || 'المحاسب',
      createdAt: new Date().toISOString()
    };

    dbState.expenses.unshift(newExpense);
    dbState.journalEntries.unshift(newJournalEntry);

    addServerAuditLog(
      actorName,
      actorRole,
      'تسجيل وترحيل سند صرف',
      'Expense',
      nextVoucherNum,
      `تم صرف مبلغ ${numAmount} ر.س لصالح ${payee} - عقار ${property?.name}`
    );

    saveState(dbState);
    broadcastStateUpdate('EXPENSE_RECORDED', `تم تسجيل سند صرف ${nextVoucherNum} بمبلغ ${numAmount} ر.س (${property?.name})`, actorName);

    res.json({ success: true, expense: newExpense });
  });

  // 7. Generate Invoice (إصدار فاتورة إيجار)
  app.post('/api/invoices', (req: Request, res: Response) => {
    const { contractId, dueDate, periodStart, periodEnd, amount, actorName, actorRole } = req.body;

    const contract = dbState.contracts.find(c => c.id === contractId);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'عقد الإيجار غير موجود' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ الفاتورة غير صحيح' });
    }

    // Duplicate check for contract and period
    const existing = dbState.invoices.find(
      i => i.contractId === contractId && i.periodStart === periodStart && i.periodEnd === periodEnd
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `توجد فاتورة مصدرة مسبقاً لنفس العقد والفترة (${existing.invoiceNumber})`
      });
    }

    const closed = isPeriodClosed(dueDate);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الترحيل: تاريخ الاستحقاق (${dueDate}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closed.name})`
      });
    }

    const tenant = dbState.tenants.find(t => t.id === contract.tenantId);
    const nextInvNum = `INV-2026-${String(dbState.invoices.length + 1).padStart(3, '0')}`;
    const nextJvNum = `JV-2026-${String(dbState.journalEntries.length + 1).padStart(4, '0')}`;
    const invId = `inv_${Date.now()}`;
    const jvId = `jv_${Date.now()}`;

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: nextJvNum,
      date: dueDate,
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
          debit: numAmount,
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
          credit: numAmount,
          description: `إيراد إيجار عن الفترة من ${periodStart} إلى ${periodEnd}`
        }
      ],
      totalDebit: numAmount,
      totalCredit: numAmount,
      isBalanced: true,
      createdBy: actorName || 'النظام',
      createdAt: new Date().toISOString()
    };

    const newInvoice: Invoice = {
      id: invId,
      invoiceNumber: nextInvNum,
      contractId: contract.id,
      tenantId: contract.tenantId,
      propertyId: contract.propertyId,
      unitId: contract.unitId,
      dueDate,
      periodStart,
      periodEnd,
      amount: numAmount,
      paidAmount: 0,
      balance: numAmount,
      status: 'UNPAID',
      journalEntryId: jvId,
      createdAt: new Date().toISOString()
    };

    const tenantIndex = dbState.tenants.findIndex(t => t.id === contract.tenantId);
    if (tenantIndex >= 0) {
      dbState.tenants[tenantIndex].balance = ROUND(dbState.tenants[tenantIndex].balance + numAmount);
    }

    dbState.invoices.unshift(newInvoice);
    dbState.journalEntries.unshift(newJournalEntry);

    addServerAuditLog(
      actorName,
      actorRole,
      'إصدار فاتورة إيجار دورية',
      'Invoice',
      nextInvNum,
      `تم إصدار فاتورة بمبلغ ${numAmount} ر.س على المستأجر ${tenant?.name}`
    );

    saveState(dbState);
    broadcastStateUpdate('INVOICE_GENERATED', `تم إصدار فاتورة إيجار ${nextInvNum} بمبلغ ${numAmount} ر.س للمستأجر ${tenant?.name}`, actorName);

    res.json({ success: true, invoice: newInvoice });
  });

  // 8. Create Contract (عقد إيجار)
  app.post('/api/contracts', (req: Request, res: Response) => {
    const { contractData, actorName, actorRole } = req.body;
    if (!contractData || typeof contractData !== 'object') {
      return res.status(400).json({ success: false, error: 'بيانات العقد غير مكتملة' });
    }

    // معرّف العقد يأتي من العميل ليبقى واحدًا في الطرفين (منع تكرار الطلب أيضًا)
    const contractId: string =
      typeof contractData.id === 'string' && contractData.id ? contractData.id : `con_${Date.now()}`;
    const already = dbState.contracts.find(c => c.id === contractId);
    if (already) {
      return res.json({ success: true, contract: already, duplicate: true });
    }

    // نفس التحقق الموحد المستخدم في العميل: منع تداخل العقود ومنع تأجير وحدة قيد الصيانة
    const validation = validateNewContract({
      units: dbState.units,
      contracts: dbState.contracts,
      unitId: contractData.unitId,
      startDate: contractData.startDate,
      endDate: contractData.endDate
    });
    if (!validation.ok) {
      return res.status(409).json({ success: false, error: validation.error });
    }

    const newContract: Contract = {
      ...contractData,
      id: contractId,
      status: contractData.status || 'ACTIVE',
      createdAt: contractData.createdAt || new Date().toISOString().split('T')[0]
    };

    dbState.contracts.unshift(newContract);
    // حالة الوحدة تُشتق من العقود (مصدر حقيقة واحد)
    dbState.units = reconcileUnits(dbState.units, dbState.contracts);

    const tenant = dbState.tenants.find(t => t.id === contractData.tenantId);
    addServerAuditLog(
      actorName,
      actorRole,
      'إنشاء عقد إيجار جديد',
      'Contract',
      newContract.contractNumber,
      `تم إبرام عقد للمستأجر ${tenant?.name} بقيمة سنوية ${newContract.annualRent} ر.س`
    );

    saveState(dbState);
    broadcastStateUpdate('CONTRACT_CREATED', `تم توثيق عقد جديد ${newContract.contractNumber} للمستأجر ${tenant?.name}`, actorName);

    res.json({ success: true, contract: newContract });
  });

  // 8b. Terminate Contract (إنهاء عقد وإخلاء الوحدة)
  app.post('/api/contracts/:id/terminate', (req: Request, res: Response) => {
    const { date, reason, actorName, actorRole } = req.body;

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط، وإنهاء العقود يتم بواسطة المحاسب المالي'
      });
    }

    const contract = dbState.contracts.find(c => c.id === req.params.id);
    const validation = validateTermination(contract, date);
    if (!validation.ok || !contract) {
      return res.status(contract ? 400 : 404).json({ success: false, error: validation.error });
    }

    const terminated = applyTermination(contract, { date, reason });
    dbState.contracts = dbState.contracts.map(c => (c.id === terminated.id ? terminated : c));
    dbState.units = reconcileUnits(dbState.units, dbState.contracts);

    const tenant = dbState.tenants.find(t => t.id === contract.tenantId);
    const unit = dbState.units.find(u => u.id === contract.unitId);
    addServerAuditLog(
      actorName,
      actorRole,
      'إنهاء عقد إيجار وإخلاء الوحدة',
      'Contract',
      contract.contractNumber,
      `تم إنهاء عقد ${contract.contractNumber} للمستأجر ${tenant?.name || ''} (الوحدة ${unit?.unitNumber || ''}) بتاريخ ${date}${reason ? ` — السبب: ${reason}` : ''}`
    );

    saveState(dbState);
    broadcastStateUpdate('CONTRACT_TERMINATED', `تم إنهاء العقد ${contract.contractNumber} وإخلاء الوحدة`, actorName);

    res.json({ success: true, contract: terminated });
  });

  // 8c. Fixed Assets (الأصول الثابتة) — اقتناء بقيد مزدوج
  app.post('/api/fixed-assets', (req: Request, res: Response) => {
    const { input, id, actorName, actorRole } = req.body;

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط، وتسجيل الأصول الثابتة يتم بواسطة المحاسب المالي'
      });
    }
    if (!input || typeof input !== 'object') {
      return res.status(400).json({ success: false, error: 'بيانات الأصل غير مكتملة' });
    }

    if (typeof id === 'string' && id) {
      const existing = dbState.fixedAssets.find(a => a.id === id);
      if (existing) return res.json({ success: true, asset: existing, duplicate: true });
    }

    const validation = validateFixedAssetInput(input, dbState.accounts);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const closed = isPeriodClosed(input.purchaseDate);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الترحيل: تاريخ الاقتناء (${input.purchaseDate}) يقع ضمن فترة محاسبية مقفلة (${closed.name})`
      });
    }

    const { asset, entry } = buildAcquisition({
      input,
      accounts: dbState.accounts,
      existingAssets: dbState.fixedAssets,
      existingEntries: dbState.journalEntries,
      createdBy: actorName || 'النظام',
      id: typeof id === 'string' && id ? id : undefined
    });

    dbState.fixedAssets.unshift(asset);
    dbState.journalEntries.unshift(entry);

    addServerAuditLog(
      actorName,
      actorRole,
      'تسجيل أصل ثابت جديد',
      'FixedAsset',
      asset.assetCode,
      `تم تسجيل الأصل ${asset.name} (${asset.assetCode}) بتكلفة ${asset.cost} وترحيل القيد ${entry.entryNumber}`
    );

    saveState(dbState);
    broadcastStateUpdate('FIXED_ASSET_CREATED', `تم تسجيل أصل ثابت جديد: ${asset.name}`, actorName);

    res.status(201).json({ success: true, asset, entry });
  });

  app.post('/api/fixed-assets/depreciation', (req: Request, res: Response) => {
    const { throughMonth, actorName, actorRole } = req.body;

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط، وترحيل الإهلاك يتم بواسطة المحاسب المالي'
      });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(throughMonth || ''))) {
      return res.status(400).json({ success: false, error: 'الشهر المحدد غير صحيح (الصيغة YYYY-MM)' });
    }

    const result = generateDepreciation({
      assets: dbState.fixedAssets,
      accounts: dbState.accounts,
      existingEntries: dbState.journalEntries,
      throughMonth,
      createdBy: actorName || 'النظام',
      isDateClosed: d => !!isPeriodClosed(d)
    });

    if (result.entries.length > 0) {
      dbState.fixedAssets = result.assets;
      dbState.journalEntries = [...result.entries].reverse().concat(dbState.journalEntries);

      addServerAuditLog(
        actorName,
        actorRole,
        'ترحيل إهلاك الأصول الثابتة',
        'FixedAsset',
        throughMonth,
        `تم ترحيل ${result.entries.length} قيد إهلاك بإجمالي ${result.totalAmount} حتى ${throughMonth}`
      );

      saveState(dbState);
      broadcastStateUpdate('DEPRECIATION_POSTED', `تم ترحيل إهلاك الأصول الثابتة حتى ${throughMonth}`, actorName);
    }

    res.json({
      success: true,
      assets: result.assets,
      entries: result.entries,
      totalAmount: result.totalAmount,
      monthsPosted: result.monthsPosted,
      blockedMonth: result.blockedMonth
    });
  });

  // 9. Manual Journal Entry (قيد يدوي)
  app.post('/api/journal', (req: Request, res: Response) => {
    const { date, description, lines, actorName, actorRole } = req.body;

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير رقابية فقط ولا يصدر قيود محاسبية يدوية (القيود تسجل بواسطة المحاسب القانوني)'
      });
    }

    const closed = isPeriodClosed(date);
    if (closed) {
      return res.status(403).json({
        success: false,
        error: `حظر الترحيل: تاريخ القيد (${date}) يقع ضمن فترة محاسبية مقفلة ومحمية (${closed.name})`
      });
    }

    const journalLines = lines.map((l: any, idx: number) => {
      const acc = dbState.accounts.find(a => a.code === l.accountCode);
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
      return res.status(400).json({
        success: false,
        error: `القيد غير متوازن! إجمالي المدين: ${validation.totalDebit} | إجمالي الدائن: ${validation.totalCredit}`
      });
    }

    const nextJvNum = `JV-2026-${String(dbState.journalEntries.length + 1).padStart(4, '0')}`;
    const newEntry: JournalEntry = {
      id: `jv_man_${Date.now()}`,
      entryNumber: nextJvNum,
      date,
      postingDate: new Date().toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'MANUAL',
      description,
      lines: journalLines,
      totalDebit: validation.totalDebit,
      totalCredit: validation.totalCredit,
      isBalanced: true,
      createdBy: actorName || 'المحاسب',
      createdAt: new Date().toISOString()
    };

    dbState.journalEntries.unshift(newEntry);

    addServerAuditLog(
      actorName,
      actorRole,
      'تسجيل قيد يومية يدوي',
      'JournalEntry',
      nextJvNum,
      `تم ترحيل القيد ${nextJvNum}: ${description}`
    );

    saveState(dbState);
    broadcastStateUpdate('JOURNAL_ENTRY_POSTED', `تم ترحيل قيد يومية متوازن ${nextJvNum}: ${description}`, actorName);

    res.json({ success: true, entry: newEntry });
  });

  // 10. Fiscal Periods Management Endpoints
  app.post('/api/periods', (req: Request, res: Response) => {
    const { name, fiscalYear, periodType, startDate, endDate, notes, actorName, actorRole } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'البيانات غير مكتملة' });
    }

    const newPeriod: AccountingPeriod = {
      id: `period_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      fiscalYear: Number(fiscalYear) || 2026,
      periodType: periodType || 'QUARTERLY',
      startDate,
      endDate,
      isClosed: false,
      notes
    };

    dbState.periods.push(newPeriod);
    dbState.periods.sort((a, b) => a.startDate.localeCompare(b.startDate));

    addServerAuditLog(
      actorName,
      actorRole,
      'تعريف فترة مالية جديدة',
      'AccountingPeriod',
      newPeriod.name,
      `تم تعريف الفترة المالية (${newPeriod.name}: من ${newPeriod.startDate} إلى ${newPeriod.endDate}) للسنة ${newPeriod.fiscalYear}`
    );

    saveState(dbState);
    broadcastStateUpdate('PERIOD_CREATED', `تم تعريف فترة مالية جديدة: ${newPeriod.name}`, actorName);

    res.json({ success: true, period: newPeriod });
  });

  app.put('/api/periods/:id', (req: Request, res: Response) => {
    const periodId = req.params.id;
    const { name, fiscalYear, periodType, startDate, endDate, notes, actorName, actorRole } = req.body;

    const pIdx = dbState.periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) {
      return res.status(404).json({ success: false, error: 'الفترة غير موجودة' });
    }

    if (dbState.periods[pIdx].isClosed) {
      return res.status(403).json({ success: false, error: 'لا يمكن تعديل فترة مقفلة ومحمية' });
    }

    dbState.periods[pIdx] = {
      ...dbState.periods[pIdx],
      name: name?.trim() || dbState.periods[pIdx].name,
      fiscalYear: Number(fiscalYear) || dbState.periods[pIdx].fiscalYear,
      periodType: periodType || dbState.periods[pIdx].periodType,
      startDate: startDate || dbState.periods[pIdx].startDate,
      endDate: endDate || dbState.periods[pIdx].endDate,
      notes: notes || dbState.periods[pIdx].notes
    };

    addServerAuditLog(
      actorName,
      actorRole,
      'تحديث بيانات فترة مالية',
      'AccountingPeriod',
      name,
      `تم تعديل نطاق الفترة المالية من ${startDate} إلى ${endDate}`
    );

    saveState(dbState);
    broadcastStateUpdate('PERIOD_UPDATED', `تم تحديث بيانات الفترة المالية: ${name}`, actorName);

    res.json({ success: true });
  });

  app.post('/api/periods/:id/close', (req: Request, res: Response) => {
    const periodId = req.params.id;
    const { reason, actorName, actorRole } = req.body;

    const pIdx = dbState.periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) {
      return res.status(404).json({ success: false, error: 'الفترة غير موجودة' });
    }

    const p = dbState.periods[pIdx];
    if (p.isClosed) {
      return res.status(400).json({ success: false, error: 'الفترة مقفلة بالفعل' });
    }

    const effectiveReason = reason || 'إقفال دوري معتمد وحظر الترحيل بأثر رجعي';
    dbState.periods[pIdx] = {
      ...p,
      isClosed: true,
      closedAt: new Date().toISOString().split('T')[0],
      closedBy: actorName || 'الإدارة المالية',
      closeReason: effectiveReason
    };

    addServerAuditLog(
      actorName,
      actorRole,
      'إقفال وحماية فترة محاسبية',
      'AccountingPeriod',
      p.name,
      `تم إقفال الفترة (${p.name}: من ${p.startDate} إلى ${p.endDate}) ومنع الترحيل بأثر رجعي بواسطة ${actorName}`
    );

    saveState(dbState);
    broadcastStateUpdate('PERIOD_CLOSED', `تم إقفال وحماية الفترة المالية: ${p.name} ومنع الحركات بأثر رجعي`, actorName);

    res.json({ success: true });
  });

  app.post('/api/periods/:id/reopen', (req: Request, res: Response) => {
    const periodId = req.params.id;
    const { reason, actorName, actorRole } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'يرجى تقديم مبرر رسمي لإعادة فتح الفترة' });
    }

    const pIdx = dbState.periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) {
      return res.status(404).json({ success: false, error: 'الفترة غير موجودة' });
    }

    const p = dbState.periods[pIdx];
    dbState.periods[pIdx] = {
      ...p,
      isClosed: false,
      unlockedAt: new Date().toISOString().split('T')[0],
      unlockedBy: actorName || 'المدير العام',
      unlockReason: reason.trim()
    };

    addServerAuditLog(
      actorName,
      actorRole,
      'إلغاء قفل وإعادة فتح فترة مالية',
      'AccountingPeriod',
      p.name,
      `تمت إعادة فتح الفترة (${p.name}) بواسطة ${actorName}. المبرر: ${reason.trim()}`
    );

    saveState(dbState);
    broadcastStateUpdate('PERIOD_REOPENED', `تمت إعادة فتح الفترة المالية: ${p.name}`, actorName);

    res.json({ success: true });
  });

  app.delete('/api/periods/:id', (req: Request, res: Response) => {
    const periodId = req.params.id;
    const { actorName, actorRole } = req.body;

    const pIdx = dbState.periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) {
      return res.status(404).json({ success: false, error: 'الفترة غير موجودة' });
    }

    const p = dbState.periods[pIdx];
    if (p.isClosed) {
      return res.status(403).json({ success: false, error: 'لا يمكن حذف فترة مقفلة ومحمية' });
    }

    dbState.periods.splice(pIdx, 1);

    addServerAuditLog(
      actorName,
      actorRole,
      'حذف فترة مالية',
      'AccountingPeriod',
      p.name,
      `تم حذف الفترة المالية (${p.name}) بواسطة ${actorName}`
    );

    saveState(dbState);
    broadcastStateUpdate('PERIOD_DELETED', `تم حذف الفترة المالية: ${p.name}`, actorName);

    res.json({ success: true });
  });

  // 11. Property, Unit & Tenant Endpoints
  app.post('/api/properties', (req: Request, res: Response) => {
    const { property, actorName, actorRole } = req.body;
    const newProp: Property = {
      ...property,
      id:
        typeof property?.id === 'string' && property.id && !dbState.properties.some(p => p.id === property.id)
          ? property.id
          : `prop_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    dbState.properties.push(newProp);

    addServerAuditLog(
      actorName,
      actorRole,
      'إضافة عقار جديد',
      'Property',
      newProp.name,
      `تمت إضافة عقار ${newProp.name} في ${newProp.city}`
    );

    saveState(dbState);
    broadcastStateUpdate('PROPERTY_CREATED', `تمت إضافة عقار جديد: ${newProp.name}`, actorName);

    res.json({ success: true, property: newProp });
  });

  app.post('/api/units', (req: Request, res: Response) => {
    const { unit, actorName, actorRole } = req.body;
    const newUnit: Unit = {
      ...unit,
      id:
        typeof unit?.id === 'string' && unit.id && !dbState.units.some(u => u.id === unit.id)
          ? unit.id
          : `unit_${Date.now()}`
    };

    dbState.units.push(newUnit);

    addServerAuditLog(
      actorName,
      actorRole,
      'إضافة وحدة عقارية',
      'Unit',
      newUnit.unitNumber,
      `تمت إضافة الوحدة رقم ${newUnit.unitNumber}`
    );

    saveState(dbState);
    broadcastStateUpdate('UNIT_CREATED', `تمت إضافة وحدة عقارية جديدة: ${newUnit.unitNumber}`, actorName);

    res.json({ success: true, unit: newUnit });
  });

  app.post('/api/tenants', (req: Request, res: Response) => {
    const { tenant, actorName, actorRole } = req.body;
    const newTenant: Tenant = {
      ...tenant,
      id: `ten_${Date.now()}`,
      balance: 0,
      securityDepositHeld: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    dbState.tenants.push(newTenant);

    addServerAuditLog(
      actorName,
      actorRole,
      'تسجيل مستأجر جديد',
      'Tenant',
      newTenant.name,
      `تم تسجيل المستأجر ${newTenant.name} (${newTenant.phone})`
    );

    saveState(dbState);
    broadcastStateUpdate('TENANT_CREATED', `تم تسجيل مستأجر جديد: ${newTenant.name}`, actorName);

    res.json({ success: true, tenant: newTenant });
  });

  // 12. User & Permissions Management Endpoints
  app.post('/api/users', (req: Request, res: Response) => {
    const rawUser = req.body.user || req.body;
    const actorName = req.body.actorName || 'المدير العام';
    const actorRole = req.body.actorRole || 'ADMIN';

    if (!rawUser || !rawUser.name || (!rawUser.role && !rawUser.email)) {
      return res.status(400).json({ success: false, error: 'بيانات المستخدم غير مكتملة' });
    }

    const initialPwd = rawUser.initialPassword || rawUser.password || generatePassword(10);
    const userRole = rawUser.role || 'EXECUTIVE';
    const normalizedEmail = (rawUser.email || '').trim().toLowerCase();

    const newUser: UserProfile = {
      ...rawUser,
      id: rawUser.id || `usr_${Date.now()}`,
      role: userRole,
      titleAr: rawUser.titleAr || (userRole === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
      username: rawUser.username || (normalizedEmail ? normalizedEmail.split('@')[0] : `user_${Date.now()}`),
      email: normalizedEmail,
      initialPassword: initialPwd,
      password: hashPassword(initialPwd),
      mustChangePasswordOnNextLogin: rawUser.mustChangePasswordOnNextLogin !== undefined ? rawUser.mustChangePasswordOnNextLogin : true,
      isActive: rawUser.isActive !== undefined ? rawUser.isActive : true,
      permissions: rawUser.permissions || {
        allowedSections: ['dashboard', 'reports'],
        canInput: false,
        canReviewReports: true,
        canPrintDocs: true,
        canIssueReceipts: userRole === 'CASHIER',
        canReverseReceipts: false,
        canRecordExpenses: userRole === 'ACCOUNTANT',
        canCreateJournalEntries: userRole === 'ACCOUNTANT',
        canManageContracts: userRole === 'ACCOUNTANT',
        canManageProperties: false,
        canManageInventory: userRole === 'STOREKEEPER',
        canClosePeriods: false,
        canExportReports: true,
        canManageUsers: userRole === 'ADMIN'
      }
    };

    const existingIdx = dbState.users.findIndex(u => 
      u.id === newUser.id || 
      (normalizedEmail && u.email && u.email.toLowerCase() === normalizedEmail)
    );

    if (existingIdx >= 0) {
      dbState.users[existingIdx] = {
        ...dbState.users[existingIdx],
        ...newUser
      };
    } else {
      dbState.users.push(newUser);
    }

    addServerAuditLog(
      actorName,
      actorRole,
      'إضافة مستخدم جديد ومنح الصلاحيات',
      'User',
      newUser.name,
      `تمت إضافة الموظف (${newUser.name} - ${newUser.titleAr}) وتعيين كلمة المرور الأولية المؤقتة وتخصيص الصلاحيات`
    );

    saveState(dbState);
    broadcastStateUpdate('USER_CREATED', `تمت إضافة مستخدم جديد: ${newUser.name}`, actorName);

    res.json({ success: true, user: sanitizeUser(newUser) });
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const userId = req.params.id;
    const { updates, actorName, actorRole } = req.body;

    const uIdx = dbState.users.findIndex(u => u.id === userId);
    if (uIdx === -1) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    if (actorRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'فقط المدير العام مخول بتعديل الصلاحيات والمستخدمين' });
    }

    // كلمات المرور لا تُعدَّل من هنا أبدًا (استخدم مسارات إعادة التعيين/التغيير المخصصة)
    const { password: _pw, initialPassword: _ip, ...safeUpdates } = (updates || {}) as Partial<UserProfile>;

    const prevUser = dbState.users[uIdx];
    dbState.users[uIdx] = {
      ...prevUser,
      ...safeUpdates
    };

    addServerAuditLog(
      actorName,
      actorRole,
      'تحديث صلاحيات وبيانات مستخدم',
      'User',
      prevUser.name,
      `تم تعديل الصلاحيات والبيانات للمستخدم ${prevUser.name} (${prevUser.titleAr})`
    );

    saveState(dbState);
    broadcastStateUpdate('USER_UPDATED', `تم تحديث صلاحيات المستخدم: ${prevUser.name}`, actorName);

    res.json({ success: true, user: sanitizeUser(dbState.users[uIdx]) });
  });

  app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
    const userId = req.params.id;
    const { newInitialPassword, actorName, actorRole } = req.body;

    const uIdx = dbState.users.findIndex(u => u.id === userId);
    if (uIdx === -1) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const targetUser = dbState.users[uIdx];
    const generatedPwd = newInitialPassword || generatePassword(10);

    dbState.users[uIdx] = {
      ...targetUser,
      initialPassword: generatedPwd,
      password: hashPassword(generatedPwd),
      mustChangePasswordOnNextLogin: true // Reset flag
    };

    addServerAuditLog(
      actorName,
      actorRole,
      'إعادة تعيين كلمة مرور أولية لمستخدم',
      'User',
      targetUser.name,
      `قام المدير بتعيين كلمة مرور أولية جديدة للمستخدم ${targetUser.name} وإلزامه بتغييرها عند أول دخول`
    );

    saveState(dbState);
    broadcastStateUpdate('USER_PASSWORD_RESET', `تمت إعادة تعيين كلمة المرور الأولية للمستخدم: ${targetUser.name}`, actorName);

    res.json({ success: true, initialPassword: generatedPwd });
  });

  app.post('/api/users/:id/change-password', (req: Request, res: Response) => {
    const userId = req.params.id;
    const { currentPassword, newPassword, actorName } = req.body;

    const uIdx = dbState.users.findIndex(u => u.id === userId);
    if (uIdx === -1) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const targetUser = dbState.users[uIdx];
    // يجب إدخال كلمة المرور الحالية (أو المؤقتة) والتحقق منها دائمًا
    const currentOk =
      !!currentPassword &&
      (verifyPassword(currentPassword, targetUser.password) ||
        (targetUser.mustChangePasswordOnNextLogin === true &&
          verifyPassword(currentPassword, targetUser.initialPassword)));

    if (!currentOk) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات' });
    }

    const { initialPassword: _dropTemp, ...userWithoutTemp } = targetUser;
    dbState.users[uIdx] = {
      ...userWithoutTemp,
      password: hashPassword(newPassword),
      mustChangePasswordOnNextLogin: false, // Changed successfully
      passwordChangedAt: new Date().toISOString()
    };

    if (targetUser.role === 'ADMIN') {
      try {
        if (fs.existsSync(FIRST_RUN_PASSWORD_FILE)) fs.unlinkSync(FIRST_RUN_PASSWORD_FILE);
      } catch {
        // تجاهل
      }
    }

    addServerAuditLog(
      actorName || targetUser.name,
      targetUser.role,
      'تغيير كلمة المرور الأولية بنجاح',
      'User',
      targetUser.name,
      `قام الموظف ${targetUser.name} بتغيير كلمة المرور الأولية بنجاح عند تسجيل الدخول الأول`
    );

    saveState(dbState);
    broadcastStateUpdate('USER_PASSWORD_CHANGED', `قام الموظف ${targetUser.name} بتحديث كلمة المرور`, targetUser.name);

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const userId = req.params.id;
    const { actorName, actorRole } = req.body;

    if (userId === 'usr_admin') {
      return res.status(403).json({ success: false, error: 'لا يمكن حذف حساب المدير العام الرئيسي' });
    }

    const uIdx = dbState.users.findIndex(u => u.id === userId);
    if (uIdx === -1) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const targetUser = dbState.users[uIdx];
    dbState.users.splice(uIdx, 1);

    addServerAuditLog(
      actorName,
      actorRole,
      'حذف مستخدم من النظام',
      'User',
      targetUser.name,
      `تم حذف المستخدم ${targetUser.name} (${targetUser.titleAr}) بواسطة المدير`
    );

    saveState(dbState);
    broadcastStateUpdate('USER_DELETED', `تم حذف المستخدم: ${targetUser.name}`, actorName);

    res.json({ success: true });
  });

  // 13. Inventory & Warehouse Transactions (محاسب المخازن والمستودعات والعهد)
  app.post('/api/inventory/transaction', (req: Request, res: Response) => {
    const { type, itemId, quantity, propertyId, recipientName, notes, date, actorName, actorRole } = req.body;

    if (actorRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'وظيفة المدير العام رقابية وإشرافية فقط؛ حركات المخازن والصرف تسجل حصراً من نافذة محاسب المخازن'
      });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, error: 'الكمية المدخلة غير صحيحة' });
    }

    const item = dbState.inventoryItems.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'الصنف المخزني غير موجود' });
    }

    if ((type === 'OUTBOUND' || type === 'CUSTODY_ASSIGN') && item.quantityOnHand < numQty) {
      return res.status(400).json({
        success: false,
        error: `الرصيد المتاح بالمستودع (${item.quantityOnHand}) غير كافٍ لصرف الكمية المطلوبة (${numQty})`
      });
    }

    // Update stock quantity
    if (type === 'INBOUND') {
      item.quantityOnHand += numQty;
    } else {
      item.quantityOnHand -= numQty;
    }
    item.totalValue = item.quantityOnHand * item.unitPrice;

    const property = dbState.properties.find(p => p.id === propertyId);
    const docNumber = `TR-${new Date().getFullYear()}-${String(dbState.inventoryTransactions.length + 1).padStart(3, '0')}`;

    const newTx: InventoryTransaction = {
      id: `tr_inv_${Date.now()}`,
      documentNumber: docNumber,
      type,
      date: date || new Date().toISOString().split('T')[0],
      itemId: item.id,
      itemName: item.name,
      quantity: numQty,
      unitPrice: item.unitPrice,
      totalAmount: numQty * item.unitPrice,
      propertyId: property?.id,
      propertyName: property?.name,
      recipientName: recipientName || 'المستودع',
      issuedBy: actorName || 'محاسب المخازن',
      notes: notes || ''
    };

    dbState.inventoryTransactions.unshift(newTx);

    const actionAr = type === 'INBOUND' ? 'توريد واستلام مخزني' : type === 'OUTBOUND' ? 'صرف مواد صيانة' : 'تسليم ونقل عهدة';
    addServerAuditLog(
      actorName,
      actorRole,
      actionAr,
      'InventoryTransaction',
      docNumber,
      `تم إصدار ${docNumber}: ${actionAr} للصنف (${item.name}) بعدد ${numQty} إلى (${recipientName})`
    );

    saveState(dbState);
    broadcastStateUpdate(
      'INVENTORY_TRANSACTION_CREATED',
      `تم تسجيل حركة مخزنية ${docNumber}: ${item.name} (${numQty})`,
      actorName
    );

    res.json({ success: true, transaction: newTx, item });
  });

  app.post('/api/inventory/maintenance-log', (req: Request, res: Response) => {
    const { itemId, log, nextMaintenanceDate, actorName, actorRole } = req.body;
    const item = dbState.inventoryItems.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'الأصل غير موجود' });
    }

    if (!item.maintenanceLogs) {
      item.maintenanceLogs = [];
    }

    const newLog: AssetMaintenanceLog = {
      ...log,
      id: log.id || `mnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };

    item.maintenanceLogs.unshift(newLog);
    item.lastMaintenanceDate = newLog.date;
    if (nextMaintenanceDate) {
      item.nextMaintenanceDate = nextMaintenanceDate;
    }

    addServerAuditLog(
      actorName || 'فني الصيانة',
      actorRole || 'ACCOUNTANT',
      'تسجيل صيانة أصل',
      'InventoryItem',
      item.itemCode,
      `تم تسجيل صيانة للأصل (${item.name} - ${item.itemCode}): ${newLog.title} بتكلفة ${newLog.cost} ريال`
    );

    saveState(dbState);
    broadcastStateUpdate(
      'ASSET_MAINTENANCE_UPDATED',
      `تم تحديث سجل صيانة الأصل: ${item.name}`,
      actorName || 'فني الصيانة'
    );

    res.json({ success: true, item, log: newLog });
  });

  app.put('/api/inventory/item/:id', (req: Request, res: Response) => {
    const itemId = req.params.id;
    const { updates, actorName, actorRole } = req.body;
    const itemIdx = dbState.inventoryItems.findIndex(i => i.id === itemId);
    if (itemIdx === -1) {
      return res.status(404).json({ success: false, error: 'الأصل غير موجود' });
    }

    dbState.inventoryItems[itemIdx] = {
      ...dbState.inventoryItems[itemIdx],
      ...updates
    };

    saveState(dbState);
    res.json({ success: true, item: dbState.inventoryItems[itemIdx] });
  });

  // ==========================================
  // 14. Database Backup & Disaster Recovery APIs
  // ==========================================
  app.get('/api/backups', (req: Request, res: Response) => {
    try {
      const backups = getBackupList();
      const settings = loadBackupSettings();
      const currentStats = calculateDbStats(dbState);
      res.json({ success: true, backups, settings, currentStats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backups/create', (req: Request, res: Response) => {
    try {
      const { notes, actorName, actorRole } = req.body;
      const bkp = createBackupSnapshot(
        'MANUAL_USER',
        actorName || 'المدير العام',
        notes || 'نسخة احتياطية يدوية تم أخذها من لوحة التحكم'
      );

      if (!bkp) {
        return res.status(500).json({ success: false, error: 'فشل إنشاء النسخة الاحتياطية' });
      }

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'إنشاء نسخة احتياطية يدوية',
        'DatabaseBackup',
        bkp.id,
        `تم إنشاء نسخة احتياطية فورية بنجاح (${bkp.id}) بحجم ${Math.round(bkp.sizeBytes / 1024)} KB`
      );

      res.json({ success: true, backup: bkp });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backups/restore', (req: Request, res: Response) => {
    try {
      const { backupId, actorName, actorRole } = req.body;
      if (!backupId) {
        return res.status(400).json({ success: false, error: 'معرف النسخة الاحتياطية مطلوب' });
      }

      const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'ملف النسخة الاحتياطية غير موجود' });
      }

      // 1. Create a safety backup first!
      createBackupSnapshot(
        'PRE_RESTORE_SAFETY',
        actorName || 'النظام السحابي',
        `نسخة أمان تلقائية قبل استعادة النسخة (${backupId})`
      );

      // 2. Read and parse file
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const stateToRestore: ServerState = parsed.data || parsed;

      if (!Array.isArray(stateToRestore.accounts) || !Array.isArray(stateToRestore.invoices)) {
        return res.status(400).json({ success: false, error: 'ملف النسخة غير صالح أو لا يحتوي على بنية البيانات المطلوبة' });
      }

      // Ensure optional collections exist
      if (!stateToRestore.inventoryItems) stateToRestore.inventoryItems = INITIAL_INVENTORY_ITEMS;
      if (!stateToRestore.inventoryTransactions) stateToRestore.inventoryTransactions = INITIAL_INVENTORY_TRANSACTIONS;
      if (!stateToRestore.aggregatedDocuments) stateToRestore.aggregatedDocuments = INITIAL_AGGREGATED_DOCUMENTS;

      // 3. Apply state and save
      dbState = stateToRestore;
      saveState(dbState);

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'استعادة قاعدة البيانات من نسخة احتياطية',
        'DatabaseBackup',
        backupId,
        `تمت استعادة كافة البيانات المحاسبية والعقارية من النسخة (${backupId}) بنجاح`
      );

      broadcastStateUpdate(
        'DATABASE_RESTORED',
        `تمت استعادة قاعدة البيانات بنجاح من النسخة الاحتياطية (${backupId})`,
        actorName
      );

      res.json({ success: true, restoredAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('Error during backup restore:', err);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء استعادة النسخة: ' + err.message });
    }
  });

  app.get('/api/backups/:id/download', (req: Request, res: Response) => {
    const backupId = req.params.id;
    const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('النسخة الاحتياطية غير موجودة');
    }
    res.download(filePath, `Mouhassil_Backup_${backupId}.json`);
  });

  // Direct download for complete project source code ZIP
  app.get(['/api/download/source-code', '/api/download/source-code.zip'], (req: Request, res: Response) => {
    if ((req as any).authUser?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    const zipPath = path.join(process.cwd(), 'public', 'mouhassil_complete_source.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'ملف الكود المصدري غير موجود حالياً' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.download(zipPath, 'mouhassil_complete_source.zip');
  });

  app.delete('/api/backups/:id', (req: Request, res: Response) => {
    try {
      const backupId = req.params.id;
      const filePath = path.join(BACKUPS_DIR, `${backupId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backups/settings', (req: Request, res: Response) => {
    try {
      const { autoBackupEnabled, intervalMinutes, maxRetentionCount, autoBackupOnPeriodClose, autoBackupOnReset } = req.body;
      const current = loadBackupSettings();
      const numInterval = Number(intervalMinutes) || current.intervalMinutes || 30;
      const updated: BackupSettings = {
        ...current,
        autoBackupEnabled: typeof autoBackupEnabled === 'boolean' ? autoBackupEnabled : current.autoBackupEnabled,
        intervalMinutes: numInterval,
        maxRetentionCount: Number(maxRetentionCount) || current.maxRetentionCount || 30,
        autoBackupOnPeriodClose: typeof autoBackupOnPeriodClose === 'boolean' ? autoBackupOnPeriodClose : current.autoBackupOnPeriodClose,
        autoBackupOnReset: typeof autoBackupOnReset === 'boolean' ? autoBackupOnReset : current.autoBackupOnReset,
        nextScheduledBackup: new Date(Date.now() + numInterval * 60 * 1000).toISOString()
      };
      saveBackupSettings(updated);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backups/upload', (req: Request, res: Response) => {
    try {
      const { backupData, actorName, actorRole, notes, restoreImmediately } = req.body;
      if (!backupData) {
        return res.status(400).json({ success: false, error: 'محتوى النسخة مطلوب' });
      }

      const parsed = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
      const stateData: ServerState = parsed.data || parsed;

      if (!Array.isArray(stateData.accounts) || !Array.isArray(stateData.invoices)) {
        return res.status(400).json({ success: false, error: 'ملف النسخة غير صالح أو لا يطابق هيكل النظام' });
      }

      const nowIso = new Date().toISOString();
      const safeDate = nowIso.replace(/[:.]/g, '-');
      const backupId = `bkp_${safeDate}_imported`;
      const filename = `${backupId}.json`;
      const filePath = path.join(BACKUPS_DIR, filename);

      const stats = calculateDbStats(stateData);
      const backupPayload = {
        metadata: {
          id: backupId,
          filename,
          createdAt: nowIso,
          trigger: 'MANUAL_USER' as const,
          actorName: actorName || 'مستخدم خارجي',
          notes: notes || 'نسخة احتياطية مستوردة من ملف خارجي',
          stats,
          version: '2.5-PRO'
        },
        data: stateData
      };

      fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

      if (restoreImmediately) {
        createBackupSnapshot('PRE_RESTORE_SAFETY', actorName || 'النظام', 'نسخة أمان تلقائية قبل استعادة ملف مستورد');
        dbState = stateData;
        saveState(dbState);
        broadcastStateUpdate('DATABASE_RESTORED', 'تم استيراد واستعادة قاعدة البيانات بنجاح من ملف محلي', actorName);
      }

      res.json({ success: true, backupId, restored: !!restoreImmediately });
    } catch (err: any) {
      res.status(400).json({ success: false, error: 'فشل معالجة الملف: ' + err.message });
    }
  });

  // 15. Reset Database to Standard Initial Demo
  app.post('/api/reset', (req: Request, res: Response) => {
    const { actorName, actorRole } = req.body;
    
    // Create safety backup before reset if enabled
    const settings = loadBackupSettings();
    if (settings.autoBackupOnReset) {
      createBackupSnapshot(
        'CRITICAL_OPERATION',
        actorName || 'المدير العام',
        'نسخة أمان تلقائية قبل إعادة ضبط قاعدة البيانات للوضع النموذجي'
      );
    }

    // نُبقي حساب المدير العام كما هو حتى لا يُحرم من الدخول بعد إعادة الضبط
    const prevAdmin = dbState.users.find(u => u.role === 'ADMIN' || u.username === 'admin');
    const fresh = getInitialState();
    if (prevAdmin) {
      fresh.users = fresh.users.map(u => (u.role === 'ADMIN' || u.username === 'admin' ? prevAdmin : u));
    }
    dbState = normalizeState(fresh);
    saveState(dbState);
    broadcastStateUpdate('DATABASE_RESET', 'تم استرجاع قاعدة البيانات النموذجية بنجاح', actorName);
    res.json({ success: true });
  });

  // 16. Secure System Clear Data & Environment Switcher (بكلمة سر المدير العام)
  app.post('/api/system/clear-data', (req: Request, res: Response) => {
    const { mode, adminPassword, actorName, actorRole } = req.body;

    // Verify Admin Password
    const adminUser = dbState.users.find(u => u.role === 'ADMIN' || u.username === 'admin');
    if (!adminPassword || !verifyPassword(String(adminPassword), adminUser?.password)) {
      return res.status(401).json({
        success: false,
        error: 'كلمة مرور المدير العام غير صحيحة. تم رفض العملية حمايةً لسلامة البيانات المحاسبية.'
      });
    }

    // Always create an automatic emergency safety backup before altering or wiping data
    createBackupSnapshot(
      'CRITICAL_OPERATION',
      actorName || 'المدير العام',
      `نسخة احتياطية تلقائية عاجلة قبل تنفيذ إجراء (${mode === 'FULL_WIPE' ? 'إعادة ضبط المصنع الكاملة' : mode === 'TRANSACTIONS_ONLY' ? 'تصفير العمليات التشغيلية والمحاسبية' : mode === 'SEED_DEMO' ? 'تحميل البيانات التجريبية' : 'تبديل بيئة النظام'})`
    );

    if (mode === 'TRANSACTIONS_ONLY') {
      // Clear all transactional documents and ledger balances, but KEEP properties, units, chart of accounts, users
      dbState.contracts = [];
      dbState.invoices = [];
      dbState.payments = [];
      dbState.expenses = [];
      dbState.journalEntries = [];
      dbState.inventoryTransactions = [];
      dbState.aggregatedDocuments = [];
      dbState.workOrders = [];
      dbState.settlements = [];
      dbState.fixedAssets = []; // قيود اقتنائها حُذفت مع القيود، فلا يجوز إبقاؤها بلا قيد

      // Reset unit occupancy and tenant balances
      dbState.units = (dbState.units || []).map(u => ({ ...u, status: 'VACANT', currentTenantId: undefined }));
      dbState.tenants = (dbState.tenants || []).map(t => ({ ...t, balance: 0, securityDepositHeld: 0 }));
      dbState.systemMode = 'PRODUCTION';

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'تصفير العمليات التشغيلية والمحاسبية',
        'System',
        'SYS_CLEAR_OPS',
        'قام المدير العام بمسح وتصفير كافة السندات، القيود، والفواتير لبدء العمل الفعلي الحقيقي على عقارات ومستأجري المحفظة'
      );
    } else if (mode === 'FULL_WIPE') {
      // Clear EVERYTHING to start completely from scratch: only preserve the Admin account and Standard Chart of Accounts
      const adminToKeep = adminUser || INITIAL_USERS[0];
      dbState.users = [adminToKeep];
      dbState.accounts = INITIAL_CHART_OF_ACCOUNTS;
      dbState.properties = [];
      dbState.units = [];
      dbState.tenants = [];
      dbState.contracts = [];
      dbState.invoices = [];
      dbState.payments = [];
      dbState.expenses = [];
      dbState.journalEntries = [];
      dbState.periods = INITIAL_ACCOUNTING_PERIODS.map(p => ({ ...p, isClosed: false }));
      dbState.inventoryItems = [];
      dbState.inventoryTransactions = [];
      dbState.aggregatedDocuments = [];
      dbState.workOrders = [];
      dbState.settlements = [];
      dbState.fixedAssets = [];
      dbState.systemMode = 'PRODUCTION';

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'إعادة ضبط المصنع الشاملة وتفريغ النظام',
        'System',
        'SYS_FACTORY_RESET',
        'تم تفريغ كافة العقارات والمستأجرين والعمليات بالكامل للبدء من الصفر المطلق بحساب المدير العام فقط'
      );
    } else if (mode === 'SEED_DEMO') {
      // Load standard complete demonstration data package
      const adminToKeep = adminUser || INITIAL_USERS[0];
      const freshDemo = getInitialState();
      dbState = {
        ...freshDemo,
        users: [adminToKeep, ...INITIAL_USERS.filter(u => u.username !== 'admin')],
        systemMode: 'DEMO'
      };

      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        'تحميل وتنشيط حزمة البيانات التجريبية',
        'System',
        'SYS_SEED_DEMO',
        'تم تحميل حزمة بيانات نموذجية كاملة لتدريب الموظفين واختبار كافة دورات القبض والصرف والترحيل'
      );
    } else if (mode === 'TOGGLE_MODE') {
      dbState.systemMode = dbState.systemMode === 'DEMO' ? 'PRODUCTION' : 'DEMO';
      addServerAuditLog(
        actorName || 'المدير العام',
        actorRole || 'ADMIN',
        `تبديل بيئة عمل النظام إلى (${dbState.systemMode === 'DEMO' ? 'البيئة التجريبية' : 'البيئة الإنتاجية الحقيقية'})`,
        'System',
        'SYS_TOGGLE_ENV',
        `تم تحويل بيئة النظام التشغيلية إلى: ${dbState.systemMode}`
      );
    }

    saveState(dbState);
    broadcastStateUpdate(
      'SYSTEM_DATA_CLEARED',
      `تم تنفيذ العملية (${mode}) بنجاح وتحويل وضع النظام إلى (${dbState.systemMode === 'DEMO' ? 'تجريبي' : 'عمل حقيقي'})`,
      actorName
    );

    res.json({
      success: true,
      mode,
      systemMode: dbState.systemMode,
      state: publicState()
    });
  });

  // In production, serve built client. In development, mount Vite middlewares with SPA handler.
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));
  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(ROOT_DIR, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(`🚀 MOUHASSIL SERVER RUNNING AT: http://0.0.0.0:${PORT}`);
    console.log(`📡 REAL-TIME MULTI-USER SYNC & PERIOD LOCK ACTIVE`);
    console.log(`🛡️ AUTOMATIC DATABASE BACKUP & RECOVERY ENGINE ACTIVE`);
    console.log(`========================================================`);

    // 1. Initial startup baseline backup if no backups exist yet
    setTimeout(() => {
      try {
        const list = getBackupList();
        if (list.length === 0) {
          const bkp = createBackupSnapshot('AUTOMATIC_SCHEDULED', 'النظام السحابي الآلي (Startup)', 'نسخة احتياطية تأسيسية عند بدء تشغيل الخادم');
          if (bkp) {
            console.log(`[AUTO-BACKUP] Created initial baseline backup snapshot: ${bkp.id}`);
          }
        }
      } catch (e) {
        console.error('[AUTO-BACKUP] Baseline check error:', e);
      }
    }, 2000);

    // 2. Automated background backup daemon (checks every 60 seconds)
    setInterval(() => {
      try {
        const settings = loadBackupSettings();
        if (!settings.autoBackupEnabled) return;

        const now = Date.now();
        const intervalMs = (settings.intervalMinutes || 30) * 60 * 1000;
        const lastTime = settings.lastBackupTime ? new Date(settings.lastBackupTime).getTime() : 0;

        if (now - lastTime >= intervalMs) {
          const bkp = createBackupSnapshot(
            'AUTOMATIC_SCHEDULED',
            'النظام السحابي الآلي (Auto Daemon)',
            'نسخ احتياطي دوري آلي مجدول لحماية السجلات المالية'
          );
          if (bkp) {
            console.log(`[AUTO-BACKUP] Created scheduled snapshot: ${bkp.id} (${Math.round(bkp.sizeBytes / 1024)} KB)`);
          }
        }
      } catch (e) {
        console.error('[AUTO-BACKUP] Daemon check error:', e);
      }
    }, 60 * 1000);

    // إعادة اشتقاق حالة الوحدات من العقود كل 10 دقائق (لالتقاط تغيّر التاريخ وانتهاء العقود)
    setInterval(() => {
      try {
        const reconciled = reconcileUnits(dbState.units, dbState.contracts);
        if (reconciled !== dbState.units) {
          dbState.units = reconciled;
          saveState(dbState);
          broadcastStateUpdate('UNITS_RECONCILED', 'تم تحديث حالة الوحدات تلقائيًا حسب العقود وتاريخ اليوم', 'النظام');
        }
      } catch (e) {
        console.error('[UNITS] Reconcile error:', e);
      }
    }, 10 * 60 * 1000);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
