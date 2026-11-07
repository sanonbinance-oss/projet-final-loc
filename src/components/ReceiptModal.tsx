import React from 'react';
import { Printer, CheckCircle, Download, X, ShieldCheck } from 'lucide-react';
import { Payment } from '../types';
import { DEFAULT_SCHOOL_INFO } from '../services/store';
import { PaymentService } from '../services/paymentService';

interface ReceiptModalProps {
  payment: Payment | null;
  onClose: () => void;
  studentScolariteTotale?: number;
  studentMontantTotalPaye?: number;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  onClose,
  studentScolariteTotale = 180000,
  studentMontantTotalPaye,
}) => {
  if (!payment) return null;

  const school = DEFAULT_SCHOOL_INFO;
  const dateFormatted = new Date(payment.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cumulPaye = studentMontantTotalPaye !== undefined 
    ? studentMontantTotalPaye 
    : payment.montant;
  const resteAPayer = Math.max(0, studentScolariteTotale - cumulPaye);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Reçu Officiel d'Encaissement</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le reçu</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="printable-receipt p-8 bg-white font-sans text-slate-900">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 block mb-0.5">
                  Burkina Faso · Ministère de l'Éducation Nationale
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {school.nom}
                </h1>
                <p className="text-xs italic text-slate-600 mt-0.5">« {school.devise} »</p>
                <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                  <p>{school.adresse} · {school.ville}</p>
                  <p>Tél: {school.telephone} · Email: {school.email}</p>
                  <p className="font-mono text-[11px] text-slate-600">{school.agrementMinisteriel}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-block border-2 border-slate-900 rounded-lg p-2.5 bg-slate-50 text-center min-w-[140px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                    Année Scolaire
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {school.anneeScolaire}
                  </span>
                </div>
                <div className="mt-2 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Quittance Certifiée
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Ref */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Titre du document
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                REÇU DE RÈGLEMENT DE SCOLARITÉ
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                N° de Transaction
              </span>
              <span className="font-mono text-base font-bold text-emerald-700">
                {payment.reference}
              </span>
            </div>
          </div>

          {/* Student & Payer Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                Informations de l'Élève
              </span>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Nom & Prénom:</span>
                <span className="font-bold text-slate-900">{payment.studentNom}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Matricule:</span>
                <span className="font-mono font-semibold text-slate-800">{payment.studentMatricule}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Classe fréquentée:</span>
                <span className="font-bold text-emerald-800">{payment.studentClasse}</span>
              </div>
            </div>

            <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                Détails du Paiement
              </span>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Payeur / Déposant:</span>
                <span className="font-bold text-slate-900">{payment.nomPayeur}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Mode de règlement:</span>
                <span className="font-semibold text-slate-800">{PaymentService.getPaymentMethodLabel(payment.mode)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Date & Heure:</span>
                <span className="font-mono text-xs text-slate-700">{dateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Désignation</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">Scolarité Annuelle Exigible</span>
                    <span className="text-xs text-slate-500">Frais d'études, inscription et activités pédagogiques</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                    {studentScolariteTotale.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
                <tr className="bg-emerald-50/70">
                  <td className="py-3 px-4">
                    <span className="font-bold text-emerald-950 block">Montant Versé sur la Scolarité</span>
                    <span className="text-xs text-emerald-700">
                      {payment.encaissePar === 'SECRETAIRE_GUICHET' 
                        ? `Encaissé au guichet par ${payment.agentNom || 'le secrétariat'}` 
                        : 'Télé-paiement Mobile Money validé'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-base text-emerald-800">
                    {(payment.montantScolarite || payment.montant).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
                {(payment.montantDon || 0) > 0 && (
                  <tr className="bg-purple-50/70">
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-purple-950 block">Don & Contribution aux Œuvres Scolaires</span>
                      <span className="text-xs text-purple-700">Aide soutien cantine, bibliothèque et activités scolaires</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-900">
                      +{payment.montantDon.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-300 font-bold bg-slate-100/70">
                  <td className="py-2.5 px-4 text-slate-900">
                    Total Global Encaissé ce jour
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-base text-slate-900">
                    {payment.montant.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">
                    Total cumulé de la scolarité réglé à ce jour
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800">
                    {cumulPaye.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-3 px-4 text-slate-900">
                    Reste à payer sur la scolarité
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base">
                    {resteAPayer === 0 ? (
                      <span className="text-emerald-700 font-bold">0 FCFA (SCOLARITÉ SOLDÉE)</span>
                    ) : (
                      <span className="text-amber-700 font-bold">{resteAPayer.toLocaleString('fr-FR')} FCFA</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stamps & Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
            <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/50">
              <span className="font-bold text-slate-600 block mb-1">Visa du Parent / Déposant</span>
              <p className="text-[11px] text-slate-400 italic">Signature précédée de la mention « Lu et approuvé »</p>
              <div className="h-14 mt-2"></div>
            </div>

            <div className="border border-dashed border-emerald-300 rounded-xl p-3 text-center bg-emerald-50/30 relative">
              <span className="font-bold text-emerald-900 block mb-1">Pour la Direction & Comptabilité</span>
              <div className="inline-block border-2 border-emerald-600 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded my-1 rotate-[-3deg]">
                ★ PAYÉ - ENCAISSEMENT CERTIFIÉ ★
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                {payment.agentNom ? `Agent: ${payment.agentNom}` : 'Pôle Facturation & Trésorerie'}
              </p>
              <div className="h-8"></div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
            Ce reçu électronique constitue une quittance libératoire dans la limite de la somme versée. Conservez précieusement ce document pour tout justificatif scolaire.
          </div>
        </div>

        {/* Action footer (Hidden on print) */}
        <div className="no-print flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Imprimez ce reçu en main propre pour le parent ou conservez-le en archive.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
