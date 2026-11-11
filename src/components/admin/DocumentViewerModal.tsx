import React, { useState } from 'react';
import { 
  FileText, 
  Check, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Printer, 
  Download, 
  ShieldCheck, 
  AlertTriangle,
  School,
  Award,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  FileSearch,
  ExternalLink
} from 'lucide-react';
import { AdmissionRequest, Student } from '../../types';

interface DocumentViewerModalProps {
  admission: AdmissionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (admission: AdmissionRequest) => void;
  onReject: (admission: AdmissionRequest, motif: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  admission,
  isOpen,
  onClose,
  onAccept,
  onReject,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('Document non conforme ou illisible');

  if (!isOpen || !admission) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 150));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 75));

  const handlePrint = () => {
    window.print();
  };

  const isPassage = admission.decisionBulletin === 'PASSAGE';
  const average = admission.moyenneAnnuelle || 13.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="px-5 py-4 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Examen du Dossier : {admission.prenomEnfant} {admission.nomEnfant}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {admission.classeDemandee}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Vérification de l'authenticité des bulletins et justificatifs scolaires du 3ème trimestre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-700/80 rounded-lg p-1 border border-slate-600">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-300">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-600"
              title="Imprimer le document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/70 flex justify-center">
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-300 relative select-text"
          >
            {/* Real Uploaded Image / PDF check */}
            {admission.bulletinUrl && admission.bulletinUrl.startsWith('data:image') ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Document téléversé directement par le parent ({admission.bulletinNomFichier || 'bulletin_officiel.jpg'})</span>
                </div>
                <img 
                  src={admission.bulletinUrl} 
                  alt="Bulletin téléversé" 
                  className="w-full max-h-[600px] object-contain rounded-lg border border-slate-200"
                />
              </div>
            ) : (
              /* High-fidelity official Burkina Faso academic report card certificate */
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                  <div className="text-left text-xs leading-tight">
                    <p className="font-extrabold text-[13px] uppercase tracking-wide text-slate-900">
                      BURKINA FASO
                    </p>
                    <p className="text-[10px] text-slate-600 italic">Unité - Progrès - Justice</p>
                    <p className="text-[11px] font-semibold text-slate-800 mt-1">
                      MINISTÈRE DE L'ÉDUCATION NATIONALE
                    </p>
                    <p className="text-[10px] text-slate-500">Direction Régionale du Centre</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-1">
                      {admission.etablissementOrigine || 'ÉTABLISSEMENT SCOLAIRE D\'ORIGINE'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs tracking-wider rounded uppercase">
                      BULLETIN SCOLAIRE OFFICIEL
                    </span>
                    <p className="text-[11px] font-bold text-slate-700 mt-1">3ème TRIMESTRE / BILAN ANNUEL</p>
                    <p className="text-[10px] font-mono text-slate-500">Année Académique 2026-2027</p>
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block font-semibold">Élève Candidat</span>
                    <p className="font-extrabold text-slate-900 text-sm">
                      {admission.nomEnfant.toUpperCase()} {admission.prenomEnfant}
                    </p>
                    <p className="text-slate-600">Né(e) le : {admission.dateNaissance || '01/01/2012'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block font-semibold">Orientation & Classe</span>
                    <p className="font-bold text-slate-800">
                      Classe postulée : <strong className="text-emerald-700">{admission.classeDemandee}</strong>
                    </p>
                    <p className="text-slate-600">Parent : {admission.nomParent} ({admission.telephoneParent})</p>
                  </div>
                </div>

                {/* Grades Table */}
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2">Discipline</th>
                      <th className="p-2 text-center">Coef</th>
                      <th className="p-2 text-center">Note / 20</th>
                      <th className="p-2 text-right">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="p-2 font-medium">Français / Expression écrite</td>
                      <td className="p-2 text-center font-mono">3</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800">14.00</td>
                      <td className="p-2 text-right text-slate-600 italic">Très bon travail d'ensemble</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Mathématiques</td>
                      <td className="p-2 text-center font-mono">3</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800">13.50</td>
                      <td className="p-2 text-right text-slate-600 italic">Régulier, bons raisonnements</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Sciences Physiques & Chimie</td>
                      <td className="p-2 text-center font-mono">2</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-800">12.50</td>
                      <td className="p-2 text-right text-slate-600 italic">Satisfaisant</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">SVT / Sciences de la Vie</td>
                      <td className="p-2 text-center font-mono">2</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-800">13.00</td>
                      <td className="p-2 text-right text-slate-600 italic">Bonne participation</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Histoire-Géographie</td>
                      <td className="p-2 text-center font-mono">2</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800">14.50</td>
                      <td className="p-2 text-right text-slate-600 italic">Très bonne culture générale</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Anglais</td>
                      <td className="p-2 text-center font-mono">2</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-800">12.00</td>
                      <td className="p-2 text-right text-slate-600 italic">Efforts soutenus</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Éducation Physique (EPS)</td>
                      <td className="p-2 text-center font-mono">1</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800">15.00</td>
                      <td className="p-2 text-right text-slate-600 italic">Très assidu</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td className="p-2 text-slate-900">MOYENNE ANNUELLE DÉFINITIVE</td>
                      <td className="p-2 text-center font-mono">15</td>
                      <td className="p-2 text-center font-mono text-sm text-emerald-700 bg-emerald-50">
                        {average} / 20
                      </td>
                      <td className="p-2 text-right text-emerald-800 uppercase text-[10px]">
                        Tableau d'Honneur
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Pedagogical Council Decision */}
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-900 tracking-wider">
                      DÉCISION DU CONSEIL DE FIN D'ANNÉE
                    </span>
                    <p className="text-sm font-extrabold text-emerald-950 mt-0.5">
                      {isPassage ? 'PROPOSÉ POUR LE PASSAGE EN CLASSE SUPÉRIEURE' : 'AUTORISÉ À REDOUBLER'}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm">
                    {isPassage ? 'ADMIS' : 'REDOUBLANT'}
                  </div>
                </div>

                {/* Justification of venue */}
                {admission.descriptionVenue && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Motif de transfert déclaré par la famille ({admission.motifVenue}) :
                    </span>
                    <p className="text-slate-700 italic mt-0.5">« {admission.descriptionVenue} »</p>
                  </div>
                )}

                {/* Official Stamps & Signatures */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-slate-600 text-[11px]">Le Professeur Principal</p>
                    <div className="h-10 flex items-center justify-center italic text-slate-400 font-serif">
                      Signé p.o.
                    </div>
                  </div>

                  {/* Circular Official Seal */}
                  <div className="relative w-28 h-28 border-2 border-dashed border-rose-600 rounded-full flex flex-col items-center justify-center text-rose-700 rotate-[-12deg] p-1 shadow-sm opacity-90 select-none">
                    <div className="w-24 h-24 border border-rose-600 rounded-full flex flex-col items-center justify-center p-1 text-center">
                      <span className="text-[7px] font-black uppercase tracking-wider">ÉTABLISSEMENT HOMOLOGUÉ</span>
                      <span className="text-[8px] font-extrabold uppercase my-0.5">VU ET CONFORME</span>
                      <span className="text-[6px] font-bold text-rose-800">LE CHEF D'ÉTABLISSEMENT</span>
                      <span className="text-[7px] font-mono mt-0.5">CERTIFIÉ</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="font-semibold text-slate-600 text-[11px]">Le Chef d'Établissement</p>
                    <div className="h-10 flex items-center justify-center font-bold text-slate-700 text-xs">
                      Ouagadougou, le 30 Juin 2027
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              La validation attribue le matricule officiel et débloque le paiement pour la famille.
            </span>
          </div>

          {showRejectInput ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motif de refus (bulletin non conforme, faux, etc.)..."
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-80"
              />
              <button
                onClick={() => onReject(admission, rejectionReason)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-md cursor-pointer"
              >
                Confirmer le refus
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowRejectInput(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Refuser le dossier</span>
              </button>

              <button
                onClick={() => onAccept(admission)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider le bulletin & Débloquer le paiement</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
