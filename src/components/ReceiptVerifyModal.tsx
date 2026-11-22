import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  X,
  CheckCircle2,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { ReceiptVerificationResult } from '../types';
import { SupabaseSyncService } from '../services/supabaseClient';
import { PaymentService } from '../services/paymentService';

interface ReceiptVerifyModalProps {
  isOpen: boolean;
  initialRef?: string;
  initialSig?: string;
  onClose: () => void;
}

export const ReceiptVerifyModal: React.FC<ReceiptVerifyModalProps> = ({
  isOpen,
  initialRef = '',
  initialSig = '',
  onClose,
}) => {
  const [refInput, setRefInput] = useState(initialRef);
  const [sigInput, setSigInput] = useState(initialSig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);

  const runVerification = async (targetRef: string, targetSig?: string) => {
    if (!targetRef.trim()) {
      setError('Veuillez saisir la référence de quittance (ex: REC-2027-...).');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    const res = await SupabaseSyncService.verifyReceiptQr(targetRef.trim(), targetSig?.trim());
    setIsLoading(false);
    if (res.ok && res.result) {
      setResult(res.result);
    } else {
      setError(res.error || 'Impossible de vérifier cette quittance.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setRefInput(initialRef || '');
    setSigInput(initialSig || '');
    setError('');
    setResult(null);
    if (initialRef?.trim()) {
      void runVerification(initialRef, initialSig);
    }
  }, [isOpen, initialRef, initialSig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runVerification(refInput, sigInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Vérification d'Authenticité d'un Reçu</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de quittance (Référence) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refInput}
                  onChange={(e) => {
                    setRefInput(e.target.value);
                    if (e.target.value !== initialRef) setSigInput('');
                  }}
                  placeholder="Ex: REC-2027-482190"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Vérifier</span>
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {!result.found || !result.receipt ? (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-2">
                  <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
                  <h4 className="font-extrabold text-sm text-rose-950 uppercase">
                    QUITTANCE INTROUVABLE / NON VALIDE
                  </h4>
                  <p className="text-xs text-rose-800">
                    Aucune transaction correspondant à cette référence n'existe dans les registres de l'établissement.
                  </p>
                </div>
              ) : result.authentic && (sigInput ? result.signatureValid : true) ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Vérifié en ligne
                      </span>
                      <h4 className="font-extrabold text-sm text-emerald-950 mt-0.5">
                        QUITTANCE AUTHENTIQUE ET CERTIFIÉE
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-emerald-200 p-3.5 text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Référence :</span>
                      <span className="font-mono font-bold text-slate-900">{result.receipt.reference}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Élève :</span>
                      <span className="font-bold text-slate-900">
                        {result.receipt.studentNom} ({result.receipt.studentClasse})
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Matricule :</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {result.receipt.studentMatricule}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Montant total certifié :</span>
                      <span className="font-mono font-extrabold text-emerald-800 text-sm">
                        {result.receipt.montant.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Mode :</span>
                      <span className="font-semibold text-slate-800">
                        {PaymentService.getPaymentMethodLabel(result.receipt.mode)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Date d'enregistrement :</span>
                      <span className="font-mono text-slate-700">
                        {new Date(result.receipt.date).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Agent validateur :</span>
                      <span className="font-semibold text-slate-800">{result.receipt.agentNom}</span>
                    </div>
                    {sigInput && (
                      <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                        <span className="text-slate-500">Signature numérique QR :</span>
                        <span className="font-bold text-emerald-700">Valide</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : sigInput && !result.signatureValid ? (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-2">
                  <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
                  <h4 className="font-extrabold text-sm text-rose-950 uppercase">
                    SIGNATURE QR NON VALIDE / DOCUMENT ALTÉRÉ
                  </h4>
                  <p className="text-xs text-rose-800">
                    La signature cryptographique fournie ne correspond pas à ce reçu officiel.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-950">
                        {result.receipt.statut === 'EN_ATTENTE_VERIFICATION'
                          ? 'EN ATTENTE DE VALIDATION SECRÉTARIAT'
                          : 'PAIEMENT REJETÉ / NON ENCAISSÉ'}
                      </h4>
                      <p className="text-xs text-amber-800">
                        Élève : {result.receipt.studentNom} · {result.receipt.montant.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
