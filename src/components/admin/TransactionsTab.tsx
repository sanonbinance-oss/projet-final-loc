import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  Download, 
  Filter, 
  Calendar,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { Payment, PaymentMethod } from '../../types';
import { PaymentService } from '../../services/paymentService';
import { SchoolStore } from '../../services/store';

interface TransactionsTabProps {
  payments: Payment[];
  onOpenReceipt: (payment: Payment) => void;
  onRefreshData?: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  payments,
  onOpenReceipt,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [rejectMotif, setRejectMotif] = useState("Fonds non reçus sur le compte Orange Money de l'établissement");

  const handleValidateMobilePayment = (p: Payment) => {
    SchoolStore.validateMobileMoneyPayment(p.id, 'Secrétaire Principale');
    if (onRefreshData) onRefreshData();
  };

  const handleOpenRejectModal = (p: Payment) => {
    setRejectingPayment(p);
  };

  const handleConfirmReject = () => {
    if (!rejectingPayment) return;
    SchoolStore.rejectMobileMoneyPayment(rejectingPayment.id, rejectMotif || 'Fonds non reçus');
    setRejectingPayment(null);
    if (onRefreshData) onRefreshData();
  };

  const pendingMobilePayments = payments.filter((p) => p.statut === 'EN_ATTENTE_VERIFICATION');

