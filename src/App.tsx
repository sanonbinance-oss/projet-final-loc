/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AdminTab,
  UserRole,
  Student,
  Payment,
  AdmissionRequest,
  ParentTab,
  ParentAccount,
  StaffSession,
} from './types';
import { SchoolStore } from './services/store';
import { Navbar } from './components/Navbar';
import { ParentPortal } from './components/parent/ParentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { SecretaryLoginScreen } from './components/admin/SecretaryLoginScreen';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ReceiptVerifyModal } from './components/ReceiptVerifyModal';
import { SyncService } from './services/sync';
import {
  clearParentToken,
  clearSecretaryToken,
  getParentAccount,
  getStaffSession,
  setActiveAuthScope,
} from './services/supabaseClient';
import { getReadMessageIds, buildParentMessages } from './components/parent/ParentMessagesTab';
import { CheckCircle2 } from 'lucide-react';

/**
 * Détecte si l'URL courante correspond à l'accès administration réservé
 */
function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    search.includes('espace=secretaire') ||
    search.includes('espace=admin') ||
    search.includes('role=admin') ||
    search.includes('admin=true') ||
    search.includes('secretaire=true') ||
    path.endsWith('/admin') ||
    path.endsWith('/secretaire') ||
    hash.includes('admin') ||
    hash.includes('secretaire')
  );
}

