import React from 'react';
import { Lock, GraduationCap, ArrowRight, ShieldCheck, LogOut, Coins, FileSpreadsheet, Mail } from 'lucide-react';
import { UserRole, ParentTab } from '../types';
import { SyncBanner } from './SyncBanner';

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenAdminLogin: () => void;
  adminAuthenticated: boolean;
  onLogoutAdmin: () => void;
  activeParentTab: ParentTab;
  setActiveParentTab: (tab: ParentTab) => void;
  activeAdminTab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'tarifs' | 'journal' | 'api';
  setActiveAdminTab: (tab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'tarifs' | 'journal' | 'api') => void;
  pendingAdmissionsCount: number;
  unreadMessagesCount?: number;
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
  unreadMessagesCount = 0,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 py-2.5 sm:py-3.5">
        {/* Zone 1: Single brand wordmark */}
        <button
          onClick={() => {
            if (currentRole === 'parent') {
              setActiveParentTab('paiement');
            } else {
              setActiveAdminTab('dashboard');
            }
          }}
          className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer text-left group min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-50" />
          </div>
          <span className="flex items-center gap-1.5 truncate">
            <span className="truncate">EduPay Scolarité</span>
            {currentRole === 'admin' && (
              <span className="hidden sm:inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-1">
                Espace Secrétariat
              </span>
            )}
          </span>
        </button>

        {/* Zone 2: Concise single-line text links (Desktop) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
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
                onClick={() => setActiveParentTab('messages')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  activeParentTab === 'messages'
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full leading-none">
                    {unreadMessagesCount}
                  </span>
                )}
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentRole === 'parent' ? (
            <button
              onClick={() => setActiveParentTab('paiement')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <span className="sm:hidden">Payer</span>
              <span className="hidden sm:inline">Payer ma scolarité</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                <SyncBanner minimal={true} />
              </div>
              <button
                onClick={onLogoutAdmin}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-rose-200 cursor-pointer"
                title="Verrouiller la session secrétaire"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="sm:hidden">Quitter</span>
                <span className="hidden sm:inline">Verrouiller / Déconnexion</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Parent Tab Strip (< md) */}
      {currentRole === 'parent' && (
        <div className="md:hidden border-t border-slate-100 bg-slate-50/90 px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveParentTab('paiement')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeParentTab === 'paiement'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            Paiement
          </button>
          <button
            onClick={() => setActiveParentTab('inscription')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeParentTab === 'inscription'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            Admission
          </button>
          <button
            onClick={() => setActiveParentTab('messages')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer inline-flex items-center gap-1 ${
              activeParentTab === 'messages'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            <Mail className="w-3 h-3" />
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-extrabold rounded-full leading-none">
                {unreadMessagesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveParentTab('tarifs')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeParentTab === 'tarifs'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            Tarifs
          </button>
          <button
            onClick={() => setActiveParentTab('contact')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeParentTab === 'contact'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            Contact
          </button>
        </div>
      )}
    </header>
  );
};
