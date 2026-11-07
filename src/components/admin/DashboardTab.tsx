import React from 'react';
import { 
  Banknote, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight, 
  Receipt, 
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AdmissionRequest, Payment, Student } from '../../types';
import { PaymentService } from '../../services/paymentService';

interface DashboardTabProps {
  students: Student[];
  payments: Payment[];
  admissions: AdmissionRequest[];
  onOpenReceipt: (payment: Payment) => void;
  onNavigateToTab: (tab: 'dashboard' | 'guichet' | 'eleves' | 'demandes' | 'transactions' | 'api') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  students,
  payments,
  admissions,
  onOpenReceipt,
  onNavigateToTab,
}) => {
  // Calculations
  const totalEncaisse = payments.reduce((acc, p) => acc + p.montant, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const encaisseAujourdhui = payments
    .filter((p) => new Date(p.date) >= startOfToday)
    .reduce((acc, p) => acc + p.montant, 0);

  const totalScolaritesTheorique = students.reduce((acc, s) => acc + s.scolariteTotale, 0);
  const resteARecouvrer = Math.max(0, totalScolaritesTheorique - totalEncaisse);
  const tauxRecouvrement = totalScolaritesTheorique > 0 
    ? Math.round((totalEncaisse / totalScolaritesTheorique) * 100) 
    : 0;

  const pendingAdmissions = admissions.filter((a) => a.statut === 'en_attente');

  // Channel breakdown
  const parOperateur = {
    ORANGE_MONEY: payments.filter((p) => p.mode === 'ORANGE_MONEY').reduce((a, b) => a + b.montant, 0),
    MOOV_MONEY: payments.filter((p) => p.mode === 'MOOV_MONEY').reduce((a, b) => a + b.montant, 0),
    MTN_MONEY: payments.filter((p) => p.mode === 'MTN_MONEY').reduce((a, b) => a + b.montant, 0),
    ESPECES_GUICHET: payments.filter((p) => p.mode === 'ESPECES_GUICHET').reduce((a, b) => a + b.montant, 0),
  };

  const totalMobileMoney = parOperateur.ORANGE_MONEY + parOperateur.MOOV_MONEY + parOperateur.MTN_MONEY;

  return (
    <div className="space-y-6">
      {/* Live Notice Banner for Secretary */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">
                Console de Contrôle en Direct · Secrétariat Général
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Synchronisé
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Toutes les demandes de places et les règlements Mobile Money des parents s'actualisent ici sans recharger la page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('guichet')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Guichet Espèces</span>
          </button>
          <button
            onClick={() => onNavigateToTab('demandes')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Voir Demandes</span>
            {pendingAdmissions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px]">
                {pendingAdmissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Encaissé */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Encaissé</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 tracking-tight">
            {totalEncaisse.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-sans font-normal">FCFA</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span>Taux de recouvrement: {tauxRecouvrement}%</span>
          </div>
        </div>

        {/* Card 2: Encaissé Aujourd'hui */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Encaissé Aujourd'hui</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 tracking-tight">
            {encaisseAujourdhui.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-sans font-normal">FCFA</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Transactions du jour traitées
          </div>
        </div>

        {/* Card 3: Reste à Recouvrer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reste à Recouvrer</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-amber-800 tracking-tight">
            {resteARecouvrer.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-sans font-normal">FCFA</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Sur {totalScolaritesTheorique.toLocaleString('fr-FR')} FCFA exigibles
          </div>
        </div>

        {/* Card 4: Demandes d'admission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Demandes en Attente</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-900 tracking-tight">
            {pendingAdmissions.length}
          </div>
          <div className="mt-2 text-[11px] text-purple-700 font-medium">
            {pendingAdmissions.length > 0 ? 'Dossiers à examiner' : 'Tous les dossiers sont traités'}
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown & Recent Live Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Revenue Channel Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Répartition par Canal d'Encaissement
          </h3>

          <div className="space-y-3 text-xs">
            {/* Orange Money */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF7900]"></span>
                  Orange Money Burkina
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {parOperateur.ORANGE_MONEY.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF7900]"
                  style={{
                    width: `${totalEncaisse > 0 ? (parOperateur.ORANGE_MONEY / totalEncaisse) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Moov Money */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0070BA]"></span>
                  Moov Africa Burkina
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {parOperateur.MOOV_MONEY.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0070BA]"
                  style={{
                    width: `${totalEncaisse > 0 ? (parOperateur.MOOV_MONEY / totalEncaisse) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* MTN */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]"></span>
                  MTN Mobile Money
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {parOperateur.MTN_MONEY.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{
                    width: `${totalEncaisse > 0 ? (parOperateur.MTN_MONEY / totalEncaisse) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Espèces Guichet */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Espèces au Guichet (Comptoir)
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {parOperateur.ESPECES_GUICHET.toLocaleString('fr-FR')} F
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600"
                  style={{
                    width: `${totalEncaisse > 0 ? (parOperateur.ESPECES_GUICHET / totalEncaisse) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Part Mobile Money à distance :</span>
              <span className="font-mono font-bold text-slate-900">
                {totalMobileMoney.toLocaleString('fr-FR')} FCFA ({totalEncaisse > 0 ? Math.round((totalMobileMoney / totalEncaisse) * 100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Part Espèces en présentiel :</span>
              <span className="font-mono font-bold text-emerald-800">
                {parOperateur.ESPECES_GUICHET.toLocaleString('fr-FR')} FCFA ({totalEncaisse > 0 ? Math.round((parOperateur.ESPECES_GUICHET / totalEncaisse) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Payment Feed */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Derniers Versements Reçus en Direct
              </h3>
              <p className="text-[11px] text-slate-500">
                Chaque transaction génère une quittance téléchargeable et imprimable.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Tout voir</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {payments.slice(0, 6).map((p) => {
              const dateStr = new Date(p.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        p.mode === 'ESPECES_GUICHET'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {p.mode === 'ESPECES_GUICHET' ? (
                        <Banknote className="w-4 h-4" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.studentNom}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.studentClasse} · {PaymentService.getPaymentMethodLabel(p.mode)} · {dateStr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      +{p.montant.toLocaleString('fr-FR')} F
                    </span>
                    <button
                      onClick={() => onOpenReceipt(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Imprimer / voir le reçu"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