function readVerifyParams(): { ref: string; sig: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('verify')?.trim();
  if (!ref) return null;
  return { ref, sig: params.get('sig')?.trim() || '' };
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => getStaffSession());
  const [parentAccount, setParentAccount] = useState<ParentAccount | null>(() => getParentAccount());
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Verification Modal (?verify=...&sig=...)
  const initialVerify = readVerifyParams();
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(() => Boolean(initialVerify));
  const [verifyInitialRef, setVerifyInitialRef] = useState<string>(() => initialVerify?.ref || '');
  const [verifyInitialSig, setVerifyInitialSig] = useState<string>(() => initialVerify?.sig || '');

  // Tab navigation states
  const [activeParentTab, setActiveParentTab] = useState<ParentTab>('paiement');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('dashboard');

  // Store data state
  const [students, setStudents] = useState<Student[]>(() => SchoolStore.getStudents());
  const [payments, setPayments] = useState<Payment[]>(() => SchoolStore.getPayments());
  const [admissions, setAdmissions] = useState<AdmissionRequest[]>(() => SchoolStore.getAdmissions());
  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => getReadMessageIds());

  // Receipt Modal state
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptScolariteTotale, setReceiptScolariteTotale] = useState<number | undefined>();
  const [receiptMontantTotalPaye, setReceiptMontantTotalPaye] = useState<number | undefined>();

  // Toast notification
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const refreshAllData = useCallback(() => {
    setStudents(SchoolStore.getStudents());
    setPayments(SchoolStore.getPayments());
    setAdmissions(SchoolStore.getAdmissions());
    setReadMessageIds(getReadMessageIds());
  }, []);

  // Initialize Realtime synchronization on app mount
  useEffect(() => {
    setActiveAuthScope(isAdminRoute && adminAuthenticated ? 'staff' : 'parent');
    SchoolStore.setScope(
      isAdminRoute && adminAuthenticated
        ? 'staff'
        : parentAccount
        ? `parent:${parentAccount.id}`
        : 'public'
    );
    SyncService.initialiser();
    return () => {
      SyncService.arreter();
    };
  }, []);

  // Listen to URL changes (when user modifies browser query/hash)
  useEffect(() => {
    const handleLocationChange = () => {
      const isNowAdmin = checkIsAdminRoute();
      setIsAdminRoute(isNowAdmin);
      if (isNowAdmin && !adminAuthenticated) {
        setIsAdminLoginOpen(true);
      }
      const verifyParams = readVerifyParams();
      if (verifyParams) {
        setVerifyInitialRef(verifyParams.ref);
        setVerifyInitialSig(verifyParams.sig);
        setVerifyModalOpen(true);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    if (isAdminRoute && !adminAuthenticated) {
      setIsAdminLoginOpen(true);
    }

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [isAdminRoute, adminAuthenticated]);

  useEffect(() => {
    const unsubscribe = SchoolStore.subscribe(() => {
      refreshAllData();
    });

    const handleStorageEvent = () => {
      refreshAllData();
    };

    const handleReadChange = () => {
      setReadMessageIds(getReadMessageIds());
    };

    window.addEventListener('edupay_storage_change', handleStorageEvent);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('edupay_messages_read_change', handleReadChange);

    return () => {
      unsubscribe();
      window.removeEventListener('edupay_storage_change', handleStorageEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('edupay_messages_read_change', handleReadChange);
    };
  }, [refreshAllData]);

  const handleParentAuthenticated = (parent: ParentAccount) => {
    setParentAccount(parent);
    setActiveAuthScope('parent');
    SchoolStore.setScope(`parent:${parent.id}`);
    refreshAllData();
    void SyncService.synchroniserMaintenant();
  };

  const handleParentLogout = useCallback(() => {
    clearParentToken();
    setParentAccount(null);
    setActiveAuthScope('parent');
    SchoolStore.setScope('public');
    refreshAllData();
    void SyncService.synchroniserMaintenant();
  }, [refreshAllData]);

  const handleAdminLoginSuccess = () => {
    const session = getStaffSession();
    setStaffSession(session);
    setAdminAuthenticated(true);
    setIsAdminRoute(true);
    setActiveAuthScope('staff');
    SchoolStore.setScope('staff');
    refreshAllData();
    void SyncService.synchroniserMaintenant();

    SchoolStore.addAuditLog({
      typeAction: 'CONNEXION',
      auteur: session?.author || 'Secrétaire Principale',
      description: `Connexion réussie à l'Espace Secrétariat (${session?.staffRole || 'SECRETAIRE'})`,
      details: {
        role: session?.staffRole || 'SECRETAIRE',
        timestamp: new Date().toISOString(),
      },
      niveauGravite: 'INFO',
    });
  };

  const handleAdminLogout = () => {
    clearSecretaryToken();
    setStaffSession(null);
    setAdminAuthenticated(false);
    setIsAdminRoute(false);
    setActiveAuthScope('parent');
    SchoolStore.setScope(parentAccount ? `parent:${parentAccount.id}` : 'public');
    refreshAllData();
    void SyncService.synchroniserMaintenant();

    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, '', cleanUrl);
    }
  };

  const handleOpenReceipt = (payment: Payment, scolariteTotale?: number, montantPaye?: number) => {
    const student = students.find((s) => s.id === payment.studentId);
    setReceiptPayment(payment);
    setReceiptScolariteTotale(scolariteTotale || student?.scolariteTotale || 180000);
    setReceiptMontantTotalPaye(montantPaye !== undefined ? montantPaye : student?.montantPaye);
  };

  const handlePaymentSuccess = (payment: Payment) => {
    refreshAllData();
    setLiveToast(`Nouveau paiement de ${payment.montant.toLocaleString('fr-FR')} FCFA enregistré avec succès !`);
    setTimeout(() => setLiveToast(null), 5000);
  };

  const handleOpenVerifyModal = () => {
    setVerifyInitialRef('');
    setVerifyInitialSig('');
    setVerifyModalOpen(true);
  };

  const handleCloseVerifyModal = () => {
    setVerifyModalOpen(false);
    if (typeof window !== 'undefined' && window.location.search.includes('verify=')) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  };

  if (isAdminRoute && !adminAuthenticated) {
    return (
      <SecretaryLoginScreen
        onSuccess={handleAdminLoginSuccess}
        onReturnToPublic={handleAdminLogout}
      />
    );
  }

  const currentRole: UserRole = isAdminRoute && adminAuthenticated ? 'admin' : 'parent';
  const readMessageSet = new Set(readMessageIds);
  const ownedStudentIds = new Set(
    parentAccount ? students.filter((s) => s.parentCompteId === parentAccount.id).map((s) => s.id) : []
  );
  const unreadMessagesCount = parentAccount
    ? buildParentMessages(
        admissions.filter((a) => a.parentCompteId === parentAccount.id),
        payments.filter((p) => p.parentCompteId === parentAccount.id || ownedStudentIds.has(p.studentId))
      ).filter((m) => !readMessageSet.has(m.id)).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={(r) => {
          if (r === 'parent') {
            handleAdminLogout();
          }
        }}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        adminAuthenticated={adminAuthenticated}
        onLogoutAdmin={handleAdminLogout}
        parentAccount={parentAccount}
        onLogoutParent={handleParentLogout}
        onOpenVerifyReceipt={handleOpenVerifyModal}
        activeParentTab={activeParentTab}
        setActiveParentTab={setActiveParentTab}
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
        pendingAdmissionsCount={admissions.filter((a) => a.statut === 'en_attente').length}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Live Toast Alert */}
      {liveToast && (
        <div className="no-print fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{liveToast}</span>
        </div>
      )}

      {/* Main Role Content */}
      <div className="flex-1">
        {currentRole === 'parent' ? (
          <ParentPortal
            parentAccount={parentAccount}
            onParentAuthenticated={handleParentAuthenticated}
            onParentLogout={handleParentLogout}
            onOpenVerifyReceipt={handleOpenVerifyModal}
            students={students}
            admissions={admissions}
            payments={payments}
            readMessageIds={readMessageIds}
            onPaymentSuccess={handlePaymentSuccess}
            onOpenReceipt={(payment) => handleOpenReceipt(payment)}
            activeTab={activeParentTab}
            setActiveTab={setActiveParentTab}
          />
        ) : (
          <AdminPortal
            students={students}
            payments={payments}
            admissions={admissions}
            staffSession={staffSession}
            activeTab={activeAdminTab}
            setActiveTab={setActiveAdminTab}
            onOpenReceipt={handleOpenReceipt}
            onRefreshData={refreshAllData}
            onSwitchToParent={handleAdminLogout}
          />
        )}
      </div>

      {/* Admin PIN Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          if (!adminAuthenticated) {
            setIsAdminRoute(false);
            if (typeof window !== 'undefined') {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.pushState({}, '', cleanUrl);
            }
          }
        }}
        onSuccess={handleAdminLoginSuccess}
      />

      <ReceiptModal
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
        studentScolariteTotale={receiptScolariteTotale}
        studentMontantTotalPaye={receiptMontantTotalPaye}
      />

      <ReceiptVerifyModal
        isOpen={verifyModalOpen}
        initialRef={verifyInitialRef}
        initialSig={verifyInitialSig}
        onClose={handleCloseVerifyModal}
      />
    </div>
  );
}


