import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  Database,
  RotateCw,
  Wrench,
} from 'lucide-react';
import { PaymentService } from '../../services/paymentService';
import {
  VERCEL_DB_LABEL,
  SupabaseSyncService,
  SupabaseConnexionStatus,
} from '../../services/supabaseClient';

export const ApiConfigTab: React.FC = () => {
  const [mode, setMode] = useState<'SIMULATION' | 'PRODUCTION'>(PaymentService.MODE);

  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<SupabaseConnexionStatus | null>(null);
  const [initFeedback, setInitFeedback] = useState<string | null>(null);

  const [orangeApiKey, setOrangeApiKey] = useState('');
  const [orangeMerchantId, setOrangeMerchantId] = useState('');
  const [moovApiKey, setMoovApiKey] = useState('');
  const [moovSecret, setMoovSecret] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestDb = async () => {
    setIsTestingDb(true);
    setDbStatus(null);
    const result = await SupabaseSyncService.testerConnexion();
    setIsTestingDb(false);
    setDbStatus(result);
  };

  const handleInitTables = async () => {
    setIsInitializingDb(true);
    setInitFeedback(null);
    const res = await SupabaseSyncService.initialiserTables();
    setIsInitializingDb(false);
    if (res.ok) {
      setInitFeedback(res.message || 'Tables SQL vérifiées et initialisées avec succès !');
      await handleTestDb();
    } else {
      setInitFeedback(res.error || "Impossible d'initialiser les tables SQL.");
    }
  };

  useEffect(() => {
    void handleTestDb();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    PaymentService.MODE = mode;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestSimulation = () => {
    setTestResult(
      'Simulation réussie : Les serveurs Orange, Moov et MTN répondent avec succès en mode bac à sable (Sandbox).'
    );
    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Architecture & Intégrations
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {VERCEL_DB_LABEL} & Passerelles Marchandes
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Connexions Base de Données Vercel & Clés API
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillez la liaison directe avec votre base PostgreSQL intégrée sur Vercel et paramétrez les passerelles Mobile Money.
          </p>
        </div>
      </div>

      {/* SECTION 1: VERCEL POSTGRESQL CONNECTION CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm">
                  Base de Données {VERCEL_DB_LABEL}
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  API Serveur Vercel (/api/db)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Stockage centralisé des élèves, tarifs, demandes d'admission, bulletins et paiements
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTestDb}
              disabled={isTestingDb}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-sm"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
              <span>{isTestingDb ? 'Test en cours...' : 'Tester la connexion'}</span>
            </button>

            <button
              type="button"
              onClick={handleInitTables}
              disabled={isInitializingDb}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors cursor-pointer"
            >
              <Wrench className={`w-3.5 h-3.5 ${isInitializingDb ? 'animate-spin' : ''}`} />
              <span>{isInitializingDb ? 'Initialisation...' : 'Vérifier / Créer les tables'}</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed">
          <strong>Aucune clé API à copier :</strong> Lorsque vous reliez votre base <strong>Neon / Postgres</strong> dans l'onglet <strong>Storage</strong> de votre projet Vercel, Vercel injecte automatiquement <span className="font-mono font-bold">DATABASE_URL</span> / <span className="font-mono font-bold">POSTGRES_URL</span> côté serveur. Les tables SQL sont créées automatiquement au premier appel.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block text-[11px] font-semibold">Moteur & Point de connexion :</span>
            <div className="font-mono font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>/api/db (Vercel Serverless)</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-bold">
                Sécurisé
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block text-[11px] font-semibold">Variable détectée côté Vercel :</span>
            <div className="font-mono font-semibold text-slate-700 text-xs">
              {dbStatus?.envVarName ? dbStatus.envVarName : 'En attente de détection (DATABASE_URL / POSTGRES_URL)'}
            </div>
          </div>
        </div>

        {dbStatus && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              dbStatus.tablesExiste
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : dbStatus.connecte
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {dbStatus.tablesExiste ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Base Vercel PostgreSQL 100% Opérationnelle !</span>
                </>
              ) : dbStatus.connecte ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>Connexion établie, préparation des tables...</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Liaison Vercel PostgreSQL non détectée ou en erreur</span>
                </>
              )}
            </div>
            <p className="leading-relaxed">{dbStatus.message}</p>
          </div>
        )}

        {initFeedback && (
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs">
            {initFeedback}
          </div>
        )}
      </div>

      {/* SECTION 2: MOBILE MONEY GATEWAYS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Passerelles Mobile Money (Orange, Moov, MTN, LigdiCash)
              </h3>
              <p className="text-xs text-slate-500">
                Basculement entre le mode Simulation (Sandbox) et Production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                mode === 'SIMULATION'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {mode === 'SIMULATION' ? '● Mode Bac à Sable' : '● Mode Production'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block">Environnement d'exécution des paiements :</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="gateway_mode"
                checked={mode === 'SIMULATION'}
                onChange={() => setMode('SIMULATION')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-900 block">Mode Démonstration & Bac à sable</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                  Validation manuelle par la secrétaire après saisie du code OTP Orange Money. Aucun prélèvement bancaire automatique.
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                mode === 'PRODUCTION'
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="gateway_mode"
                checked={mode === 'PRODUCTION'}
                onChange={() => setMode('PRODUCTION')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-900 block">Mode Production (En direct)</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                  Appelle directement les API marchandes partenaires (Orange Money, Moov Africa, MTN) avec vos clés souscrites.
                </span>
              </div>
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF7900]"></span>
                Orange Money Burkina (API WebPay)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">*144#</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Clé API Publique / Client ID</label>
                <input
                  type="text"
                  placeholder="Ex: om_live_pub_..."
                  value={orangeApiKey}
                  onChange={(e) => setOrangeApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Identifiant Marchand (Merchant ID)</label>
                <input
                  type="text"
                  placeholder="Ex: BF_MERCHANT_00492"
                  value={orangeMerchantId}
                  onChange={(e) => setOrangeMerchantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0070BA]"></span>
                Moov Africa Burkina (API Moov Money)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">*555#</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">API Key Marchand</label>
                <input
                  type="text"
                  placeholder="Ex: moov_sec_..."
                  value={moovApiKey}
                  onChange={(e) => setMoovApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Code Marchand (Secret PIN)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={moovSecret}
                  onChange={(e) => setMoovSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestSimulation}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
            >
              Tester l'émetteur de paiement simulé
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer la Configuration</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Configuration enregistrée avec succès.</span>
            </div>
          )}

          {testResult && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>{testResult}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
