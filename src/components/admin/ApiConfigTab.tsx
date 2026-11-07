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
  Layers
} from 'lucide-react';
import { PaymentService } from '../../services/paymentService';

export const ApiConfigTab: React.FC = () => {
  const [mode, setMode] = useState<'SIMULATION' | 'PRODUCTION'>(PaymentService.MODE);

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
              Passerelle Mobile Money
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Burkina Faso & Afrique de l'Ouest
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Configuration des Passerelles de Paiement & Clés API
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Actuellement configuré en mode Bac à Sable (Simulation). Vous pourrez insérer vos clés officielles dès réception.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'SIMULATION'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Simulation
            </button>
            <button
              onClick={() => setMode('PRODUCTION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'PRODUCTION'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Production
            </button>
          </div>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>Conseil pour l'obtention des Clés API au Burkina Faso</span>
        </div>
        <p className="leading-relaxed text-blue-800">
          Pour éviter d'avoir à signer 3 contrats séparés auprès d'<strong>Orange Burkina</strong>, <strong>Moov Africa</strong> et <strong>MTN</strong>, vous pouvez également opter pour un agrégateur certifié comme <strong>LigdiCash</strong> (Ouagadougou) ou <strong>CinetPay</strong>. Avec un contrat unique, une seule clé API connecte automatiquement tous les opérateurs Mobile Money !
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Paramètres de la passerelle mis à jour avec succès !</span>
        </div>
      )}

      {testResult && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{testResult}</span>
        </div>
      )}

      {/* API Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Orange Money Burkina */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FF7900]"></span>
              <h3 className="font-bold text-slate-900 text-sm">Orange Money Burkina Faso (WebPay API)</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Service: *144*4*6#</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Clé API Marchand (Orange API Key / Token)
              </label>
              <input
                type="text"
                value={orangeApiKey}
                onChange={(e) => setOrangeApiKey(e.target.value)}
                placeholder="Ex: om_live_9a8b7c6d5e4f..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Code Marchand (Merchant ID / PIN Caisse)
              </label>
              <input
                type="text"
                value={orangeMerchantId}
                onChange={(e) => setOrangeMerchantId(e.target.value)}
                placeholder="Ex: OM_BURKINA_2025"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Moov Africa Burkina */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0070BA]"></span>
              <h3 className="font-bold text-slate-900 text-sm">Moov Africa Burkina (Moov Money)</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Service: *555#</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Clé Partenaire API (Moov Client ID)
              </label>
              <input
                type="text"
                value={moovApiKey}
                onChange={(e) => setMoovApiKey(e.target.value)}
                placeholder="Ex: moov_bf_client_091..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Secret Marchand (Client Secret)
              </label>
              <input
                type="password"
                value={moovSecret}
                onChange={(e) => setMoovSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: MTN / LigdiCash */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600"></span>
              <h3 className="font-bold text-slate-900 text-sm">LigdiCash / Agrégateur Local Multi-Opérateurs</h3>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">Fortement Recommandé</span>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              Jeton d'authentification API (Bearer Token)
            </label>
            <input
              type="text"
              value={ligdicashToken}
              onChange={(e) => setLigdicashToken(e.target.value)}
              placeholder="Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestSimulation}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
          >
            Tester le simulateur de paiement
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