  const filtered = payments.filter((p) => {
    if (modeFilter !== 'ALL' && p.mode !== modeFilter) return false;
    if (search.trim() === '') return true;
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      p.studentNom.toLowerCase().includes(q) ||
      p.studentMatricule.toLowerCase().includes(q) ||
      p.nomPayeur.toLowerCase().includes(q) ||
      (p.codeOtp && p.codeOtp.includes(q))
    );
  });

  const totalFiltered = filtered
    .filter((p) => p.statut === 'SUCCES')
    .reduce((acc, p) => acc + p.montant, 0);

  const handleExportCSV = () => {
    const headers = ['Reference', 'Date', 'Matricule', 'Nom Eleve', 'Classe', 'Montant FCFA', 'Mode', 'Payeur', 'Statut', 'Code OTP', 'Encaisse Par'];
    const rows = filtered.map((p) => [
      p.reference,
      new Date(p.date).toLocaleString('fr-FR'),
      p.studentMatricule,
      `"${p.studentNom}"`,
      p.studentClasse,
      p.montant,
      PaymentService.getPaymentMethodLabel(p.mode),
      `"${p.nomPayeur}"`,
      p.statut,
      p.codeOtp || '',
      p.encaissePar,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_scolarite_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Journal de Caisse & Rapprochement Financier
          </h2>
          <p className="text-xs text-slate-500">
            Contrôle des versements Mobile Money (Orange Money, Moov) et encaissements espèces au guichet.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exporter Journal CSV</span>
        </button>
      </div>

      {/* PENDING MOBILE MONEY VERIFICATION NOTIFICATION & ACTION BOX */}
      {pendingMobilePayments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 rounded-2xl p-5 shadow-md">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <span>Versements Mobile Money en attente de vérification ({pendingMobilePayments.length})</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[11px] font-mono">
                    Autorisation Caisse Requise
                  </span>
                </h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  Le parent a validé son code OTP sur son téléphone. <strong>Vérifiez la réception effective du SMS sur le téléphone de l'école (+226 70 00 11 22)</strong> avant de débloquer le reçu officiel.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingMobilePayments.map((p) => (
              <div key={p.id} className="bg-white border border-amber-300 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase">
                      {p.mode === 'ORANGE_MONEY' ? 'Orange Money' : p.mode === 'MOOV_MONEY' ? 'Moov Africa' : 'Mobile Money'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{p.studentNom}</h4>
                    <p className="text-xs text-slate-500">Matricule : {p.studentMatricule} · Classe : {p.studentClasse}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-800 font-mono block">
                      {p.montant.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Réf: {p.reference}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Numéro expéditeur :</span>
                    <span className="font-bold">{p.telephonePayeur || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Payeur déclaré :</span>
                    <span className="font-bold">{p.nomPayeur}</span>
                  </div>
                  {p.codeOtp && (
                    <div className="flex justify-between text-indigo-900 font-bold bg-indigo-50 px-2 py-1 rounded">
                      <span className="font-sans">Code OTP saisi :</span>
                      <span>{p.codeOtp}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenRejectModal(p)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                  >
                    Rejeter (Fonds non reçus)
                  </button>
                  <button
                    onClick={() => handleValidateMobilePayment(p)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmer la réception & Émettre le reçu</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, élève, matricule ou payeur..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Mode filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Mode :</span>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'ALL' | PaymentMethod)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="ALL">Tous les modes</option>
            <option value="ORANGE_MONEY">Orange Money Burkina</option>
            <option value="MOOV_MONEY">Moov Africa Burkina</option>
            <option value="MTN_MONEY">MTN Mobile Money</option>
            <option value="ESPECES_GUICHET">Espèces au Guichet</option>
          </select>
        </div>

        {/* Total of filtered */}
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-right">
          <span className="text-[10px] text-emerald-800 block">Total filtré</span>
          <span className="font-mono font-bold text-emerald-900 text-xs">
            {totalFiltered.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Aucun versement ne correspond à ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Élève & Classe</th>
                  <th className="py-3 px-4">Mode de Paiement</th>
                  <th className="py-3 px-4">Déposant / Agent</th>
                  <th className="py-3 px-4 text-right">Montant Versé</th>
                  <th className="py-3 px-4 text-right">Quittance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const dateStr = new Date(p.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {p.reference}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.studentNom}</span>
                        <span className="text-[11px] text-slate-500">
                          {p.studentMatricule} · {p.studentClasse}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {p.mode === 'ESPECES_GUICHET' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                              <Banknote className="w-3 h-3 text-emerald-600" /> Espèces Guichet
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                              <Smartphone className="w-3 h-3 text-orange-500" />
                              {PaymentService.getPaymentMethodLabel(p.mode)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 block">{p.nomPayeur}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {p.encaissePar === 'SECRETAIRE_GUICHET'
                            ? `Guichet (${p.agentNom || 'Secrétariat'})`
                            : 'Paiement en ligne (Parent)'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                        {p.montant.toLocaleString('fr-FR')} F
                        {p.statut === 'EN_ATTENTE_VERIFICATION' && (
                          <span className="block text-[10px] font-sans text-amber-700 font-semibold mt-0.5">
                            Non encaissé
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {p.statut === 'SUCCES' ? (
                          <button
                            onClick={() => onOpenReceipt(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer border border-emerald-200"
                            title="Imprimer ou consulter la quittance officielle certifiée"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reçu</span>
                          </button>
                        ) : p.statut === 'EN_ATTENTE_VERIFICATION' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleValidateMobilePayment(p)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 cursor-pointer"
                              title="Valider la réception des fonds et émettre le reçu officiel"
                            >
                              <Check className="w-3 h-3" />
                              <span>Valider reçu</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(p)}
                              className="px-1.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-semibold cursor-pointer"
                              title="Rejeter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Rejeté
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Refuser la transaction Mobile Money</h3>
                  <p className="text-xs text-slate-500">Réf : {rejectingPayment.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500">Élève :</span> <strong>{rejectingPayment.studentNom}</strong> ({rejectingPayment.studentClasse})</p>
              <p><span className="text-slate-500">Montant :</span> <strong className="text-rose-700 font-mono">{rejectingPayment.montant.toLocaleString('fr-FR')} FCFA</strong></p>
              <p><span className="text-slate-500">Code OTP déclaré :</span> <strong className="font-mono">{rejectingPayment.codeOtp || 'Non renseigné'}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motif du rejet (visible par le parent) :
              </label>
              <textarea
                value={rejectMotif}
                onChange={(e) => setRejectMotif(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: Aucun SMS de transfert reçu sur le terminal de l'école..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
