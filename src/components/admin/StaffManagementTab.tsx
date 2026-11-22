import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Power,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  DatabaseZap,
  Phone,
} from 'lucide-react';
import { ParentAccountSummary, StaffRole, StaffSession, StaffUser } from '../../types';
import { SupabaseSyncService } from '../../services/supabaseClient';
import { SchoolStore } from '../../services/store';
import { SyncService } from '../../services/sync';

interface StaffManagementTabProps {
  staffSession: StaffSession | null;
  onDataReset?: () => void;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  DIRECTEUR: 'Directeur',
  SECRETAIRE: 'Secrétaire',
  CAISSIER: 'Caissier / Intendant',
};

export const StaffManagementTab: React.FC<StaffManagementTabProps> = ({ staffSession, onDataReset }) => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [parentsList, setParentsList] = useState<ParentAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // New staff form (DIRECTEUR only)
  const [nomComplet, setNomComplet] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState<StaffRole>('SECRETAIRE');
  const [pin, setPin] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Own PIN update
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Parent temporary password recovery code
  const [selectedParentId, setSelectedParentId] = useState('');
  const [resetPhoneInput, setResetPhoneInput] = useState('');
  const [resetGenerating, setResetGenerating] = useState(false);
  const [generatedReset, setGeneratedReset] = useState<{
    code: string;
    parentName: string;
    telephone: string;
    expiresInMinutes: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Director-only reset to real data
  const [includeParentsOnReset, setIncludeParentsOnReset] = useState(false);
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  const isDirector = staffSession?.staffRole === 'DIRECTEUR';

  const loadAll = async () => {
    setLoading(true);
    setError('');
    const [staffRes, parentsRes] = await Promise.all([
      SupabaseSyncService.listStaffAccounts(),
      SupabaseSyncService.listParentAccountsForStaff(),
    ]);
    setLoading(false);
    if (staffRes.ok && staffRes.staff) {
      setStaffList(staffRes.staff);
    } else {
      setError(staffRes.error || 'Impossible de charger la liste des agents.');
    }
    if (parentsRes.ok && parentsRes.parents) {
      setParentsList(parentsRes.parents);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector || isCreating) return;
    setError('');
    setFeedback('');
    setIsCreating(true);
    const res = await SupabaseSyncService.createStaffAccount({
      nomComplet: nomComplet.trim(),
      email: email.trim(),
      telephone: telephone.trim() || undefined,
      role,
      pin: pin.trim(),
    });
    setIsCreating(false);
    if (res.ok) {
      setFeedback(`Compte agent créé pour ${nomComplet.trim()}.`);
      setNomComplet('');
      setEmail('');
      setTelephone('');
      setPin('');
      void loadAll();
    } else {
      setError(res.error || 'Création impossible.');
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    if (!isDirector) return;
    setError('');
    setFeedback('');
    const res = await SupabaseSyncService.toggleStaffAccount(user.id, !user.estActif);
    if (res.ok) {
      setFeedback(`Statut de ${user.nomComplet} mis à jour.`);
      void loadAll();
    } else {
      setError(res.error || 'Action refusée.');
    }
  };

  const handleChangeOwnPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinLoading) return;
    setError('');
    setFeedback('');
    setPinLoading(true);
    const res = await SupabaseSyncService.updateOwnStaffPin(currentPin.trim(), newPin.trim());
    setPinLoading(false);
    if (res.ok) {
      setFeedback('Votre code PIN personnel a bien été mis à jour.');
      setCurrentPin('');
      setNewPin('');
    } else {
      setError(res.error || 'Modification impossible.');
    }
  };

  const handleGenerateParentResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetGenerating) return;
    const phoneTrimmed = resetPhoneInput.trim();
    if (!selectedParentId && !phoneTrimmed) {
      setError('Sélectionnez un parent dans la liste ou saisissez son numéro de téléphone.');
      return;
    }

    setError('');
    setFeedback('');
    setGeneratedReset(null);
    setResetGenerating(true);
    const res = await SupabaseSyncService.generateParentResetCodeForStaff({
      parentId: selectedParentId || undefined,
      telephone: phoneTrimmed || undefined,
    });
    setResetGenerating(false);

    if (res.ok && res.code) {
      setGeneratedReset({
        code: res.code,
        parentName: res.parentName || 'Parent',
        telephone: res.telephone || phoneTrimmed,
        expiresInMinutes: res.expiresInMinutes || 15,
      });
      setCopiedCode(false);
      setFeedback(`Code temporaire généré pour ${res.parentName || 'ce parent'}.`);
    } else {
      setError(res.error || 'Impossible de générer le code temporaire.');
    }
  };

  const handleCopyCode = async () => {
    if (!generatedReset?.code) return;
    try {
      await navigator.clipboard.writeText(generatedReset.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleExecuteResetDemoData = async () => {
    if (!isDirector || resettingDb) return;
    setError('');
    setFeedback('');
    setResettingDb(true);
    const res = await SupabaseSyncService.resetDemoData(includeParentsOnReset);
    if (res.ok) {
      SchoolStore.clearAllData();
      await SyncService.synchroniserMaintenant();
      onDataReset?.();
      await loadAll();
      setConfirmResetStep(false);
      setIncludeParentsOnReset(false);
      setFeedback(
        'Base nettoyée avec succès ! Toutes les données de démonstration ont été effacées. Les tarifs officiels, votre équipe et les consignes IA ont été conservés.'
      );
    } else {
      setError(res.error || 'Échec du nettoyage de la base de données.');
    }
    setResettingDb(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Équipe, Assistance Parents & Réinitialisation</h2>
            <p className="text-xs text-slate-500">
              Session active : <strong>{staffSession?.author || 'Agent'}</strong> (
              {staffSession?.staffRole ? ROLE_LABELS[staffSession.staffRole] : 'Secrétariat'})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Staff directory + New agent (if Director) + Demo reset */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Comptes du Personnel ({staffList.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Chargement des comptes...</div>
            ) : staffList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Aucun compte configuré.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staffList.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{u.nomComplet}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.estActif
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.estActif ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {u.email}
                        {u.telephone ? ` · ${u.telephone}` : ''}
                      </p>
                      {u.dateDerniereConnexion && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Dernière connexion : {new Date(u.dateDerniereConnexion).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>

                    {isDirector && (
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(u)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                          u.estActif
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{u.estActif ? 'Désactiver' : 'Réactiver'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isDirector && (
            <form
              onSubmit={handleCreateStaff}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Créer un Compte Agent</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    placeholder="Ex: Mme Kaboré Awa"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@excellence-avenir.bf"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="SECRETAIRE">Secrétaire</option>
                    <option value="CAISSIER">Caissier / Intendant</option>
                    <option value="DIRECTEUR">Directeur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code PIN personnel (4+ caractères) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Code PIN individuel"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone (facultatif)
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+226 70 ..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer"
              >
                {isCreating ? 'Création en cours...' : 'Créer le compte agent'}
              </button>
            </form>
          )}

          {/* Nettoyage & Données Réelles (DIRECTEUR uniquement) */}
          {isDirector && (
            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3 border-b border-rose-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                  <DatabaseZap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nettoyage &amp; Données Réelles (Préparation Démo / Production)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remet à zéro les dossiers de test (demandes d'admission, élèves, paiements, justificatifs et journaux) tout en conservant les tarifs officiels, les comptes du personnel et les consignes de l'Assistant IA.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={includeParentsOnReset}
                  onChange={(e) => setIncludeParentsOnReset(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  <strong>Supprimer aussi les comptes parents créés pendant les tests</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Recommandé avant une présentation officielle si vous souhaitez réinscrire des parents réels depuis zéro.
                  </span>
                </span>
              </label>

              {!confirmResetStep ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetStep(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Préparer la base réelle (effacer les tests)</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-3">
                  <p className="text-xs font-bold text-rose-900">
                    Confirmer la suppression définitive des demandes, élèves, paiements et fichiers de test ?
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={resettingDb}
                      onClick={() => void handleExecuteResetDemoData()}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white cursor-pointer"
                    >
                      {resettingDb ? 'Nettoyage en cours...' : 'Oui, réinitialiser maintenant'}
                    </button>
                    <button
                      type="button"
                      disabled={resettingDb}
                      onClick={() => setConfirmResetStep(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Parent OTP Assistance + Own PIN update */}
        <div className="lg:col-span-5 space-y-6">
          {/* Assistance Parents : Code temporaire mot de passe */}
          <form
            onSubmit={handleGenerateParentResetCode}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-3">
              <Phone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Assistance Parents · Code temporaire mot de passe
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Si un parent a oublié son mot de passe, générez un code à 6 chiffres valable 15 minutes à lui communiquer directement.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Choisir un compte parent ({parentsList.length})
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedParentId(id);
                  const found = parentsList.find((p) => p.id === id);
                  if (found) setResetPhoneInput(found.telephone);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">— Sélectionner dans la liste —</option>
                {parentsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomComplet} ({p.telephone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ou saisir le numéro de téléphone du parent
              </label>
              <input
                type="tel"
                value={resetPhoneInput}
                onChange={(e) => {
                  setResetPhoneInput(e.target.value);
                  if (selectedParentId) setSelectedParentId('');
                }}
                placeholder="Ex: +226 70 11 22 33"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={resetGenerating}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer"
            >
              {resetGenerating ? 'Génération...' : 'Générer un code temporaire (15 min)'}
            </button>

            {generatedReset && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                <div className="text-[11px] font-semibold text-emerald-900">
                  Code pour <strong>{generatedReset.parentName}</strong> ({generatedReset.telephone}) — expire dans {generatedReset.expiresInMinutes} min :
                </div>
                <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <span className="font-mono text-xl font-extrabold tracking-widest text-slate-900">
                    {generatedReset.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyCode()}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Own PIN update */}
          <form
            onSubmit={handleChangeOwnPin}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">Modifier mon Code PIN</h3>
            </div>

            {!staffSession?.email ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Vous êtes connecté via le code administrateur global. Connectez-vous avec un compte personnel pour modifier son code PIN individuel.
                </span>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code PIN actuel *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nouveau code PIN (4+ caractères) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pinLoading}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white cursor-pointer"
                >
                  {pinLoading ? 'Enregistrement...' : 'Mettre à jour mon PIN'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

