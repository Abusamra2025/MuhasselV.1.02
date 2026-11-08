/**
 * Mouhassil — Rental Collection & Property Accounting System
 * Main Application Layout & Controller
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { ForcePasswordChangeModal } from './components/users/ForcePasswordChangeModal';
import { TestSuiteModal } from './components/testing/TestSuiteModal';
import { PaymentModal } from './components/payments/PaymentModal';
import { OfficialReceiptModal } from './components/payments/OfficialReceiptModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { ExpenseDetailsModal } from './components/common/ExpenseDetailsModal';
import { Payment, PropertyExpense } from './types';
import { LoginPortal } from './components/auth/LoginPortal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import {
  LayoutDashboard,
  Building,
  FileText,
  Receipt,
  CreditCard,
  TrendingDown,
  BookOpen,
  PieChart,
  History,
  ShieldCheck,
  Crown,
  Boxes
} from 'lucide-react';

// الواجهتان الرئيسيتان تُحمَّلان عند الحاجة فقط (تقليل حجم التحميل الأول)
const GeneralManagerPortal = lazy(() =>
  import('./components/manager/GeneralManagerPortal').then(m => ({ default: m.GeneralManagerPortal }))
);
const EmployeeDepartmentWindow = lazy(() =>
  import('./components/employee/EmployeeDepartmentWindow').then(m => ({ default: m.EmployeeDepartmentWindow }))
);

const MainFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-sm text-slate-400" role="status" aria-live="polite">
    <span className="animate-pulse">جارٍ تحميل النظام...</span>
  </div>
);

const AppContent: React.FC = () => {
  const {
    currentUser: storeUser,
    setCurrentUser: setStoreUser,
    isSectionAllowed,
    isLoggedIn: storeLoggedIn,
    setIsLoggedIn,
    logoutUser
  } = useStore();

  const {
    currentUser: authUser,
    role: authRole,
    logout
  } = useAuth();

  // Authoritative user profile from Firebase Auth & Firestore
  const activeUser = authUser || storeUser;
  const isEffectiveAdmin =
    (activeUser && (activeUser.role === 'ADMIN' || (activeUser.role as any) === 'admin')) ||
    authRole === 'ADMIN' ||
    (authUser?.email?.toLowerCase() === 'ebow2012@gmail.com') ||
    (storeUser?.email?.toLowerCase() === 'ebow2012@gmail.com');

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return isEffectiveAdmin ? 'manager_portal' : 'dashboard';
  });

  // Collapsible sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInitialTenantId, setPaymentInitialTenantId] = useState<string | undefined>(undefined);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<PropertyExpense | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);

  // Keep store in sync with Firebase Auth user
  useEffect(() => {
    if (authUser) {
      setStoreUser(authUser);
      setIsLoggedIn(true);
      if (authUser.role === 'ADMIN' || authUser.email?.toLowerCase() === 'ebow2012@gmail.com') {
        setActiveTab('manager_portal');
      }
    }
  }, [authUser, setStoreUser, setIsLoggedIn]);

  // Synchronize active tab with user's allowed sections and enforce Route Guarding
  useEffect(() => {
    if (isEffectiveAdmin) {
      return;
    }

    // Route Guard: Employees cannot access administrative manager tabs
    const adminRestrictedTabs = activeUser?.role === 'AUDITOR' 
      ? ['manager_portal', 'users'] 
      : ['manager_portal', 'users', 'audit', 'tests'];

    if (!isSectionAllowed(activeTab as any) || adminRestrictedTabs.includes(activeTab)) {
      const allowed = (activeUser?.permissions?.allowedSections && activeUser.permissions.allowedSections.length > 0)
        ? activeUser.permissions.allowedSections
        : (activeUser?.role === 'EXECUTIVE'
            ? ['dashboard', 'reports']
            : activeUser?.role === 'ACCOUNTANT'
            ? ['dashboard', 'accounting', 'fixed_assets', 'expenses', 'invoices', 'reports']
            : activeUser?.role === 'CASHIER'
            ? ['dashboard', 'payments', 'invoices', 'reports']
            : activeUser?.role === 'STOREKEEPER'
            ? ['dashboard', 'inventory', 'reports']
            : ['dashboard', 'reports']);

      const target = allowed.find(s => !adminRestrictedTabs.includes(s)) || 'dashboard';
      setActiveTab(target as ActiveTab);
    }
  }, [isEffectiveAdmin, activeUser?.id, activeUser?.role, activeUser?.permissions?.allowedSections, isSectionAllowed, activeTab]);

  const handleOpenPaymentForTenant = (tenantId: string) => {
    setPaymentInitialTenantId(tenantId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (payment: Payment) => {
    setIsPaymentModalOpen(false);
    // Automatically present the printable official receipt voucher
    setViewingReceipt(payment);
  };

  const handleExpenseSuccess = (expense: PropertyExpense) => {
    setIsExpenseModalOpen(false);
    // Automatically present the printable official expense voucher
    setViewingExpense(expense);
  };

  const handleFullLogout = async () => {
    try {
      await logout();
    } catch {}
    logoutUser();
  };

  // Route Guard 1: If user is not logged in, force-render LoginPortal
  if (!storeLoggedIn && !authUser) {
    return <LoginPortal />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 w-full max-w-full overflow-x-hidden" dir="rtl">
      
      {/* Top Header */}
      <Header
        onOpenPaymentModal={() => {
          setPaymentInitialTenantId(undefined);
          setIsPaymentModalOpen(true);
        }}
        onOpenExpenseModal={() => {
          setIsExpenseModalOpen(true);
        }}
        onOpenAuditModal={() => {
          if (isEffectiveAdmin) {
            setIsAuditModalOpen(true);
          }
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onToggleSidebar={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsMobileSidebarOpen(prev => !prev);
          } else {
            setIsSidebarCollapsed(prev => !prev);
          }
        }}
      />

      {/* Main App Layout with Responsive Collapsible Sidebar & Smooth Content Motion */}
      <div className={`flex-1 flex w-full relative min-h-0 overflow-x-hidden ${isEffectiveAdmin ? 'max-w-[1920px] mx-auto' : 'max-w-7xl mx-auto'}`}>
        
        {/* Collapsible Lateral Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Display Area — flex-1 with min-w-0 and transition-all so it never cuts off and animates smoothly */}
        <main className="flex-1 min-w-0 transition-all duration-300 ease-in-out p-1.5 sm:p-3 lg:p-6 overflow-y-auto w-full">
          <Suspense fallback={<MainFallback />}>
          {isEffectiveAdmin ? (
            <GeneralManagerPortal
              activeTab={activeTab}
              onNavigateTab={tab => setActiveTab(tab)}
              onOpenReport={() => setActiveTab('reports')}
            />
          ) : (
            <ProtectedRoute allowedRoles={['ACCOUNTANT', 'CASHIER', 'AUDITOR', 'STOREKEEPER', 'EXECUTIVE']}>
              <EmployeeDepartmentWindow
                activeTab={activeTab}
                onNavigateTab={tab => setActiveTab(tab)}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
                onOpenPaymentModal={() => {
                  setPaymentInitialTenantId(undefined);
                  setIsPaymentModalOpen(true);
                }}
              />
            </ProtectedRoute>
          )}
          </Suspense>
        </main>
      </div>

      {/* System Credits & Copyright Footer */}
      <footer className="no-print mt-auto py-3.5 px-4 border-t border-slate-200 bg-white text-center text-xs text-slate-600 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="font-black text-slate-800">نظام مُحصّل لإدارة وتحصيل الإيجارات والمحاسبة العقارية</span>
          <span className="font-bold text-emerald-700">تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (Visible ONLY for employees, completely hidden for General Manager) */}
      {!isEffectiveAdmin && (
        <nav className="md:hidden no-print fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-40 text-[10px]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-1 font-medium ${
              activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex flex-col items-center p-1 font-medium ${
              activeTab === 'invoices' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            <span>الفواتير</span>
          </button>

          <button
            onClick={() => {
              setPaymentInitialTenantId(undefined);
              setIsPaymentModalOpen(true);
            }}
            className="flex flex-col items-center p-1 bg-emerald-600 text-white rounded-lg px-2.5 font-bold shadow-xs"
          >
            <CreditCard className="w-4 h-4 mb-0.5" />
            <span>سند قبض</span>
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            className={`flex flex-col items-center p-1 font-medium ${
              activeTab === 'accounting' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>المحاسبة</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center p-1 font-medium ${
              activeTab === 'reports' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <PieChart className="w-4 h-4 mb-0.5" />
            <span>التقارير</span>
          </button>
        </nav>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          initialTenantId={paymentInitialTenantId}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Printable Official Receipt Modal */}
      {viewingReceipt && (
        <OfficialReceiptModal
          payment={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Expense Voucher Creation Modal */}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSuccess={handleExpenseSuccess}
        />
      )}

      {/* Printable Official Expense Voucher Modal */}
      {viewingExpense && (
        <ExpenseDetailsModal
          expense={viewingExpense}
          onClose={() => setViewingExpense(null)}
        />
      )}

      {/* Audit Test Suite Modal */}
      {isAuditModalOpen && (
        <TestSuiteModal onClose={() => setIsAuditModalOpen(false)} />
      )}

      {/* Mandatory First-Login Password Change Modal */}
      <ForcePasswordChangeModal />

      {/* PWA Mobile Install Prompt */}
      <PWAInstallPrompt />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
