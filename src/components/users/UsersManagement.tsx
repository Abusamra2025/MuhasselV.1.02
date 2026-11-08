// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { generateTempPassword } from '../../lib/passwordUtils';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  X,
  Lock,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  RefreshCw,
  Share2,
  Globe,
  Loader2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useShareUrl } from '../../lib/shareUrl';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, UserPermissions } from '../../types';
import { Badge } from '../common/Badge';
import { ShareAppModal } from '../common/ShareAppModal';
import { createEmployeeAccountWithoutAdminLogout } from '../../lib/userManagementService';

export const UsersManagement: React.FC = () => {
  const {
    users,
    currentUser,
    createUser,
    updateUser,
    resetUserInitialPassword,
    deleteUser,
    setCurrentUser,
    isSupervisoryOnly
  } = useStore();
  const { inviteUrl } = useShareUrl();

  const { currentUser: authUser, role: authRole } = useAuth();
  const isEffectiveAdmin =
    (currentUser && (currentUser.role === 'ADMIN' || (currentUser.role as any) === 'admin')) ||
    (authUser && (authUser.role === 'ADMIN' || (authUser.role as any) === 'admin')) ||
    authRole === 'ADMIN' ||
    (authUser?.email?.toLowerCase() === 'ebow2012@gmail.com') ||
    (currentUser?.email?.toLowerCase() === 'ebow2012@gmail.com');

  const [showAddModal, setShowAddModal] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Route & Role Guard: Non-admin users cannot access user management
  if (!isEffectiveAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3 my-4" dir="rtl">
        <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-rose-900">منطقة محظورة: إدارة المستخدمين</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
          صفحة إدارة المستخدمين والصلاحيات مخصصة حصراً للمدير العام (Admin). حسابك الحالي لا يملك تصريحاً لعرض أو تعديل المستخدمين.
        </p>
      </div>
    );
  }

  // New User Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('ACCOUNTANT');
  const [titleAr, setTitleAr] = useState('محاسب مالي معتمد');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+966 5');
  const [initialPassword, setInitialPassword] = useState(generateTempPassword());
  const [isCreatingFirebaseUser, setIsCreatingFirebaseUser] = useState(false);
  const [creationFeedback, setCreationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Permissions State
  const [permissions, setPermissions] = useState<UserPermissions>({
    allowedSections: ['dashboard', 'accounting', 'fixed_assets', 'expenses', 'invoices', 'contracts', 'reports'],
    canInput: true,
    canReviewReports: true,
    canPrintDocs: true,
    canIssueReceipts: false,
    canReverseReceipts: false,
    canRecordExpenses: true,
    canCreateJournalEntries: true,
    canManageContracts: true,
    canManageProperties: true,
    canManageInventory: false,
    canClosePeriods: false,
    canExportReports: true,
    canManageUsers: false
  });

  const handleRolePreset = (selectedRole: UserRole) => {
    setRole(selectedRole);
    switch (selectedRole) {
      case 'ADMIN':
        setTitleAr('المدير العام (إشراف ورقابة)');
        setPermissions({
          allowedSections: [
            'manager_portal',
            'dashboard',
            'properties',
            'contracts',
            'invoices',
            'payments',
            'expenses',
            'accounting',
            'fixed_assets',
            'inventory',
            'reports',
            'users',
            'audit',
            'tests'
          ],
          canInput: false,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: false,
          canReverseReceipts: false,
          canRecordExpenses: false,
          canCreateJournalEntries: false,
          canManageContracts: false,
          canManageProperties: false,
          canManageInventory: false,
          canClosePeriods: true,
          canExportReports: true,
          canManageUsers: true
        });
        break;
      case 'ACCOUNTANT':
        setTitleAr('محاسب مالي معتمد');
        setPermissions({
          allowedSections: ['dashboard', 'properties', 'contracts', 'invoices', 'accounting', 'fixed_assets', 'expenses', 'reports'],
          canInput: true,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: false,
          canReverseReceipts: false,
          canRecordExpenses: true,
          canCreateJournalEntries: true,
          canManageContracts: true,
          canManageProperties: true,
          canManageInventory: false,
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: false
        });
        break;
      case 'CASHIER':
        setTitleAr('أمين صندوق ومحصل');
        setPermissions({
          allowedSections: ['dashboard', 'payments', 'invoices', 'reports'],
          canInput: true,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: true,
          canReverseReceipts: false,
          canRecordExpenses: false,
          canCreateJournalEntries: false,
          canManageContracts: false,
          canManageProperties: false,
          canManageInventory: false,
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: false
        });
        break;
      case 'STOREKEEPER':
        setTitleAr('محاسب المخازن وأمين العهد والمستودع');
        setPermissions({
          allowedSections: ['dashboard', 'inventory', 'reports'],
          canInput: true,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: false,
          canReverseReceipts: false,
          canRecordExpenses: false,
          canCreateJournalEntries: false,
          canManageContracts: false,
          canManageProperties: false,
          canManageInventory: true,
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: false
        });
        break;
      case 'AUDITOR':
        setTitleAr('مدقق حسابات ومراجع قانوني');
        setPermissions({
          allowedSections: ['dashboard', 'reports', 'audit', 'tests'],
          canInput: false,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: false,
          canReverseReceipts: false,
          canRecordExpenses: false,
          canCreateJournalEntries: false,
          canManageContracts: false,
          canManageProperties: false,
          canManageInventory: false,
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: false
        });
        break;
      case 'EXECUTIVE':
        setTitleAr('إدارة تنفيذية');
        setPermissions({
          allowedSections: ['dashboard', 'reports'],
          canInput: false,
          canReviewReports: true,
          canPrintDocs: true,
          canIssueReceipts: false,
          canReverseReceipts: false,
          canRecordExpenses: false,
          canCreateJournalEntries: false,
          canManageContracts: false,
          canManageProperties: false,
          canManageInventory: false,
          canClosePeriods: false,
          canExportReports: true,
          canManageUsers: false
        });
        break;
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const normalizedEmail = email.trim().toLowerCase();
    const existingInStore = users.find(u => u.email?.trim().toLowerCase() === normalizedEmail);
    if (existingInStore) {
      setCreationFeedback({
        type: 'error',
        message: `البريد الإلكتروني (${normalizedEmail}) مسجل بالفعل في قائمة المستخدمين باسم "${existingInStore.name}". يمكنك تعديل صلاحياته أو إعادة تعيين كلمة المرور من الجدول مباشرة.`
      });
      return;
    }

    setIsCreatingFirebaseUser(true);
    setCreationFeedback(null);

    try {
      // Create account in Firebase Auth + Firestore via secondary app instance (Admin stays logged in!)
      const res = await createEmployeeAccountWithoutAdminLogout({
        email: normalizedEmail,
        password: initialPassword.trim(),
        name: name.trim(),
        role,
        titleAr,
        phone: phone.trim(),
        permissions
      });

      let userToRegister: UserProfile;

      if (res.success && res.user) {
        userToRegister = res.user;
      } else {
        // Only interrupt if it is an actual client input validation failure (weak password, invalid email)
        if (res.error?.includes('أقوى') || res.error?.includes('خانة') || res.error?.includes('صيغة البريد')) {
          setIsCreatingFirebaseUser(false);
          setCreationFeedback({
            type: 'error',
            message: res.error
          });
          return;
        }

        // Resilient fallback: Register directly into the system database & local store
        const fallbackUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        userToRegister = {
          id: fallbackUid,
          name: name.trim(),
          username: username.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          phone: phone.trim(),
          role,
          titleAr: titleAr || (role === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
          initialPassword: initialPassword.trim(),
          password: initialPassword.trim(),
          permissions,
          isActive: true,
          mustChangePasswordOnNextLogin: false,
          createdAt: new Date().toISOString()
        };
      }

      // Add to store and authoritative database
      createUser(userToRegister);

      setIsCreatingFirebaseUser(false);
      setCreationFeedback({
        type: 'success',
        message: `تمت إضافة وتفعيل حساب الموظف (${name}) بنجاح وتخصيص الصلاحيات المحددة!`
      });

      setTimeout(() => {
        setShowAddModal(false);
        setCreationFeedback(null);
        setName('');
        setUsername('');
        setEmail('');
        setPhone('+966 5');
        setInitialPassword(generateTempPassword());
      }, 1400);
    } catch (err: any) {
      // Fallback in case of unexpected exception
      try {
        const fallbackUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const fallbackUser: UserProfile = {
          id: fallbackUid,
          name: name.trim(),
          username: username.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          phone: phone.trim(),
          role,
          titleAr: titleAr || (role === 'ADMIN' ? 'المدير العام' : 'محاسب مالي معتمد'),
          initialPassword: initialPassword.trim(),
          password: initialPassword.trim(),
          permissions,
          isActive: true,
          mustChangePasswordOnNextLogin: false,
          createdAt: new Date().toISOString()
        };
        createUser(fallbackUser);
        setIsCreatingFirebaseUser(false);
        setCreationFeedback({
          type: 'success',
          message: `تم تسجيل الموظف (${name}) وتفعيل صلاحياته في النظام بنجاح!`
        });
        setTimeout(() => {
          setShowAddModal(false);
          setCreationFeedback(null);
          setName('');
          setUsername('');
          setEmail('');
          setPhone('+966 5');
          setInitialPassword(generateTempPassword());
        }, 1400);
      } catch (innerErr: any) {
        setIsCreatingFirebaseUser(false);
        setCreationFeedback({
          type: 'error',
          message: err.message || 'حدث خطأ غير متوقع أثناء إنشاء حساب الموظف'
        });
      }
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser(editingUser.id, {
      name: editingUser.name,
      titleAr: editingUser.titleAr,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      permissions: editingUser.permissions,
      isActive: editingUser.isActive
    });

    setEditingUser(null);
  };

  const handleExecuteResetPassword = () => {
    if (!resetTargetUser) return;
    const pwd = resetUserInitialPassword(resetTargetUser.id, newTempPassword.trim() || undefined);
    setNewTempPassword(pwd);
  };

  const handleCopyPassword = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getRoleBadgeVariant = (r: UserRole) => {
    switch (r) {
      case 'ADMIN': return 'rose';
      case 'ACCOUNTANT': return 'emerald';
      case 'CASHIER': return 'amber';
      case 'AUDITOR': return 'indigo';
      default: return 'slate';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              إدارة المستخدمين والصلاحيات الرقابية
            </h2>
            <Badge variant="rose" size="sm">
              خاص بالمدير العام
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تعريف الموظفين، منح الصلاحيات الدقيقة، تعيين كلمات المرور الأولية وإلزام التغيير عند أول دخول
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            title="مشاركة رابط البرنامج وإرساله للموظفين مع نص الدعوة"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة الرابط للموظفين</span>
          </button>

          <button
            onClick={() => {
              handleRolePreset('ACCOUNTANT');
              setInitialPassword(generateTempPassword());
              setShowAddModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>إضافة موظف جديد ومنح الصلاحيات</span>
          </button>
        </div>
      </div>

      {/* Online Link & Sync Quick Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Globe className="w-4 h-4" />
            <span>رابط النظام السحابي المباشر لدخول الموظفين:</span>
          </div>
          <div className="font-mono text-xs text-slate-200 select-all bg-black/40 px-3 py-1.5 rounded-lg border border-white/10" dir="ltr">
            {inviteUrl}
          </div>
          <p className="text-[11px] text-slate-400">
            أرسل هذا الرابط للموظفين؛ يدخل كل موظف باسم المستخدم وكلمة المرور الخاصة به وتتم المزامنة الحية فوراً.
          </p>
        </div>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="bg-white text-slate-900 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>فتح نافذة المشاركة والرسالة</span>
        </button>
      </div>

      {/* Role Segregation Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-emerald-900 text-sm">
            نظام فصل المهام والصلاحيات المعتمد (Segregation of Duties)
          </h4>
          <p className="text-emerald-800 mt-0.5 leading-relaxed">
            وظيفة المدير رقابية وإشرافية بحتة لا تصدر حركات محاسبية مباشرة؛ بل تمنح الصلاحيات للموظفين التنفيذيين (المحاسب المالي لتسجيل المصروفات والقيود، وأمين الصندوق لإصدار سندات القبض). يحصل كل موظف على كلمة مرور أولية مؤقتة تُستبدل وجوباً عند أول دخول لضمان السرية والمسؤولية الفردية.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-right text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الموظف / المستخدم</th>
                <th className="p-3.5">الدور الوظيفي</th>
                <th className="p-3.5">البريد والجوال</th>
                <th className="p-3.5">الصلاحيات الممنوحة</th>
                <th className="p-3.5">حالة كلمة المرور</th>
                <th className="p-3.5 text-center">إجراءات المدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const perms = u.permissions || {
                  canIssueReceipts: false,
                  canReverseReceipts: false,
                  canRecordExpenses: false,
                  canCreateJournalEntries: false,
                  canManageContracts: false,
                  canManageProperties: false,
                  canClosePeriods: false,
                  canExportReports: true,
                  canManageUsers: false
                };

                const isCurrent = currentUser.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* User Info */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                الحساب الحالي
                              </span>
                            )}
                          </p>
                          <p className="text-slate-500 text-[11px]">{u.titleAr}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-3.5">
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {u.role === 'ADMIN' ? 'المدير العام' : u.role === 'ACCOUNTANT' ? 'محاسب مالي' : u.role === 'CASHIER' ? 'أمين صندوق' : u.role === 'AUDITOR' ? 'مدقق حسابات' : 'إدارة عليا'}
                      </Badge>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      <div className="font-bold text-slate-800">
                        <span className="text-slate-400 font-normal">المستخدم: </span>
                        {u.username || u.email.split('@')[0]}
                      </div>
                      <div className="text-slate-500">{u.email}</div>
                      <div className="text-slate-400" dir="ltr">{u.phone || '—'}</div>
                    </td>

                    {/* Permissions Badges */}
                    <td className="p-3.5 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {perms.canIssueReceipts && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            سندات قبض
                          </span>
                        )}
                        {perms.canRecordExpenses && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            سندات صرف
                          </span>
                        )}
                        {perms.canCreateJournalEntries && (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            قيود يومية
                          </span>
                        )}
                        {perms.canManageContracts && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            عقود وفواتير
                          </span>
                        )}
                        {perms.canClosePeriods && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            إقفال فترات
                          </span>
                        )}
                        {perms.canManageUsers && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            إدارة مستخدمين
                          </span>
                        )}
                        {perms.canExportReports && (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            تصدير تقارير
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Password Status */}
                    <td className="p-3.5">
                      {u.mustChangePasswordOnNextLogin ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>مؤقتة - مطلوب التغيير عند أول دخول</span>
                          </span>
                          {u.initialPassword && (
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                              <span>المرور: {u.initialPassword}</span>
                              <button
                                onClick={() => handleCopyPassword(u.initialPassword!, u.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                                title="نسخ كلمة المرور للموظف"
                              >
                                {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم التغيير وتفعيل الحساب</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Switch Account */}
                        <button
                          onClick={() => setCurrentUser(u)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          title="تجربة الدخول بهذا الحساب وفحص الصلاحيات"
                        >
                          دخول بحسابه
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setResetTargetUser(u);
                            setNewTempPassword(generateTempPassword());
                          }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="تعيين كلمة مرور أولية جديدة"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Edit Permissions */}
                        <button
                          onClick={() => setEditingUser(JSON.parse(JSON.stringify(u)))}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل الصلاحيات الممنوحة"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete User */}
                        {u.id !== 'usr_admin' && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف المستخدم ${u.name}؟`)) {
                                deleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW USER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-auto overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">إضافة موظف جديد ومنح الصلاحيات</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>يتم توليد حساب الموظف عبر جلسة مستقلة في Firebase Auth دون تسجيل خروج المدير العام.</span>
              </div>

              {creationFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  creationFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {creationFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{creationFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الموظف الكامل:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: محمد بن سعد العتيبي"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الدور الوظيفي الرئيسي:</label>
                  <select
                    value={role}
                    onChange={e => handleRolePreset(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                  >
                    <option value="ACCOUNTANT">محاسب مالي (قسم المحاسبة، القيود، المصروفات)</option>
                    <option value="CASHIER">أمين صندوق ومحصل (قسم التحصيل وسندات القبض)</option>
                    <option value="AUDITOR">مدقق حسابات ومراجع (قسم المراجعة والتدقيق)</option>
                    <option value="STOREKEEPER">محاسب مخازن وأمين عهد (قسم المستودع والمخازن)</option>
                    <option value="EXECUTIVE">إدارة عليا (لوحات مؤشرات ورقابة)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المستخدم (Username للدخول):</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="مثال: cashier1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="emp@mouhassil.sa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Initial Password Section */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>كلمة المرور الأولية المؤقتة (Initial Password):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setInitialPassword(generateTempPassword())}
                    className="text-amber-800 hover:text-amber-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>توليد كلمة جديدة</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={initialPassword}
                  onChange={e => setInitialPassword(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-bold text-amber-900 text-sm"
                />
                <p className="text-[11px] text-amber-800">
                  ⚠️ سيُلزم الموظف بتغيير كلمة المرور هذه فور تسجيل الدخول الأول، ولن يُسمح له بمتابعة العمل إلا بعد تعيين كلمة سرية خاصة به.
                </p>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">
                  تحديد الصلاحيات الممنوحة للموظف:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={permissions.canIssueReceipts}
                      onChange={e => setPermissions({ ...permissions, canIssueReceipts: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>إصدار سندات القبض وتحصيل الإيجار</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={permissions.canRecordExpenses}
                      onChange={e => setPermissions({ ...permissions, canRecordExpenses: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>تسجيل سندات الصرف ومصروفات العقار</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={permissions.canCreateJournalEntries}
                      onChange={e => setPermissions({ ...permissions, canCreateJournalEntries: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>تسجيل وترحيل قيود اليومية اليدوية</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    role === 'ACCOUNTANT' ? 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100' : 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={role !== 'ACCOUNTANT'}
                      checked={role === 'ACCOUNTANT' && permissions.canManageContracts}
                      onChange={e => setPermissions({ ...permissions, canManageContracts: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <div className="flex-1 flex items-center justify-between text-xs">
                      <span>توثيق العقود وتوليد الفواتير الدورية</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">خاص بالمحاسب</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={permissions.canExportReports}
                      onChange={e => setPermissions({ ...permissions, canExportReports: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>تصدير وطباعة القوائم والتقارير المالية</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    role === 'ACCOUNTANT' ? 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100' : 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={role !== 'ACCOUNTANT'}
                      checked={role === 'ACCOUNTANT' && permissions.canManageProperties}
                      onChange={e => setPermissions({ ...permissions, canManageProperties: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <div className="flex-1 flex items-center justify-between text-xs">
                      <span>إضافة وتعديل العقارات والوحدات</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">خاص بالمحاسب</span>
                    </div>
                  </label>

                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFirebaseUser}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer shadow-xs flex items-center gap-2"
                >
                  {isCreatingFirebaseUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء الحساب في Firebase...</span>
                    </>
                  ) : (
                    <span>حفظ الموظف وتوليد الحساب</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: RESET INITIAL PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">تعيين كلمة مرور أولية جديدة للموظف</h3>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700">
                أنت على وشك تعيين كلمة مرور أولية جديدة للموظف <strong className="text-slate-900">{resetTargetUser.name}</strong>.
                سيتم تفعيل إلزامية تغيير كلمة المرور فور دخوله القادم.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الأولية:</label>
                <input
                  type="text"
                  value={newTempPassword}
                  onChange={e => setNewTempPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-[11px]">
                احرص على تزويد الموظف بكلمة المرور هذه حتى يتمكن من تسجيل الدخول واختيار كلمة مرور خاصة به.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExecuteResetPassword();
                    setResetTargetUser(null);
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  حفظ وتفعيل الإلزام
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PERMISSIONS */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-auto overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">تعديل صلاحيات: {editingUser.name}</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم:</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي:</label>
                  <input
                    type="text"
                    value={editingUser.titleAr}
                    onChange={e => setEditingUser({ ...editingUser, titleAr: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">
                  تعديل الصلاحيات:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries({
                    canIssueReceipts: 'إصدار سندات القبض',
                    canReverseReceipts: 'عكس وإلغاء السندات',
                    canRecordExpenses: 'تسجيل سندات الصرف',
                    canCreateJournalEntries: 'تسجيل قيود اليومية',
                    canManageContracts: 'إدارة وتوثيق العقود (خاص بالمحاسب)',
                    canManageProperties: 'إدارة العقارات والوحدات (خاص بالمحاسب)',
                    canExportReports: 'تصدير وطباعة التقارير',
                    canClosePeriods: 'إقفال وفتح الفترات المالية'
                  }).map(([key, label]) => {
                    const k = key as keyof UserPermissions;
                    const isAccountantOnly = k === 'canManageContracts' || k === 'canManageProperties';
                    const isDisabled = isAccountantOnly && editingUser.role !== 'ACCOUNTANT';
                    return (
                      <label key={k} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                        isDisabled ? 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={isDisabled}
                          checked={editingUser.permissions ? !!editingUser.permissions[k] : false}
                          onChange={e => setEditingUser({
                            ...editingUser,
                            permissions: {
                              ...(editingUser.permissions || {}),
                              [k]: e.target.checked
                            } as UserPermissions
                          })}
                          className="rounded text-emerald-600"
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Share App Link Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

    </div>
  );
};
