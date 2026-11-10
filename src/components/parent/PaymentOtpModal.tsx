import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Clock, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  KeyRound,
  Lock,
  ArrowRight
} from 'lucide-react';
import { PaymentMethod, Student } from '../../types';

interface PaymentOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  montantScolarite: number;
  montantDon: number;
  totalMontant: number;
  operateur: PaymentMethod;
  telephone: string;
  nomPayeur: string;
  onConfirmSuccess: (otpCode: string) => Promise<void>;
}

export const PaymentOtpModal: React.FC<PaymentOtpModalProps> = ({
  isOpen,
  onClose,
  student,
  montantScolarite,
  montantDon,
  totalMontant,
  operateur,
  telephone,
  nomPayeur,
  onConfirmSuccess,
}) => {
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedReceivedCode, setSimulatedReceivedCode] = useState<string>('123456');
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      // Generate a dynamic demo code like '584912' or '123456'
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedReceivedCode(generated);
      setOtpValues(['', '', '', '', '', '']);
      setTimeLeft(90);
      setErrorMessage(null);
      setIsVerifying(false);

      // Simulate push notification appearance after 1.2s
      const timer = setTimeout(() => {
        setNotificationBanner(
          `SMS ${getOperatorName(operateur)} : Votre code de sécurité de paiement pour ${totalMontant.toLocaleString('fr-FR')} FCFA est ${generated}`
        );
      }, 1200);

      // Focus first input
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setNotificationBanner(null);
    }
  }, [isOpen, totalMontant, operateur]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const handleInputChange = (index: number, value: string) => {
    // Only accept numeric input
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return;

    const newValues = [...otpValues];

    if (clean.length > 1) {
      // Pasted multiple digits
      const digits = clean.slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (i < 6) newValues[i] = d;
      });
      setOtpValues(newValues);
      const nextIndex = Math.min(digits.length, 5);
      inputsRef.current[nextIndex]?.focus();
    } else {
      newValues[index] = clean;
      setOtpValues(newValues);
      if (clean && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
    setErrorMessage(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedReceivedCode(newCode);
    setTimeLeft(90);
    setOtpValues(['', '', '', '', '', '']);
    setErrorMessage(null);
    setNotificationBanner(
      `Nouveau SMS ${getOperatorName(operateur)} : Votre nouveau code de confirmation est ${newCode}`
    );
    inputsRef.current[0]?.focus();
  };

  const handleQuickPasteDemo = () => {
    const digits = simulatedReceivedCode.split('');
    setOtpValues(digits);
    setErrorMessage(null);
    inputsRef.current[5]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredCode = otpValues.join('');

    if (enteredCode.length < 6) {
      setErrorMessage('Veuillez saisir le code complet à 6 chiffres.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Délai expiré. Veuillez cliquer sur "Renvoyer le code".');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    // Simulate real gateway verification latency
    await new Promise((r) => setTimeout(r, 900));

    // Accepts the simulated code or common demo bypass codes ('123456', '000000')
    const isValid = 
      enteredCode === simulatedReceivedCode || 
      enteredCode === '123456' || 
      enteredCode === '000000';

    if (isValid) {
      try {
        await onConfirmSuccess(enteredCode);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Échec de la validation.';
        setErrorMessage(msg);
        setIsVerifying(false);
      }
    } else {
      setIsVerifying(false);
      setErrorMessage('Paiement non validé : code OTP incorrect ou délai expiré, veuillez réessayer.');
    }
  };

  function getOperatorName(op: PaymentMethod): string {
    switch (op) {
      case 'ORANGE_MONEY':
        return 'Orange Money Burkina';
      case 'MOOV_MONEY':
        return 'Moov Africa Burkina';
      case 'MTN_MONEY':
        return 'MTN Mobile Money';
      case 'LIGDICASH':
        return 'LigdiCash / Cartes';
      default:
        return 'Mobile Money';
    }
  }

  function getOperatorColor(op: PaymentMethod): { bg: string; text: string; badge: string } {
    switch (op) {
      case 'ORANGE_MONEY':
        return { bg: 'bg-[#FF7900]', text: 'text-[#FF7900]', badge: 'bg-orange-50 text-orange-950 border-orange-200' };
      case 'MOOV_MONEY':
        return { bg: 'bg-[#0070BA]', text: 'text-[#0070BA]', badge: 'bg-blue-50 text-blue-950 border-blue-200' };
      case 'MTN_MONEY':
        return { bg: 'bg-[#FFCC00]', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-950 border-amber-200' };
      default:
        return { bg: 'bg-emerald-600', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-950 border-emerald-200' };
    }
  }

  const opColors = getOperatorColor(operateur);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {/* Simulated Push Notification Banner */}
        {notificationBanner && (
          <div className="bg-slate-900 text-white px-4 py-2.5 text-xs flex items-center justify-between gap-2 border-b border-slate-800 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 truncate">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-slate-200">{notificationBanner}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickPasteDemo}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shrink-0 cursor-pointer"
            >
              Remplir
            </button>
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${opColors.bg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Confirmation Sécurisée OTP
              </h3>
              <p className="text-[11px] text-slate-500">
                {getOperatorName(operateur)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Transaction Summary Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Élève concerné :</span>
              <span className="font-bold text-slate-900">{student.prenom} {student.nom} ({student.classe})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Numéro à débiter :</span>
              <span className="font-mono font-bold text-slate-900">+226 {telephone}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-2">
              <span className="text-slate-700 font-medium">Montant total :</span>
              <span className="text-base font-mono font-black text-emerald-700">
                {totalMontant.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-slate-800">
              Veuillez valider la transaction sur votre téléphone
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Entrez le code de confirmation (OTP ou référence reçu par SMS) ci-dessous pour autoriser le prélèvement.
            </p>
          </div>

          {/* 6 Digits OTP Input Box */}
          <div className="flex justify-center gap-2 sm:gap-2.5 my-2">
            {otpValues.map((val, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying}
                className={`w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border transition-all outline-none ${
                  val
                    ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            ))}
          </div>

          {/* Countdown & Resend Option */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isVerifying || timeLeft > 60}
              className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                timeLeft <= 60 ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>Renvoyer le code SMS</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Fast Demo Helper */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Code test simulateur : <strong className="font-mono text-amber-950 font-bold">{simulatedReceivedCode}</strong></span>
            </div>
            <button
              type="button"
              onClick={handleQuickPasteDemo}
              className="text-amber-800 hover:text-amber-950 underline font-semibold text-[10px] cursor-pointer"
            >
              Insérer ce code
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={isVerifying || otpValues.join('').length < 6}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isVerifying || otpValues.join('').length < 6
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-600 active:scale-98'
            }`}
          >
            {isVerifying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Vérification en cours...</span>
              </>
            ) : (
              <>
                <span>Valider le Paiement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
