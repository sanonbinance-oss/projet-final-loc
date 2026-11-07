import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Banknote, 
  GraduationCap, 
  UserPlus, 
  Receipt, 
  KeyRound,
  ArrowLeft,
  School,
  Building
} from 'lucide-react';
import { AdmissionRequest, Payment, Student } from '../../types';
import { DEFAULT_SCHOOL_INFO } from '../../services/store';
import { DashboardTab } from './DashboardTab';
import { CashDeskTab } from './CashDeskTab';
import { StudentsTab } from './StudentsTab';
import { AdmissionsTab } from './AdmissionsTab';
import { TransactionsTab } from './TransactionsTab';
import { ApiConfigTab } from './ApiConfigTab';

interface AdminPortalProps {
  students: Student[];
  payments: Payment[];
  admissions: AdmissionRequest[];
  activeTab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api';
  setActiveTab: (tab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api') => void;
  onOpenReceipt: (payment: Payment, scolariteTotale?: number, montantPaye?: number) => void;
  onRefreshData: () => void;
  onSwitchToParent: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  students,
  payments,
  admissions,
  activeTab,
  setActiveTab,
  onOpenReceipt,
  onRefreshData,
  onSwitchToParent,
}) => {
  const school = DEFAULT_SCHOOL_INFO;
  const [cashDeskInitialStudentId, setCashDeskInitialStudentId] = useState<string | null>(null);

  const pendingAdmissionsCount = admissions.filter((a) => a.statut === 'en_attente').length;

  const handleGoToCashDesk = (studentId: string) => {
    setCashDeskInitialStudentId(studentId);
    setActiveTab('guichet');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Sub-header / Admin Status Strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              <Building className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900">
                  {school.nom}
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  {school.anneeScolaire}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Poste Secrétariat & Encaissement · Bureau Central
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToParent}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tester l'interface Parent</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-100 py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tableau de Bord</span>
          </button>

          <button
            onClick={() => setActiveTab('guichet')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'guichet'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Guichet Espèces</span>
          </button>

          <button
            onClick={() => setActiveTab('demandes')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'demandes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Demandes d'Admission</span>
            {pendingAdmissionsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px]">
                {pendingAdmissionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'eleves'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Gestion des Élèves ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Journal de Caisse ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'api'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Passerelles & Clés API</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            students={students}
            payments={payments}
            admissions={admissions}
            onOpenReceipt={onOpenReceipt}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'guichet' && (
          <CashDeskTab
            students={students}
            initialSelectedStudentId={cashDeskInitialStudentId}
            onPaymentRecorded={() => onRefreshData()}
            onOpenReceipt={onOpenReceipt}
          />
        )}

        {activeTab === 'demandes' && (
          <AdmissionsTab
            admissions={admissions}
            onAdmissionAccepted={() => onRefreshData()}
            onGoToCashDesk={handleGoToCashDesk}
          />
        )}

        {activeTab === 'eleves' && (
          <StudentsTab
            students={students}
            onGoToCashDesk={handleGoToCashDesk}
            onStudentsChanged={() => onRefreshData()}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            payments={payments}
            onOpenReceipt={onOpenReceipt}
          />
        )}

        {activeTab === 'api' && <ApiConfigTab />}
      </main>
    </div>
  );
};
