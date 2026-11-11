import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  RefreshCw, 
  Download, 
  Info, 
  Trash2, 
  Sliders, 
  CreditCard,
  UserCheck,
  FileText
} from 'lucide-react';
import { AuditLog, AuditActionType } from '../../types';
import { SchoolStore } from '../../services/store';
import { SyncService } from '../../services/sync';

interface AuditTabProps {
  onRefresh?: () => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({ onRefresh }) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => SchoolStore.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to store changes so the log updates in real time
  React.useEffect(() => {
    const unsubscribe = SchoolStore.subscribe(() => {
      setLogs(SchoolStore.getAuditLogs());
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await SyncService.synchroniserMaintenant();
      setLogs(SchoolStore.getAuditLogs());
      if (onRefresh) onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Keyword filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inDesc = log.description.toLowerCase().includes(term);
        const inAuteur = log.auteur.toLowerCase().includes(term);
        const inType = log.typeAction.toLowerCase().includes(term);
        const inDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(term) : false;
        if (!inDesc && !inAuteur && !inType && !inDetails) return false;
      }

      // Action type filter
      if (filterType !== 'ALL') {
        if (filterType === 'CONNEXION' && log.typeAction !== 'CONNEXION') return false;
        if (filterType === 'SUPPRESSION' && log.typeAction !== 'SUPPRESSION_ELEVE') return false;
        if (filterType === 'TARIF' && log.typeAction !== 'MODIFICATION_TARIF') return false;
        if (filterType === 'ADMISSION' && !['VALIDATION_ADMISSION', 'REFUS_ADMISSION'].includes(log.typeAction)) return false;
        if (filterType === 'INSCRIPTION' && !['INSCRIPTION_MANUELLE', 'REINSCRIPTION_EFFECTUEE', 'IMPORT_MASSIF'].includes(log.typeAction)) return false;
        if (filterType === 'PAIEMENT' && !['ENCAISSEMENT_ESPECES', 'PAIEMENT_MOBILE_MONEY'].includes(log.typeAction)) return false;
      }

      // Severity filter
      if (filterSeverity !== 'ALL' && log.niveauGravite !== filterSeverity) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, filterType, filterSeverity]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const connexions = logs.filter((l) => l.typeAction === 'CONNEXION').length;
    const suppressions = logs.filter((l) => l.typeAction === 'SUPPRESSION_ELEVE').length;
    const tarifs = logs.filter((l) => l.typeAction === 'MODIFICATION_TARIF').length;
    const encaissements = logs.filter((l) => ['ENCAISSEMENT_ESPECES', 'PAIEMENT_MOBILE_MONEY'].includes(l.typeAction)).length;
    const admissions = logs.filter((l) => ['VALIDATION_ADMISSION', 'REFUS_ADMISSION'].includes(l.typeAction)).length;
    return { total, connexions, suppressions, tarifs, encaissements, admissions };
  }, [logs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Date Heure', 'Type Action', 'Niveau Gravite', 'Auteur', 'Description'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.dateAction).toLocaleString('fr-FR'),
      l.typeAction,
      l.niveauGravite,
      `"${l.auteur.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_audit_edupay_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (type: AuditActionType) => {
    switch (type) {
      case 'CONNEXION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            Connexion Secrétariat
          </span>
        );
      case 'MODIFICATION_TARIF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            Barème / Tarif
          </span>
        );
      case 'SUPPRESSION_ELEVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Suppression Élève
          </span>
        );
      case 'VALIDATION_ADMISSION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Admission Validée
          </span>
        );
      case 'REFUS_ADMISSION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Admission Refusée
          </span>
        );
      case 'ENCAISSEMENT_ESPECES':
      case 'PAIEMENT_MOBILE_MONEY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            Règlement Scolarité
          </span>
        );
      case 'INSCRIPTION_MANUELLE':
      case 'REINSCRIPTION_EFFECTUEE':
      case 'IMPORT_MASSIF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            Inscription / Effectif
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {type}
          </span>
        );
    }
  };

  const getSeverityBadge = (gravite: 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE') => {
    switch (gravite) {
      case 'CRITIQUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Critique
          </span>
        );
      case 'AVERTISSEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Alerte
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700">
            <Info className="w-3 h-3 text-slate-400" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Traçabilité Réglementaire & Sécurité Supabase
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Journal d'Audit & Historique des Actions
            </h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Toutes les opérations sensibles sont consignées de manière infalsifiable : connexions au secrétariat, révisions de barèmes tarifaires, suppressions d'élèves, validations des dossiers parents et encaissements de caisse.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-sm font-semibold rounded-xl border border-white/20 transition-all backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'Actualisation...' : 'Actualiser le journal'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950/30 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Événements</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Archivés</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" /> Connexions PIN
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.connexions}</p>
          <span className="text-[11px] text-slate-400">Sessions secrétariat</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Modifs Tarifs
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.tarifs}</p>
          <span className="text-[11px] text-slate-400">Barèmes ajustés</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Suppressions
          </p>
          <p className="text-2xl font-bold text-rose-900 mt-1">{stats.suppressions}</p>
          <span className="text-[11px] text-slate-400">Élèves retirés</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Admissions
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.admissions}</p>
          <span className="text-[11px] text-slate-400">Dossiers traités</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Encaissements
          </p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.encaissements}</p>
          <span className="text-[11px] text-slate-400">Quittances émises</span>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par élève, matricule, quittance, motif, auteur..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Effacer
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Toutes les actions</option>
              <option value="CONNEXION">Connexions secrétariat</option>
              <option value="SUPPRESSION">Suppressions d'élèves</option>
              <option value="TARIF">Modifications de tarifs</option>
              <option value="ADMISSION">Validations & Refus dossiers</option>
              <option value="INSCRIPTION">Inscriptions & Réinscriptions</option>
              <option value="PAIEMENT">Paiements & Quittances</option>
            </select>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Toutes gravités</option>
            <option value="INFO">Information</option>
            <option value="AVERTISSEMENT">Avertissement</option>
            <option value="CRITIQUE">Critique</option>
          </select>
        </div>
      </div>

      {/* Log list / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <p className="text-base font-semibold text-slate-800">Aucun enregistrement d'audit trouvé</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm || filterType !== 'ALL' || filterSeverity !== 'ALL'
                ? 'Aucun journal ne correspond à vos filtres actuels. Réinitialisez la recherche.'
                : 'Les actions effectuées (connexions, modifications de tarifs, suppressions d\'élèves) apparaîtront automatiquement ici.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Type d'opération</th>
                  <th className="py-3 px-4">Gravité</th>
                  <th className="py-3 px-4">Auteur</th>
                  <th className="py-3 px-4">Description de l'action</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.dateAction);
                  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                        <span className="text-xs text-slate-400 pl-5">{formattedTime}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.typeAction)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSeverityBadge(log.niveauGravite)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{log.auteur}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="line-clamp-2 max-w-xl text-xs sm:text-sm font-normal">
                          {log.description}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            <span>Inspecter</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Détails de l'enregistrement</h3>
                  <p className="text-xs text-slate-500">ID d'audit : {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Horodatage</span>
                <p className="text-slate-800 font-medium">
                  {new Date(selectedLog.dateAction).toLocaleString('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Opération & Gravité</span>
                <div className="flex items-center gap-2 mt-1">
                  {getActionBadge(selectedLog.typeAction)}
                  {getSeverityBadge(selectedLog.niveauGravite)}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Auteur</span>
                <p className="text-slate-800 font-medium">{selectedLog.auteur}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Description</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed mt-1">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Paramètres techniques & Métadonnées</span>
                  <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
