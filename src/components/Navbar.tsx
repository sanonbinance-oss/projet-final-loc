import React from 'react';
import { Lock, GraduationCap, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenAdminLogin: () => void;
  adminAuthenticated: boolean;
  onLogoutAdmin: () => void;
  activeParentTab: 'paiement' | 'inscription' | 'tarifs' | 'contact';
  setActiveParentTab: (tab: 'paiement' | 'inscription' | 'tarifs' | 'contact') => void;
  activeAdminTab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api';
  setActiveAdminTab: (tab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api') => void;
  pendingAdmissionsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  onOpenAdminLogin,
  adminAuthenticated,
  onLogoutAdmin,
  activeParentTab,
  setActiveParentTab,
  activeAdminTab,
  setActiveAdminTab,
  pendingAdmissionsCount,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single brand wordmark */}
        <button
          onClick={() => {
            if (currentRole === 'parent') {
              setActiveParentTab('paiement');
            } else {
              setActiveAdminTab('dashboard');
            }
          }}
          className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            EP
          </div>
          <span className="flex items-center gap-1.5">
            EduPay Scolarité
            {currentRole === 'admin' && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-1">
                Espace Secrétariat
              </span>
            )}
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {currentRole === 'parent' ? (
            <>
              <button
                onClick={() => setActiveParentTab('paiement')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeParentTab === 'paiement'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paiement Scolarité
              </button>
              <button
                onClick={() => setActiveParentTab('inscription')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeParentTab === 'inscription'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Demande de Place
              </button>
              <button
                onClick={() => setActiveParentTab('tarifs')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeParentTab === 'tarifs'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grille des Frais
              </button>
              <button
                onClick={() => setActiveParentTab('contact')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeParentTab === 'contact'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Secrétariat & Contact
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveAdminTab('dashboard')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAdminTab === 'dashboard'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tableau de Bord
              </button>
              <button
                onClick={() => setActiveAdminTab('guichet')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAdminTab === 'guichet'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Guichet Espèces
              </button>
              <button
                onClick={() => setActiveAdminTab('demandes')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer relative ${
                  activeAdminTab === 'demandes'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Demandes d'Admission</span>
                {pendingAdmissionsCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                    {pendingAdmissionsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveAdminTab('eleves')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAdminTab === 'eleves'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gestion des Élèves
              </button>
              <button
                onClick={() => setActiveAdminTab('transactions')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAdminTab === 'transactions'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Journal Financier
              </button>
              <button
                onClick={() => setActiveAdminTab('api')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAdminTab === 'api'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clés API
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentRole === 'parent' ? (
            <button
              onClick={() => setActiveParentTab('paiement')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              Payer ma scolarité
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLogoutAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-rose-200 cursor-pointer"
                title="Verrouiller la session secrétaire"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Verrouiller / Déconnexion</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
