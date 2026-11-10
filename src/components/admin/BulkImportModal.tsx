import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight,
  Sparkles,
  Users,
  Database
} from 'lucide-react';
import { SchoolStore, PREVIOUS_SCHOOL_YEAR, CURRENT_SCHOOL_YEAR } from '../../services/store';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: () => void;
}

interface ParsedRow {
  matricule: string;
  nom: string;
  prenom: string;
  classeOrigine: string;
  statutFinAnnee: 'PASSANT' | 'REDOUBLANT';
  moyenneAnnuelle?: number;
  telephoneParent?: string;
  nomParent?: string;
  valide: boolean;
  erreur?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [anneeOrigine, setAnneeOrigine] = useState(PREVIOUS_SCHOOL_YEAR);
  const [anneeCible, setAnneeCible] = useState(CURRENT_SCHOOL_YEAR);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download official sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent = 
`matricule;nom;prenom;classe_origine;statut_fin_annee;moyenne_annuelle;telephone_parent;nom_parent
EDU-26-0001;TRAORE;Amadou;6ème A;PASSANT;14.25;70112233;TRAORE Ousmane
EDU-26-0002;KABORE;Fatou;3ème B;PASSANT;15.80;78445566;KABORE Mariam
EDU-26-0003;OUEDRAOGO;Souleymane;5ème A;REDOUBLANT;08.50;76998877;OUEDRAOGO Seydou
EDU-26-0004;SANON;Awa;2nde C;PASSANT;14.10;71223344;SANON Karim
EDU-26-0005;SAWADOGO;Issa;BEP 1;PASSANT;13.75;75667788;SAWADOGO Abdoulaye
EDU-26-0006;COMPAORE;Bintou;Bac Pro 1;PASSANT;12.80;70889900;COMPAORE Lassina
EDU-26-0007;ZONGO;Ibrahim;C';PASSANT;16.40;72334455;ZONGO Philippe
EDU-26-0008;BAMBARA;Nafissatou;BEP 2;REDOUBLANT;09.20;73445566;BAMBARA Julien`;

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modele_import_eleves_${anneeOrigine.replace('-', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processSelectedFile(dropped);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCsvText(text);
      } catch (err: unknown) {
        setParseError('Impossible de lire le fichier. Format non reconnu.');
      }
    };
    reader.onerror = () => {
      setParseError('Erreur de lecture du fichier.');
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const parseCsvText = (text: string) => {
    if (!text || text.trim() === '') {
      setParseError('Le fichier sélectionné est vide.');
      setParsedRows([]);
      return;
    }

    // Auto-detect delimiter: ; or , or \t
    const firstLine = text.split(/\r\n|\n|\r/)[0];
    let delimiter = ';';
    if ((firstLine.match(/;/g) || []).length >= 2) delimiter = ';';
    else if ((firstLine.match(/,/g) || []).length >= 2) delimiter = ',';
    else if ((firstLine.match(/\t/g) || []).length >= 2) delimiter = '\t';

    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
    if (lines.length <= 1) {
      setParseError("Le fichier ne contient aucune ligne de données après l'en-tête.");
      setParsedRows([]);
      return;
    }

    const header = lines[0].toLowerCase().split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    
    // Find column indexes
    const idxMatricule = header.findIndex((h) => h.includes('matricule') || h.includes('id') || h.includes('code'));
    const idxNom = header.findIndex((h) => h === 'nom' || h.includes('nom_') || h.includes('nom'));
    const idxPrenom = header.findIndex((h) => h.includes('prenom'));
    const idxClasse = header.findIndex((h) => h.includes('classe') || h.includes('niveau'));
    const idxStatut = header.findIndex((h) => h.includes('statut') || h.includes('decision') || h.includes('fin_annee'));
    const idxMoyenne = header.findIndex((h) => h.includes('moyenne') || h.includes('note'));
    const idxTel = header.findIndex((h) => h.includes('tel') || h.includes('telephone') || h.includes('contact'));
    const idxParent = header.findIndex((h) => h.includes('parent') || h.includes('tuteur'));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const matricule = idxMatricule !== -1 ? cols[idxMatricule] : cols[0] || '';
      const nom = idxNom !== -1 ? cols[idxNom] : cols[1] || '';
      const prenom = idxPrenom !== -1 ? cols[idxPrenom] : cols[2] || '';
      const classeOrigine = idxClasse !== -1 ? cols[idxClasse] : cols[3] || '6ème';

      const rawStatut = (idxStatut !== -1 ? cols[idxStatut] : cols[4] || '').toUpperCase();
      const statutFinAnnee: 'PASSANT' | 'REDOUBLANT' = 
        rawStatut.includes('REDOUBL') || rawStatut.includes('ECHOU') || rawStatut.includes('NON') 
          ? 'REDOUBLANT' 
          : 'PASSANT';

      const rawMoyenne = idxMoyenne !== -1 ? cols[idxMoyenne] : '';
      const moyenneAnnuelle = rawMoyenne ? parseFloat(rawMoyenne.replace(',', '.')) : undefined;

      const telephoneParent = idxTel !== -1 ? cols[idxTel] : undefined;
      const nomParent = idxParent !== -1 ? cols[idxParent] : undefined;

      const valide = Boolean(matricule && nom && prenom);

      rows.push({
        matricule,
        nom,
        prenom,
        classeOrigine,
        statutFinAnnee,
        moyenneAnnuelle: isNaN(moyenneAnnuelle || 0) ? undefined : moyenneAnnuelle,
        telephoneParent,
        nomParent,
        valide,
        erreur: !valide ? 'Matricule, nom ou prénom manquant' : undefined,
      });
    }

    setParsedRows(rows);
    if (rows.length === 0) {
      setParseError('Aucune donnée valide extraite.');
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);

    const validRows = parsedRows.filter((r) => r.valide);
    const stats = SchoolStore.importStudentsBatch(
      validRows.map((r) => ({
        matricule: r.matricule,
        nom: r.nom,
        prenom: r.prenom,
        classeOrigine: r.classeOrigine,
        statutFinAnnee: r.statutFinAnnee,
        moyenneAnnuelle: r.moyenneAnnuelle,
        telephoneParent: r.telephoneParent,
        nomParent: r.nomParent,
      })),
      anneeOrigine,
      anneeCible
    );

    setIsProcessing(false);
    setImportStats(stats);
    onImportCompleted();
  };

