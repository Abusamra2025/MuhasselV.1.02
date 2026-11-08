// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { useStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { LoginPortal } from './LoginPortal';
import { UserRole } from '../../types';
import { ShieldAlert, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  adminOnly = false
}) => {
  const { isLoggedIn, currentUser } = useStore();

  // 1. Authentication Guard: Must be authenticated and logged in
  if (!isLoggedIn) {
    return <LoginPortal />;
  }

  // 2. Admin Guard: If section requires Admin role
  if (adminOnly && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-md w-full shadow-lg space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-rose-900">منطقة محظورة (Access Denied)</h3>
          <p className="text-xs text-rose-700 leading-relaxed">
            هذه الصفحة مخصصة حصراً للإدارة العامة والمدير العام (ADMIN). بصفتك ({currentUser.titleAr})، لا تملك الصلاحية للوصول إليها.
          </p>
        </div>
      </div>
    );
  }

  // 3. Role-Based Guard: Specific roles
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-md w-full shadow-lg space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-amber-900">غير مصرح بالوصول</h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            دورك الحالي ({currentUser.titleAr}) غير مدرج ضمن الأدوار المصرح لها بعرض هذه الصفحة.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
