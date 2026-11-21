/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { UserRole, Student, Payment, AdmissionRequest, ParentTab } from './types';
import { SchoolStore } from './services/store';
import { Navbar } from './components/Navbar';
import { ParentPortal } from './components/parent/ParentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { SecretaryLoginScreen } from './components/admin/SecretaryLoginScreen';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SyncService } from './services/sync';
import { clearSecretaryToken } from './services/supabaseClient';
import { getReadMessageIds, buildParentMessages } from './components/parent/ParentMessagesTab';
import { CheckCircle2 } from 'lucide-react';

/**
 * Détecte si l'URL courante correspond à l'accès administration réservé
 * Formats reconnus :
 * 1. Query: ?espace=secretaire ou ?role=admin ou ?admin=true
 * 2. Path: /admin ou /secretaire
 * 3. Hash: #/admin ou #/secretaire
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

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());

  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Tab navigation states
  const [activeParentTab, setActiveParentTab] = useState<ParentTab>('paiement');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'tarifs' | 'journal' | 'api'>('dashboard');

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
  }, []);

  // Initialize Realtime Supabase synchronization on app mount
  useEffect(() => {
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
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Initial check: if secretary opens the secret link directly
    if (isAdminRoute && !adminAuthenticated) {
      setIsAdminLoginOpen(true);
    }

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [isAdminRoute, adminAuthenticated]);

  useEffect(() => {
    // Subscribe to store updates (so parent actions immediately show on admin screen)
    const unsubscribe = SchoolStore.subscribe(() => {
      refreshAllData();
    });

    const handleStorageEvent = () => {
      refreshAllData();
      setReadMessageIds(getReadMessageIds());
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

  const handleAdminLoginSuccess = () => {
    setAdminAuthenticated(true);
    setIsAdminRoute(true);
    void SyncService.synchroniserMaintenant();

    SchoolStore.addAuditLog({
      typeAction: 'CONNEXION',
      auteur: 'Secrétaire Principale',
      description: 'Connexion réussie à l\'Espace Secrétariat via code PIN sécurisé',
      details: {
        timestamp: new Date().toISOString(),
      },
      niveauGravite: 'INFO',
    });
  };

  const handleAdminLogout = () => {
    clearSecretaryToken();
    setAdminAuthenticated(false);
    setIsAdminRoute(false);
    // Clean URL to standard parent root
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
  const unreadMessagesCount = buildParentMessages(admissions, payments).filter(
    (m) => !readMessageSet.has(m.id)
  ).length;

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
          /* PURE PARENT INTERFACE: Zero admin buttons, zero admin hints */
          <ParentPortal
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
            activeTab={activeAdminTab}
            setActiveTab={setActiveAdminTab}
            onOpenReceipt={handleOpenReceipt}
            onRefreshData={refreshAllData}
            onSwitchToParent={handleAdminLogout}
          />
        )}
      </div>

      {/* Admin PIN Login Modal (Triggered when accessing the secret admin URL) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          if (!adminAuthenticated) {
            // If cancelled, revert to parent page
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
    </div>
  );
}