  const validCount = parsedRows.filter((r) => r.valide).length;
  const passantCount = parsedRows.filter((r) => r.valide && r.statutFinAnnee === 'PASSANT').length;
  const redoublantCount = parsedRows.filter((r) => r.valide && r.statutFinAnnee === 'REDOUBLANT').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Importation en Masse des Élèves (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-400">
                Bascule annuelle : intégration des effectifs {anneeOrigine} vers {anneeCible}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target & Source Years Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Année scolaire source (Fichier précédent) :
              </label>
              <input
                type="text"
                value={anneeOrigine}
                onChange={(e) => setAnneeOrigine(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Année scolaire cible (Nouvelle rentrée) :
              </label>
              <input
                type="text"
                value={anneeCible}
                onChange={(e) => setAnneeCible(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold bg-white"
              />
            </div>
          </div>

          {/* Download Sample Button & Drag-Drop Zone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Fichier de données des élèves
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger le modèle CSV officiel</span>
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Cliquez ici ou glissez votre fichier CSV / Excel'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Accepte les fichiers .CSV délimités par point-virgule (;) ou virgule (,) jusqu'à 10 000 lignes
              </p>
            </div>
          </div>

          {/* Error alert if any */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erreur d'analyse</p>
                <p>{parseError}</p>
              </div>
            </div>
          )}

          {/* Import Success Result Strip */}
          {importStats && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Importation terminée avec succès !</span>
              </div>
              <p className="text-emerald-800">
                <strong>{importStats.created}</strong> nouveaux élèves importés en attente de réinscription pour {anneeCible}, et <strong>{importStats.updated}</strong> élèves existants mis à jour.
              </p>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && !importStats && (
            <div className="space-y-3">
              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Analyse préalable :
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                  Total : {parsedRows.length} lignes
                </span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {passantCount} Passants
                </span>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                  {redoublantCount} Redoublants
                </span>
              </div>

              {/* Table preview (first 8 rows) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Matricule</th>
                        <th className="py-2.5 px-3">Nom & Prénom</th>
                        <th className="py-2.5 px-3">Classe Origine</th>
                        <th className="py-2.5 px-3">Statut Fin d'Année</th>
                        <th className="py-2.5 px-3">Moyenne</th>
                        <th className="py-2.5 px-3">Téléphone Parent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className={r.valide ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.matricule}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{r.nom} {r.prenom}</td>
                          <td className="py-2 px-3 text-slate-600">{r.classeOrigine}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.statutFinAnnee === 'REDOUBLANT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {r.statutFinAnnee}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">{r.moyenneAnnuelle ? `${r.moyenneAnnuelle}/20` : '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{r.telephoneParent || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <div className="p-2 bg-slate-50 text-center text-[11px] text-slate-500 border-t border-slate-200">
                    ... et {parsedRows.length - 10} autres élèves prêts à être insérés.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {parsedRows.length > 0 && !importStats ? `${validCount} élève(s) valide(s) à injecter en base` : ''}
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 cursor-pointer"
            >
              Fermer
            </button>

            {parsedRows.length > 0 && !importStats && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-600 shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Insertion en cours...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Lancer l'Importation ({validCount} Élèves)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
