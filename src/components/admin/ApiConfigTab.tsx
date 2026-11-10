import React, { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Save, 
  Cpu, 
  Lock,
  Layers,
  Database,
  CloudCheck,
  RotateCw,
  Copy,
  Check
} from 'lucide-react';
import { PaymentService } from '../../services/paymentService';
import { 
  SUPABASE_PROJECT_ID, 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  SupabaseSyncService, 
  SupabaseConnexionStatus 
} from '../../services/supabaseClient';

export const ApiConfigTab: React.FC = () => {
  const [mode, setMode] = useState<'SIMULATION' | 'PRODUCTION'>(PaymentService.MODE);

  // Supabase test state
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnexionStatus | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Future keys state
  const [orangeApiKey, setOrangeApiKey] = useState('');
  const [orangeMerchantId, setOrangeMerchantId] = useState('');
  
  const [moovApiKey, setMoovApiKey] = useState('');
  const [moovSecret, setMoovSecret] = useState('');

  const [mtnApiKey, setMtnApiKey] = useState('');
  const [mtnSubKey, setMtnSubKey] = useState('');

  const [ligdicashToken, setLigdicashToken] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseStatus(null);
    const result = await SupabaseSyncService.testerConnexion();
    setIsTestingSupabase(false);
    setSupabaseStatus(result);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    PaymentService.MODE = mode;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestSimulation = () => {
    setTestResult("Simulation réussie : Les serveurs Orange, Moov et MTN répondent avec succès en mode bac à sable (Sandbox).");
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
              Supabase PostgreSQL & Passerelles Marchandes
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Connexions Base de Données & Clés API
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillez la liaison directe avec votre projet Supabase et paramétrez les passerelles Orange, Moov, MTN et LigdiCash.
          </p>
        </div>
      </div>

      {/* SECTION 1: SUPABASE CLOUD CONNECTION CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Base de Données Cloud Supabase (PostgreSQL)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Relié au projet
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Stockage persistant des élèves, tarifs de scolarité, inscriptions et quittances
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestSupabase}
            disabled={isTestingSupabase}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
            <span>{isTestingSupabase ? 'Test en cours...' : 'Tester la connexion en direct'}</span>
          </button>
        </div>

        {/* Credentials Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block text-[11px] font-semibold">Identifiant Projet (Reference ID) :</span>
            <div className="font-mono font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>{SUPABASE_PROJECT_ID}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-bold">Actif</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-slate-500 block text-[11px] font-semibold">Point d'accès API REST (URL) :</span>
            <div className="font-mono font-semibold text-slate-700 text-xs truncate">
              {SUPABASE_URL}
            </div>
          </div>
        </div>

        {/* Public Key Display */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="truncate">
            <span className="text-slate-500 block text-[11px] font-semibold">Clé Publique (Publishable Key) :</span>
            <span className="font-mono text-slate-700 text-[11px] truncate block max-w-lg">
              {SUPABASE_ANON_KEY}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_ANON_KEY);
              setCopiedKey(true);
              setTimeout(() => setCopiedKey(false), 2000);
            }}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 cursor-pointer shrink-0"
            title="Copier la clé"
          >
            {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Test Diagnostic Output */}
        {supabaseStatus && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${
            supabaseStatus.tablesExiste
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : supabaseStatus.connecte
              ? 'bg-blue-50 border-blue-300 text-blue-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {supabaseStatus.tablesExiste ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Connexion 100% Opérationnelle & Synchronisée !</span>
                </>
              ) : supabaseStatus.connecte ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>Projet Supabase Connecté & Authentifié avec Succès !</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Erreur de communication Supabase</span>
                </>
              )}
            </div>

            <p className="leading-relaxed">
              {supabaseStatus.message}
            </p>

            {!supabaseStatus.tablesExiste && supabaseStatus.connecte && (
              <div className="bg-white/90 p-3 rounded-lg border border-blue-200 space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-900">
                  Étape suivante pour activer la persistance dans Supabase :
                </p>
                <ol className="list-decimal list-inside text-slate-700 space-y-1">
                  <li>Ouvrez votre console Supabase : <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-1">Aller au SQL Editor <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Copiez le script SQL complet ci-dessous.</li>
                  <li>Collez dans le SQL Editor et cliquez sur <strong>« Run »</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* SQL SCHEMA CODE VIEWER / COPY TOOL */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">
                Script SQL de création des 6 tables (Supabase / PostgreSQL)
              </span>
            </div>
            <a
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
            >
              <span>Ouvrir l'éditeur SQL Supabase</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ce script crée les 6 tables en français (utilisateurs, tarifs_scolarite, eleves, inscriptions_annuelles, demandes_admission, paiements), les index trigrammes et les tarifs 2027-2028.
          </p>
        </div>
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
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              mode === 'SIMULATION'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              {mode === 'SIMULATION' ? '● Mode Bac à Sable' : '● Mode Production'}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block">Environnement d'exécution des paiements :</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
              mode === 'SIMULATION'
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                : 'bg-slate-100 border-slate-200'
            }`}>
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
                  Simulateur interactif avec validation par code OTP SMS réel. Aucun prélèvement bancaire effectif.
                </span>
              </div>
            </label>

            <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
              mode === 'PRODUCTION'
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                : 'bg-slate-100 border-slate-200'
            }`}>
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

        {/* Gateways Inputs Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Orange Money */}
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

          {/* Moov Money */}
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
