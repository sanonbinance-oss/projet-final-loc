/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { UserRole, Student, Payment, AdmissionRequest } from './types';
import { SchoolStore } from './services/store';
import { Navbar } from './components/Navbar';
import { ParentPortal } from './components/parent/ParentPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';

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

  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('edupay_admin_auth') === 'true';
    }
    return false;
  });

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Tab navigation states
  const [activeParentTab, setActiveParentTab] = useState<'paiement' | 'inscription' | 'tarifs' | 'contact'>('paiement');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api'>('dashboard');

  // Store data state
  const [students, setStudents] = useState<Student[]>(() => SchoolStore.getStudents());
  const [payments, setPayments] = useState<Payment[]>(() => SchoolStore.getPayments());
  const [admissions, setAdmissions] = useState<AdmissionRequest[]>(() => SchoolStore.getAdmissions());

  // Receipt Modal state
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptScolariteTotale, setReceiptScolariteTotale] = useState<number | undefined>();
  const [receiptMontantTotalPaye, setReceiptMontantTotalPaye] = useState<number | undefined>();

  // Toast notification
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const refreshAllData = useCallback(() => {
    setStudents(SchoolStore.getStudents());
    setPayments(SchoolStore.getPayments());
    setAdmissions(SchoolStore.getAdmissions());
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
    };

    window.addEventListener('edupay_storage_change', handleStorageEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('edupay_storage_change', handleStorageEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [refreshAllData]);

  const handleAdminLoginSuccess = () => {
    setAdminAuthenticated(true);
    localStorage.setItem('edupay_admin_auth', 'true');
    setIsAdminRoute(true);
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    localStorage.removeItem('edupay_admin_auth');
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

  const currentRole: UserRole = isAdminRoute && adminAuthenticated ? 'admin' : 'parent';

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
            onPaymentSuccess={handlePaymentSuccess}
            onOpenReceipt={(payment) => handleOpenReceipt(payment)}
            activeTab={activeParentTab}
            setActiveTab={setActiveParentTab}
          />
        ) : (
          /* SECRETARY / ADMIN INTERFACE: Only visible through the split admin URL */
          <div>
            {/* Helpful URL Reminder Banner in Admin for Secretary */}
            <div className="no-print bg-slate-900 text-slate-300 text-xs px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>Espace Secrétariat privé :</strong> Les parents ont uniquement accès au lien public sans ces commandes.
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-800 px-3 py-1 rounded-lg">
                <span className="text-slate-400">Lien direct secrétaire :</span>
                <span className="text-emerald-300">{typeof window !== 'undefined' ? window.location.origin + '?espace=secretaire' : '?espace=secretaire'}</span>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(window.location.origin + '?espace=secretaire');
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="ml-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Copier le lien secrétaire"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

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
          </div>
        )}
      </div>

      {/* Footer (Cleaned: no links to admin for parents) */}
      <footer className="no-print border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2025 - 2026 Groupe Scolaire Excellence & Avenir · Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Discipline · Travail · Réussite</span>
            <span aria-hidden="true">·</span>
            <span>Burkina Faso</span>
          </div>
        </div>
      </footer>

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

