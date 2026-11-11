import React from 'react';
import { Lock, GraduationCap, ArrowRight, ShieldCheck, LogOut, Coins, FileSpreadsheet } from 'lucide-react';
import { UserRole } from '../types';
import { SyncBanner } from './SyncBanner';

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenAdminLogin: () => void;
  adminAuthenticated: boolean;
  onLogoutAdmin: () => void;
  activeParentTab: 'paiement' | 'inscription' | 'tarifs' | 'contact';
  setActiveParentTab: (tab: 'paiement' | 'inscription' | 'tarifs' | 'contact') => void;
  activeAdminTab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'tarifs' | 'journal' | 'api';
  setActiveAdminTab: (tab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'tarifs' | 'journal' | 'api') => void;
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
          className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-5 h-5 text-emerald-50" />
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

        {/* Zone 2: Concise single-line text links */}
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
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Poste Direction & Secrétariat · Session 2027-2028</span>
            </div>
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
            <div className="flex items-center gap-3">
              <SyncBanner minimal={true} />
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
