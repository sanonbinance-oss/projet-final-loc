import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Wifi, Database } from 'lucide-react';
import { SyncService, SyncState } from '../services/sync';

interface SyncBannerProps {
  minimal?: boolean;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ minimal = false }) => {
  const [syncState, setSyncState] = useState<SyncState>(() => SyncService.getState());
  const [isForcing, setIsForcing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = SyncService.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleForceSync = async () => {
    setIsForcing(true);
    try {
      await SyncService.synchroniserMaintenant();
    } finally {
      setTimeout(() => setIsForcing(false), 500);
    }
  };

  const formatLastSync = (val: string | Date | null) => {
    if (!val) return 'À l\'instant';
    if (typeof val === 'string') return val;
    return val.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (minimal) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {syncState.statut === 'synchronisation' || isForcing ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
            <span>Synchronisation...</span>
          </span>
        ) : syncState.statut === 'erreur' ? (
          <button
            onClick={handleForceSync}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            title={syncState.messageErreur || 'Erreur de connexion'}
          >
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Erreur synchro (cliquer pour réessayer)</span>
          </button>
        ) : (
          <button
            onClick={handleForceSync}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer group"
            title={`Dernière synchro à ${formatLastSync(syncState.derniereSynchro)}. Cliquez pour actualiser.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="w-3 h-3 text-emerald-600" />
            <span>Supabase En direct</span>
            <RefreshCw className="w-2.5 h-2.5 text-emerald-500 opacity-60 group-hover:opacity-100 group-hover:rotate-180 transition-all" />
          </button>
        )}
      </div>
    );
  }

  if (dismissed && syncState.statut !== 'erreur') {
    return null;
  }

  if (syncState.statut === 'erreur') {
    return (
      <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p>
            <span className="font-semibold">Liaison Supabase en pause :</span>{' '}
            {syncState.messageErreur || 'Impossible de joindre la base de données.'} Les données restent enregistrées localement.
          </p>
        </div>
        <button
          onClick={handleForceSync}
          disabled={isForcing}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium shrink-0 disabled:opacity-50"
        >
          {isForcing ? 'Connexion...' : 'Réessayer'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-2 text-xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          <strong className="text-white">Liaison Temps Réel Active :</strong> Synchronisé avec Supabase Cloud. Les demandes parents apparaissent instantanément côté secrétaire.
        </span>
        <span className="text-slate-400 hidden sm:inline">
          (Dernière màj : {formatLastSync(syncState.derniereSynchro)})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleForceSync}
          disabled={isForcing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isForcing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Synchroniser</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-200 text-xs px-1"
          title="Masquer le bandeau"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
