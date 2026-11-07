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
  CheckCircle2
} from 'lucide-react';
import { Payment, PaymentMethod } from '../../types';
import { PaymentService } from '../../services/paymentService';

interface TransactionsTabProps {
  payments: Payment[];
  onOpenReceipt: (payment: Payment) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  payments,
  onOpenReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMethod>('ALL');

  const filtered = payments.filter((p) => {
    if (modeFilter !== 'ALL' && p.mode !== modeFilter) return false;
    if (search.trim() === '') return true;
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      p.studentNom.toLowerCase().includes(q) ||
      p.studentMatricule.toLowerCase().includes(q) ||
      p.nomPayeur.toLowerCase().includes(q)
    );
  });

  const totalFiltered = filtered.reduce((acc, p) => acc + p.montant, 0);

  const handleExportCSV = () => {
    const headers = ['Reference', 'Date', 'Matricule', 'Nom Eleve', 'Classe', 'Montant FCFA', 'Mode', 'Payeur', 'Encaisse Par'];
    const rows = filtered.map((p) => [
      p.reference,
      new Date(p.date).toLocaleString('fr-FR'),
      p.studentMatricule,
      `"${p.studentNom}"`,
      p.studentClasse,
      p.montant,
      PaymentService.getPaymentMethodLabel(p.mode),
      `"${p.nomPayeur}"`,
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
            Traçabilité complète des versements en ligne (Orange, Moov, MTN) et au guichet en espèces.
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
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenReceipt(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reçu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
