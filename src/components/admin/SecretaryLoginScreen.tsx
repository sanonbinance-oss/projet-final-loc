import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowLeft, CheckCircle2, Building, Sparkles } from 'lucide-react';
import { DEFAULT_SCHOOL_INFO, CURRENT_SCHOOL_YEAR } from '../../services/store';

interface SecretaryLoginScreenProps {
  onSuccess: () => void;
  onReturnToPublic: () => void;
}

export const SecretaryLoginScreen: React.FC<SecretaryLoginScreenProps> = ({
  onSuccess,
  onReturnToPublic,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const school = DEFAULT_SCHOOL_INFO;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === 'admin' || pin === 'secretaire') {
      setError('');
      onSuccess();
    } else {
      setError('Code PIN incorrect. Le code d\'accès par défaut est : 1234');
    }
  };

  const handleQuickDemo = () => {
    setPin('1234');
    setError('');
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-between p-4 sm:p-6 text-white font-sans">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onReturnToPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Accès Public / Parents</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Poste Secrétariat {CURRENT_SCHOOL_YEAR}</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20 text-slate-900">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-800 text-white flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-emerald-500/20">
            <Building className="w-8 h-8 text-emerald-300" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
            Espace Secrétariat & Intendance Privé
          </span>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Connexion Secrétariat
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {school.nom}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Accès réservé au personnel :</strong> Validation des dossiers d'admission, encaissement au guichet, modification des tarifs et import des élèves.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Code PIN Secrétariat (Défaut : 1234)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Entrez votre code (1234)"
                autoFocus
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-mono tracking-widest text-slate-900 bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="submit"
              className="w-full py-3.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-lg shadow-emerald-700/25 text-center flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Ouvrir l'Espace Secrétaire</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2.5 px-4 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer text-center"
            >
              Connexion Rapide (Code PIN : 1234)
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-400 pb-2">
        <span>Session administrative sécurisée · {school.ville}, {school.pays}</span>
      </div>
    </div>
  );
};
