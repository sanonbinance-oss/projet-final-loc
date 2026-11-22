import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Phone,
  Lock,
  Mail,
  User,
  AlertCircle,
  ShieldCheck,
  Link2,
  X,
  RefreshCw,
} from 'lucide-react';
import { ParentAccount } from '../../types';
import { SupabaseSyncService } from '../../services/supabaseClient';

interface ParentAuthCardProps {
  onAuthenticated: (parent: ParentAccount) => void;
  title?: string;
  subtitle?: string;
}

export const ParentAuthCard: React.FC<ParentAuthCardProps> = ({
  onAuthenticated,
  title = 'Mon Espace Personnel Famille',
  subtitle = 'Connectez-vous ou créez votre compte privé pour accéder uniquement à vos enfants, demandes d’admission, messages et reçus officiels.',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [nomComplet, setNomComplet] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetInfo, setResetInfo] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (mode === 'reset') {
      if (!telephone.trim()) {
        setError('Veuillez saisir votre numéro de téléphone.');
        return;
      }
      setIsLoading(true);
      try {
        if (resetStep === 'request') {
          const res = await SupabaseSyncService.requestParentPasswordReset(telephone.trim());
          if (res.ok) {
            setResetInfo(
              res.message ||
                "Demandez votre code temporaire à 6 chiffres auprès du Secrétariat puis saisissez-le ci-dessous."
            );
            setResetStep('confirm');
          } else {
            setError(res.error || 'Demande impossible.');
          }
        } else {
          if (!/^\d{6}$/.test(resetCode.trim()) || newPassword.length < 4) {
            setError('Saisissez le code à 6 chiffres et un nouveau mot de passe (4+ caractères).');
            return;
          }
          const res = await SupabaseSyncService.confirmParentPasswordReset({
            telephone: telephone.trim(),
            code: resetCode.trim(),
            newPassword,
          });
          if (res.ok && res.parent) {
            onAuthenticated(res.parent);
          } else {
            setError(res.error || 'Code invalide ou expiré.');
          }
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!telephone.trim() || !password) {
      setError('Veuillez saisir votre numéro de téléphone et votre mot de passe.');
      return;
    }

    if (mode === 'register' && (!nomComplet.trim() || password.length < 4)) {
      setError('Veuillez indiquer votre nom complet et un mot de passe d’au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const res = await SupabaseSyncService.loginParentAccount({
          telephone: telephone.trim(),
          password,
        });
        if (res.ok && res.parent) {
          onAuthenticated(res.parent);
        } else {
          setError(res.error || 'Numéro ou mot de passe incorrect.');
        }
      } else {
        const res = await SupabaseSyncService.registerParentAccount({
          nomComplet: nomComplet.trim(),
          telephone: telephone.trim(),
          email: email.trim() || undefined,
          password,
        });
        if (res.ok && res.parent) {
          onAuthenticated(res.parent);
        } else {
          setError(res.error || 'Création de compte impossible.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
            <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="p-2 bg-slate-100 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setResetInfo('');
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'login' || mode === 'reset'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-700" />
          <span>Se connecter</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError('');
            setResetInfo('');
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'register'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4 text-emerald-700" />
          <span>Créer mon Espace Parent</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {mode === 'reset' ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">
                Récupération de mot de passe
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetStep('request');
                  setResetInfo('');
                  setError('');
                }}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Retour connexion
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Votre numéro de téléphone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: 70 12 34 56"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {resetInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                {resetInfo}
              </div>
            )}

            {resetStep === 'confirm' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code temporaire à 6 chiffres *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ex: 482910"
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold tracking-widest rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nouveau mot de passe (4+ caractères) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Choisissez votre nouveau mot de passe"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <span>
                  {resetStep === 'request'
                    ? 'Continuer la réinitialisation'
                    : 'Valider le nouveau mot de passe'}
                </span>
              )}
            </button>

            {resetStep === 'request' && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setResetStep('confirm');
                }}
                className="w-full text-center text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
              >
                J'ai déjà reçu un code temporaire du secrétariat
              </button>
            )}
          </>
        ) : (
          <>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom & Prénom du Parent / Tuteur *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    placeholder="Ex: Moussa Ouédraogo"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de Téléphone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: 70 12 34 56"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse Email (facultatif, pour récupération par mail)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@exemple.bf"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mot de passe personnel *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setResetStep('request');
                      setResetInfo('');
                      setError('');
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimum 4 caractères' : 'Votre mot de passe'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Connexion...' : 'Création en cours...'}</span>
                </>
              ) : (
                <span>
                  {mode === 'login' ? 'Accéder à mon Espace Parent' : 'Créer mon Espace Privé'}
                </span>
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

interface LinkChildModalProps {
  isOpen: boolean;
  defaultPhone?: string;
  onClose: () => void;
  onLinked: () => void;
}

export const LinkChildModal: React.FC<LinkChildModalProps> = ({
  isOpen,
  defaultPhone = '',
  onClose,
  onLinked,
}) => {
  const [matricule, setMatricule] = useState('');
  const [telephone, setTelephone] = useState(defaultPhone);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccessMsg('');

    if (!matricule.trim() || !telephone.trim()) {
      setError('Veuillez indiquer le matricule de l’élève et le téléphone enregistré à l’école.');
      return;
    }

    setIsLoading(true);
    const res = await SupabaseSyncService.linkChildToParentAccount(
      matricule.trim(),
      telephone.trim()
    );
    setIsLoading(false);

    if (res.ok) {
      setSuccessMsg(`Élève ${res.studentName || res.matricule} rattaché à votre espace.`);
      onLinked();
      setTimeout(() => {
        setMatricule('');
        setSuccessMsg('');
        onClose();
      }, 900);
    } else {
      setError(res.error || 'Impossible de rattacher cet élève.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Rattacher un Élève déjà inscrit</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Saisissez le matricule attribué par l'école et le numéro de téléphone du parent figurant sur la fiche de l'élève.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Matricule de l'élève *
            </label>
            <input
              type="text"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value.toUpperCase())}
              placeholder="Ex: EDU-27-0001"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Téléphone parent enregistré à l'école *
            </label>
            <input
              type="tel"
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: 70 12 34 56"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer"
            >
              {isLoading ? 'Vérification...' : 'Rattacher cet élève'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
