import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  MapPin,
  AlertCircle,
  FileCheck,
  HeartHandshake,
  School,
  FileText
} from 'lucide-react';
import { AdmissionRequest, Student } from '../../types';
import { SchoolStore } from '../../services/store';

interface AdmissionsTabProps {
  admissions: AdmissionRequest[];
  onAdmissionAccepted: (student: Student) => void;
  onGoToCashDesk: (studentId: string) => void;
}

export const AdmissionsTab: React.FC<AdmissionsTabProps> = ({
  admissions,
  onAdmissionAccepted,
  onGoToCashDesk,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'en_attente' | 'accepte' | 'refuse'>('all');
  const [search, setSearch] = useState('');
  const [viewDetailsAdmission, setViewDetailsAdmission] = useState<AdmissionRequest | null>(null);
  const [scolariteInitiale, setScolariteInitiale] = useState<number>(180000);
  const [motifRefus, setMotifRefus] = useState('');
  const [refusalModalId, setRefusalModalId] = useState<string | null>(null);
  const [acceptedStudent, setAcceptedStudent] = useState<Student | null>(null);

  const filtered = admissions.filter((req) => {
    if (filterStatus !== 'all' && req.statut !== filterStatus) return false;
    if (search.trim() === '') return true;
    const q = search.toLowerCase();
    return (
      req.nomEnfant.toLowerCase().includes(q) ||
      req.prenomEnfant.toLowerCase().includes(q) ||
      req.classeDemandee.toLowerCase().includes(q) ||
      req.nomParent.toLowerCase().includes(q) ||
      req.telephoneParent.includes(q) ||
      (req.etablissementOrigine && req.etablissementOrigine.toLowerCase().includes(q))
    );
  });

  const pendingCount = admissions.filter((a) => a.statut === 'en_attente').length;
  const acceptedCount = admissions.filter((a) => a.statut === 'accepte').length;
  const rejectedCount = admissions.filter((a) => a.statut === 'refuse').length;

  const handleAccept = (req: AdmissionRequest) => {
    const student = SchoolStore.acceptAdmission(req.id, scolariteInitiale);
    if (student) {
      setAcceptedStudent(student);
      onAdmissionAccepted(student);
    }
  };

  const handleConfirmRefuse = () => {
    if (!refusalModalId) return;
    SchoolStore.rejectAdmission(refusalModalId, motifRefus);
    setRefusalModalId(null);
    setMotifRefus('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Admissions & Contrôle des Bulletins du 3ème Trimestre
          </h2>
          <p className="text-xs text-slate-500">
            Vérifiez si l'élève est admis en classe supérieure ou redoublant, consultez son bulletin, sa raison de venue et son don.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({admissions.length})
          </button>
          <button
            onClick={() => setFilterStatus('en_attente')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              filterStatus === 'en_attente'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>En attente</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('accepte')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'accepte'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acceptées ({acceptedCount})
          </button>
          <button
            onClick={() => setFilterStatus('refuse')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'refuse'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Refusées ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Success Notification if student just created */}
      {acceptedStudent && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold text-emerald-950">
                Élève inscrit avec succès dans la base scolaire !
              </p>
              <p className="text-emerald-800">
                Matricule attribué : <strong className="font-mono">{acceptedStudent.matricule}</strong> pour {acceptedStudent.prenom} {acceptedStudent.nom} ({acceptedStudent.classe}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGoToCashDesk(acceptedStudent.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-sm whitespace-nowrap"
            >
              Encaisser scolarité & don au guichet
            </button>
            <button
              onClick={() => setAcceptedStudent(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par élève, classe, école d'origine ou parent..."
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Table of Admissions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Aucune demande d'admission ne correspond à ce filtre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Réf</th>
                  <th className="py-3 px-4">Élève & Classe</th>
                  <th className="py-3 px-4">Bulletin T3 & Décision</th>
                  <th className="py-3 px-4">École d'origine & Raison de venue</th>
                  <th className="py-3 px-4">Don prévu</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions Secrétariat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => {
                  const dateStr = new Date(req.dateDemande).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800 block">{req.id}</span>
                        <span>{dateStr}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 text-sm block">
                          {req.nomEnfant} {req.prenomEnfant}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-100">
                            {req.classeDemandee}
                          </span>
                          <span>Né(e) {req.dateNaissance}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                          req.decisionBulletin === 'PASSAGE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.decisionBulletin === 'REDOUBLEMENT'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {req.decisionBulletin === 'PASSAGE'
                            ? 'Passage en classe sup.'
                            : req.decisionBulletin === 'REDOUBLEMENT'
                            ? 'Redoublement de classe'
                            : 'Nouveau cycle'}
                        </span>
                        {req.moyenneAnnuelle ? (
                          <span className="block font-mono text-[11px] text-slate-600 mt-1">
                            Moyenne : <strong>{req.moyenneAnnuelle} / 20</strong>
                          </span>
                        ) : null}
                        <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                          Doc : {req.bulletinNomFichier || 'Bulletin.pdf'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs text-slate-700">
                        <span className="font-medium text-slate-900 block truncate">
                          {req.etablissementOrigine || 'Ancien établissement'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Parent: {req.nomParent} ({req.telephoneParent})
                        </span>
                        {req.descriptionVenue && (
                          <p className="text-[11px] italic text-slate-600 mt-1 line-clamp-2">
                            « {req.descriptionVenue} »
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                        {req.montantDon > 0 ? (
                          <span className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3 text-purple-700" />
                            {req.montantDon.toLocaleString('fr-FR')} F
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 F</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {req.statut === 'en_attente' && (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                        {req.statut === 'accepte' && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Acceptée
                            </span>
                            {req.matriculeAttribue && (
                              <span className="font-mono text-[10px] text-slate-500 block mt-1">
                                Matr: {req.matriculeAttribue}
                              </span>
                            )}
                          </div>
                        )}
                        {req.statut === 'refuse' && (
                          <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-semibold">
                            <XCircle className="w-3 h-3" /> Refusée
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {req.statut === 'en_attente' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAccept(req)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                              title="Valider la place et inscrire l'élève"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accepter</span>
                            </button>
                            <button
                              onClick={() => setRefusalModalId(req.id)}
                              className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Refuser la demande"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : req.statut === 'accepte' ? (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Dossier finalisé
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Classé sans suite
                          </span>
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

      {/* Refusal Modal */}
      {refusalModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Motif du Refus de la Demande d'Admission
            </h3>
            <p className="text-xs text-slate-600">
              Veuillez indiquer la raison pour laquelle cette demande ne peut pas être acceptée.
            </p>
            <textarea
              rows={3}
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="Ex: Effectif complet ou moyenne insuffisante..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            ></textarea>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRefusalModalId(null);
                  setMotifRefus('');
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRefuse}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Confirmer le Refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
