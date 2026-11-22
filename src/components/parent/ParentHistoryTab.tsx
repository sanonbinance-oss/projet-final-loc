import React from 'react';
import {
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Link2,
  ArrowRight,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { AdmissionRequest, Payment, Student } from '../../types';
import { PaymentService } from '../../services/paymentService';

interface ParentHistoryTabProps {
  students: Student[];
  admissions: AdmissionRequest[];
  payments: Payment[];
  onOpenReceipt: (payment: Payment) => void;
  onOpenLinkChild: () => void;
  onSelectStudentToPay: (student: Student) => void;
  onGoToAdmission: () => void;
  onOpenVerifyReceipt: () => void;
}

export const ParentHistoryTab: React.FC<ParentHistoryTabProps> = ({
  students,
  admissions,
  payments,
  onOpenReceipt,
  onOpenLinkChild,
  onSelectStudentToPay,
  onGoToAdmission,
  onOpenVerifyReceipt,
}) => {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Fratrie / Mes Enfants */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Mes Enfants & Situation de Scolarité ({students.length})
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenVerifyReceipt}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Vérifier un reçu (QR)</span>
            </button>
            <button
              type="button"
              onClick={onOpenLinkChild}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Rattacher un élève existant</span>
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-600">
              Aucun élève rattaché à votre compte pour le moment.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onGoToAdmission}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
              >
                Faire une demande d'admission
              </button>
              <button
                type="button"
                onClick={onOpenLinkChild}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Rattacher avec un matricule
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {students.map((s) => {
              const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
              const pct =
                s.scolariteTotale > 0
                  ? Math.min(100, Math.round((s.montantPaye / s.scolariteTotale) * 100))
                  : 0;
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {s.prenom} {s.nom}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {s.classe} · <span className="font-mono">{s.matricule}</span>
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        reste === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {reste === 0 ? 'Soldé' : `${reste.toLocaleString('fr-FR')} F dus`}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">
                        Payé : <strong>{s.montantPaye.toLocaleString('fr-FR')} F</strong> /{' '}
                        {s.scolariteTotale.toLocaleString('fr-FR')} F
                      </span>
                      <span className="font-mono font-bold text-slate-800">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {reste > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectStudentToPay(s)}
                      className="w-full py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Payer la scolarité</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suivi des demandes d'admission */}
      {admissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <FileCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              Suivi de mes Demandes d'Admission ({admissions.length})
            </h3>
          </div>

          <div className="space-y-3">
            {admissions.map((adm) => {
              const matchedStudent = students.find(
                (s) =>
                  (adm.matriculeAttribue && s.matricule === adm.matriculeAttribue) ||
                  `${s.prenom} ${s.nom}`.toLowerCase() ===
                    `${adm.prenomEnfant} ${adm.nomEnfant}`.toLowerCase()
              );

              return (
                <div
                  key={adm.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {adm.prenomEnfant} {adm.nomEnfant}
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {adm.classeDemandee}
                      </span>
                      {adm.statut === 'en_attente' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> En attente
                        </span>
                      )}
                      {adm.statut === 'accepte' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Acceptée
                        </span>
                      )}
                      {adm.statut === 'refuse' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> Refusée
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Dossier {adm.id}
                      {adm.matriculeAttribue ? ` · Matricule : ${adm.matriculeAttribue}` : ''}
                    </p>
                    {adm.statut === 'refuse' && adm.motifRefus && (
                      <p className="text-xs text-rose-700 italic">« {adm.motifRefus} »</p>
                    )}
                  </div>

                  {adm.statut === 'accepte' && matchedStudent && (
                    <button
                      type="button"
                      onClick={() => onSelectStudentToPay(matchedStudent)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>Payer maintenant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historique & Réimpression des Reçus */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <Receipt className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-slate-900">
            Mes Paiements & Reçus Officiels ({sortedPayments.length})
          </h3>
        </div>

        {sortedPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Aucun paiement enregistré dans votre espace pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedPayments.map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900">{p.reference}</span>
                    {p.statut === 'SUCCES' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Validé
                      </span>
                    )}
                    {p.statut === 'EN_ATTENTE_VERIFICATION' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        En attente de validation
                      </span>
                    )}
                    {p.statut === 'ECHOUE' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        Non validé
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    {p.studentNom} ({p.studentClasse}) ·{' '}
                    <span className="text-slate-500 font-normal">
                      {PaymentService.getPaymentMethodLabel(p.mode)}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {new Date(p.date).toLocaleString('fr-FR')}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="font-mono font-extrabold text-sm text-emerald-800">
                    {p.montant.toLocaleString('fr-FR')} FCFA
                  </span>

                  {p.statut === 'SUCCES' && (
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(p)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer Reçu</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
