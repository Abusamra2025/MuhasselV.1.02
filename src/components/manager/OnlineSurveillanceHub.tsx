// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  Users,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  Shield,
  ShieldAlert,
  Send,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Monitor,
  Smartphone,
  Eye,
  Activity,
  UserCheck,
  UserX,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Check,
  X,
  Share2,
  Globe
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { UserSession, UserRole, UserPermissions } from '../../types';
import { Badge } from '../common/Badge';
import { ShareAppModal } from '../common/ShareAppModal';

export const OnlineSurveillanceHub: React.FC = () => {
  const {
    activeSessions,
    users,
    auditLogs,
    currentUser,
    forceDisconnectSession,
    sendAdminAlert,
    toggleUserActiveStatus,
    updateUserPermissionsLive
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'IDLE' | 'DISCONNECTED'>('ALL');

  // Modal States
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState<{ id: string | null; name: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertUrgency, setAlertUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('URGENT');
  const [alertSuccessNotice, setAlertSuccessNotice] = useState<string | null>(null);

  // Kick Modal State
  const [sessionToKick, setSessionToKick] = useState<UserSession | null>(null);
  const [kickReason, setKickReason] = useState('إجراء رقابي مباشر من قِبل المدير العام');
  const [kickResultNotice, setKickResultNotice] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Edit Permissions Modal State
  const [userToEditPerms, setUserToEditPerms] = useState<string | null>(null);
  const [permsDraft, setPermsDraft] = useState<UserPermissions | null>(null);

  // Filtered Sessions
  const filteredSessions = activeSessions.filter(s => {
    // Search
    const term = searchTerm.trim().toLowerCase();
    const matchSearch =
      !term ||
      s.userName.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term) ||
      s.titleAr.toLowerCase().includes(term) ||
      s.currentWindow.toLowerCase().includes(term);

    // Role
    const matchRole = roleFilter === 'ALL' || s.userRole === roleFilter;

    // Status
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const onlineCount = activeSessions.filter(s => s.status === 'ONLINE').length;
  const idleCount = activeSessions.filter(s => s.status === 'IDLE').length;
  const disconnectedCount = activeSessions.filter(s => s.status === 'DISCONNECTED').length;

  // Open Alert Modal for specific user or broadcast to all
  const handleOpenAlertModal = (target: { id: string | null; name: string }) => {
    setSelectedTargetUser(target);
    setAlertMessage('');
    setAlertUrgency('URGENT');
    setAlertSuccessNotice(null);
    setIsAlertModalOpen(true);
  };

  const handleSendAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;

    await sendAdminAlert({
      targetUserId: selectedTargetUser?.id || null,
      targetUserName: selectedTargetUser?.name || 'كافة الموظفين',
      message: alertMessage.trim(),
      urgency: alertUrgency
    });

    setAlertSuccessNotice(`تم إرسال التنبيه بنجاح إلى (${selectedTargetUser?.name || 'كافة الموظفين'})`);
    setTimeout(() => {
      setIsAlertModalOpen(false);
      setAlertSuccessNotice(null);
    }, 1500);
  };

  // Confirm Kick Session
  const handleConfirmKick = async () => {
    if (!sessionToKick) return;

    const res = await forceDisconnectSession(sessionToKick.sessionId, sessionToKick.userId, kickReason);
    setKickResultNotice(res.message || 'تم إنهاء الجلسة بنجاح');
    setTimeout(() => {
      setSessionToKick(null);
      setKickResultNotice(null);
    }, 1200);
  };

  // Open permissions edit
  const handleOpenPermsModal = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setUserToEditPerms(userId);
    setPermsDraft({ ...user.permissions });
  };

  const handleSavePerms = async () => {
    if (!userToEditPerms || !permsDraft) return;
    await updateUserPermissionsLive(userToEditPerms, permsDraft);
    setUserToEditPerms(null);
    setPermsDraft(null);
  };

  // Format session duration
  const getSessionDuration = (loginIso: string) => {
    try {
      const diffMs = Date.now() - new Date(loginIso).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'منذ ثوانٍ';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      const hours = Math.floor(diffMins / 60);
      const rem = diffMins % 60;
      return `منذ ${hours} س و ${rem} د`;
    } catch {
      return '—';
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'rose';
      case 'ACCOUNTANT': return 'emerald';
      case 'CASHIER': return 'amber';
      case 'AUDITOR': return 'indigo';
      case 'STOREKEEPER': return 'blue';
      default: return 'slate';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Supervisory Monitoring Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/90 flex items-center justify-center text-white shadow-lg shrink-0 relative">
              <Radio className="w-8 h-8 animate-pulse text-indigo-200" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  مركز المراقبة الحية للجلسات والمستخدمين أونلاين
                </h1>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر SSE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                متابعة لحظية لدخول الموظفين، النوافذ النشطة المفتوحة أمامهم، الصلاحيات الفعالة، والتحكم الفوري بإنهاء الجلسات أو إرسال التنبيهات.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              title="مشاركة رابط الدخول السحابي مع الموظفين"
            >
              <Share2 className="w-4 h-4 text-emerald-200" />
              <span>مشاركة الرابط للموظفين</span>
            </button>

            <button
              onClick={() => handleOpenAlertModal({ id: null, name: 'كافة الموظفين المتصلين' })}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-200" />
              <span>إرسال تنبيه إداري عام</span>
            </button>
          </div>
        </div>

        {/* Live Counters Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-indigo-900/40">
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">المتصلون أونلاين</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{onlineCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">في وضع الخمول</span>
              <span className="text-xl font-black text-amber-400 font-mono">{idleCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">إجمالي المستخدمين</span>
              <span className="text-xl font-black text-indigo-300 font-mono">{users.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-indigo-800/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">حركات التدقيق اليوم</span>
              <span className="text-xl font-black text-cyan-300 font-mono">{auditLogs.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو اسم المستخدم أو النافذة..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ONLINE">🟢 متصل ونشط الآن</option>
            <option value="IDLE">🟡 خامل</option>
            <option value="DISCONNECTED">⚪ منقطع / خروج</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">جميع الأدوار</option>
            <option value="ADMIN">المدير العام</option>
            <option value="ACCOUNTANT">محاسب مالي</option>
            <option value="CASHIER">أمين صندوق ومحصل</option>
            <option value="STOREKEEPER">محاسب مخازن</option>
            <option value="AUDITOR">مدقق حسابات</option>
          </select>
        </div>
      </div>

      {/* Online Sessions Live Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h3 className="font-bold text-slate-900 text-sm">
              الجلسات المكتشفة أونلاين لحظياً ({filteredSessions.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            تحديث تلقائي مستمر عبر SSE
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-sm">لا توجد جلسات مطابقة لمعايير البحث</h4>
            <p className="text-xs text-slate-500 mt-1">
              عند تسجيل أي موظف دخوله إلى نافذته المخصصة، ستظهر جلسته هنا فوراً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">حالة الاتصال</th>
                  <th className="p-3.5">المستخدم والوظيفة</th>
                  <th className="p-3.5">النافذة / القسم المفتوح حالياً</th>
                  <th className="p-3.5">وقت الدخول / المدة</th>
                  <th className="p-3.5">الجهاز / المتصفح</th>
                  <th className="p-3.5 text-center">إجراءات الرقابة الإدارية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(session => {
                  const userRecord = users.find(u => u.id === session.userId);
                  const isAccountDisabled = userRecord?.isActive === false;
                  const isOnline = session.status === 'ONLINE';
                  const isIdle = session.status === 'IDLE';

                  return (
                    <tr
                      key={session.sessionId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        session.status === 'DISCONNECTED' ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Status indicator */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOnline ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>متصل نشط</span>
                            </span>
                          ) : isIdle ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>خامل</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>تسجيل خروج</span>
                            </span>
                          )}

                          {isAccountDisabled && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                              حساب مجمد
                            </span>
                          )}
                        </div>
                      </td>

                      {/* User info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            session.userRole === 'ADMIN' ? 'bg-rose-100 text-rose-800' :
                            session.userRole === 'ACCOUNTANT' ? 'bg-emerald-100 text-emerald-800' :
                            session.userRole === 'CASHIER' ? 'bg-amber-100 text-amber-800' :
                            session.userRole === 'AUDITOR' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {session.userName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{session.userName}</span>
                              <Badge variant={getRoleBadgeVariant(session.userRole)} size="sm">
                                {session.userRole}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              @{session.username} · {session.titleAr}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Active window opened */}
                      <td className="p-3.5">
                        <div className="bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/90 inline-flex items-center gap-2 max-w-xs">
                          <Monitor className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 text-[11px] truncate">
                            {session.currentWindow}
                          </span>
                        </div>
                      </td>

                      {/* Login time & duration */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-700 text-[11px]">
                          {new Date(session.loginTime).toLocaleTimeString('ar-SA')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {getSessionDuration(session.loginTime)}
                        </div>
                      </td>

                      {/* Device & IP */}
                      <td className="p-3.5">
                        <div className="text-slate-700 font-mono text-[11px] truncate max-w-[150px]">
                          {session.deviceType || 'متصفح ويب'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {session.ipAddress || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Send Alert */}
                          <button
                            onClick={() => handleOpenAlertModal({ id: session.userId, name: session.userName })}
                            title="إرسال تنبيه مباشر لشاشة هذا الموظف"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Edit Permissions */}
                          <button
                            onClick={() => handleOpenPermsModal(session.userId)}
                            title="تعديل صلاحيات الموظف المباشرة"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Freeze / Unfreeze user account */}
                          {session.userRole !== 'ADMIN' && (
                            <button
                              onClick={() => toggleUserActiveStatus(session.userId)}
                              title={isAccountDisabled ? 'تفعيل الحساب مجدداً' : 'تجميد وتعطيل الحساب'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isAccountDisabled
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                            >
                              {isAccountDisabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Kick session button */}
                          {session.status !== 'DISCONNECTED' && session.userRole !== 'ADMIN' && (
                            <button
                              onClick={() => setSessionToKick(session)}
                              title="إنهاء الجلسة فوراً (طرد مباشر)"
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs"
                            >
                              <LogOut className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Live Activity Stream (Recent User Operations) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              شريط الحركات والأنشطة الرقابية المباشرة (Live Stream)
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">آخر 10 عمليات مسجلة</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {auditLogs.slice(0, 10).map(log => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-all flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                </span>
                <span className="font-bold text-slate-900">{log.actorName}</span>
                <Badge variant="slate" size="sm">{log.actorRole}</Badge>
                <span className="font-semibold text-slate-700">{log.action}:</span>
                <span className="text-slate-600 truncate max-w-md">{log.details}</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                {log.entity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: SEND ADMINISTRATIVE ALERT */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Send className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  إرسال تنبيه إداري فوري من المدير العام
                </h3>
              </div>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {alertSuccessNotice ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{alertSuccessNotice}</span>
              </div>
            ) : (
              <form onSubmit={handleSendAlertSubmit} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold block mb-1">المستلم:</span>
                  <span className="text-indigo-700 font-bold text-sm">
                    {selectedTargetUser?.name || 'كافة الموظفين المتصلين أونلاين'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    درجة الأهمية:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'NORMAL', label: 'تنبيه عادي', color: 'border-slate-300 text-slate-700' },
                      { id: 'URGENT', label: '⚠️ عاجل ومهم', color: 'border-amber-400 text-amber-800 bg-amber-50/50' },
                      { id: 'CRITICAL', label: '🚨 حرج وفوري', color: 'border-rose-500 text-rose-800 bg-rose-50/50' }
                    ].map(u => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setAlertUrgency(u.id as any)}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          alertUrgency === u.id ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/40' : u.color
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نص التنبيه أو التعليمات الإدارية:
                  </label>
                  <textarea
                    rows={4}
                    value={alertMessage}
                    onChange={e => setAlertMessage(e.target.value)}
                    placeholder="مثال: يرجى تسوية صندوق النقدية وإرسال تقرير المقبوضات اليومي قبل الساعة 4 عصراً..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>بث التنبيه فوراً</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM KICK SESSION */}
      {sessionToKick && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  إنهاء جلسة الموظف فورياً (طرد رقابي)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيتم فصل اتصال المستخدم فوراً وإرجاعه لشاشة الدخول.
                </p>
              </div>
            </div>

            {kickResultNotice ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{kickResultNotice}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">{sessionToKick.userName}</div>
                  <div className="text-slate-500 font-mono mt-0.5">@{sessionToKick.username} · {sessionToKick.titleAr}</div>
                  <div className="text-slate-600 text-[11px] mt-1">
                    النافذة الحالية: {sessionToKick.currentWindow}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سبب إنهاء الجلسة (سيظهر للموظف وفي سجل التدقيق):
                  </label>
                  <input
                    type="text"
                    value={kickReason}
                    onChange={e => setKickReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSessionToKick(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    تراجع
                  </button>
                  <button
                    onClick={handleConfirmKick}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تأكيد إنهاء الجلسة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK PERMISSION ADJUSTMENT */}
      {userToEditPerms && permsDraft && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sliders className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  تعديل صلاحيات الموظف المباشرة
                </h3>
              </div>
              <button
                onClick={() => setUserToEditPerms(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="font-bold text-xs text-slate-700 mb-2">الصلاحيات الإجرائية المباشرة:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'canInput', label: 'إدخال حركات ومعاملات جديدة' },
                  { key: 'canIssueReceipts', label: 'إصدار سندات القبض' },
                  { key: 'canRecordExpenses', label: 'تسجيل سندات الصرف' },
                  { key: 'canCreateJournalEntries', label: 'تسجيل القيود اليدوية' },
                  { key: 'canManageInventory', label: 'حركات المستودع والعهد' },
                  { key: 'canExportReports', label: 'تصدير التقارير والقوائم' },
                  { key: 'canPrintDocs', label: 'طباعة المستندات والسندات' },
                  { key: 'canReviewReports', label: 'مراجعة التقارير الخاصة' }
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((permsDraft as any)[item.key])}
                      onChange={e => {
                        setPermsDraft(prev => prev ? ({ ...prev, [item.key]: e.target.checked }) : null);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setUserToEditPerms(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePerms}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ وتطبيق فوراً عبر الخادم</span>
              </button>
            </div>
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
