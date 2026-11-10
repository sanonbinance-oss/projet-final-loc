import React, { useState } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Search, 
  Edit2, 
  Banknote, 
  Phone, 
  UserCheck, 
  AlertTriangle,
  X,
  Check,
  UploadCloud,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Student } from '../../types';
import { SchoolStore, CURRENT_SCHOOL_YEAR, PREVIOUS_SCHOOL_YEAR } from '../../services/store';
import { BulkImportModal } from './BulkImportModal';
import { ReenrollmentModal } from '../parent/ReenrollmentModal';

interface StudentsTabProps {
  students: Student[];
  onGoToCashDesk: (studentId: string) => void;
  onStudentsChanged: () => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onGoToCashDesk,
  onStudentsChanged,
}) => {
  const [search, setSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLDE' | 'PARTIEL' | 'IMPAYE'>('ALL');
  const [anneeFilter, setAnneeFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToReenroll, setStudentToReenroll] = useState<Student | null>(null);

  // New Student Form State
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newDateNaissance, setNewDateNaissance] = useState('2013-05-10');
  const [newClasse, setNewClasse] = useState('6ème');
  const [newScolarite, setNewScolarite] = useState(200000);
  const [newNomParent, setNewNomParent] = useState('');
  const [newTelephoneParent, setNewTelephoneParent] = useState('');
  const [newAdresse, setNewAdresse] = useState('Ouagadougou');
  const [newEtablissementOrigine, setNewEtablissementOrigine] = useState('');
  const [newDecisionBulletin, setNewDecisionBulletin] = useState<'PASSAGE' | 'REDOUBLEMENT' | 'NOUVEAU_CYCLE'>('PASSAGE');
  const [newMoyenneAnnuelle, setNewMoyenneAnnuelle] = useState('13.00');
  const [newMotifVenue, setNewMotifVenue] = useState<'DEMENAGEMENT' | 'EXCLUSION_PROBLEME' | 'RAPPROCHEMENT' | 'EXCELLENCE' | 'AUTRE'>('DEMENAGEMENT');
  const [newDescriptionVenue, setNewDescriptionVenue] = useState('');
  const [newMontantDon, setNewMontantDon] = useState(0);

  const classesList = [
    'ALL',
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    '2nde A',
    '2nde C',
    '1ère A',
    '1ère D',
    'Tle A',
    'Tle D',
    'BEP 1',
    'BEP 2',
    'Bac Pro 1',
    'Bac Pro 2',
    "C'",
    "D'",
  ];

  // Auto-set tuition when selecting a class in new student form
  const handleClassChange = (classe: string) => {
    setNewClasse(classe);
    const tarif = SchoolStore.getTarifForClass(classe, CURRENT_SCHOOL_YEAR);
    if (tarif) {
      setNewScolarite(tarif.totalExigible);
    }
  };

  const filtered = students.filter((s) => {
    if (classeFilter !== 'ALL' && !s.classe.toLowerCase().startsWith(classeFilter.toLowerCase())) return false;
    if (anneeFilter !== 'ALL') {
      const year = s.anneeScolaire || CURRENT_SCHOOL_YEAR;
      if (anneeFilter === 'EN_ATTENTE' && s.statutReinscription !== 'EN_ATTENTE_REINSCRIPTION') return false;
      if (anneeFilter !== 'EN_ATTENTE' && year !== anneeFilter) return false;
    }
    
    const reste = s.scolariteTotale - s.montantPaye;
    if (statusFilter === 'SOLDE' && reste > 0) return false;
    if (statusFilter === 'PARTIEL' && (s.montantPaye === 0 || reste <= 0)) return false;
    if (statusFilter === 'IMPAYE' && s.montantPaye > 0) return false;

    if (search.trim() === '') return true;
    const q = search.toLowerCase();
    return (
      s.nom.toLowerCase().includes(q) ||
      s.prenom.toLowerCase().includes(q) ||
      s.matricule.toLowerCase().includes(q) ||
      (s.telephoneParent && s.telephoneParent.includes(q)) ||
      (s.nomParent && s.nomParent.toLowerCase().includes(q))
    );
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim() || !newPrenom.trim() || !newTelephoneParent.trim()) {
      alert('Veuillez remplir les informations obligatoires.');
      return;
    }

    SchoolStore.addStudent({
      nom: newNom.trim().toUpperCase(),
      prenom: newPrenom.trim(),
      dateNaissance: newDateNaissance,
      classe: newClasse,
      anneeScolaire: CURRENT_SCHOOL_YEAR,
      scolariteTotale: Number(newScolarite),
      nomParent: newNomParent.trim() || 'Parent',
      telephoneParent: newTelephoneParent.trim(),
      adresse: newAdresse.trim(),
      etablissementOrigine: newEtablissementOrigine.trim() || undefined,
      decisionBulletin: newDecisionBulletin,
      moyenneAnnuelle: Number(newMoyenneAnnuelle) || undefined,
      motifVenue: newMotifVenue,
      descriptionVenue: newDescriptionVenue.trim() || undefined,
      montantDonTotal: Number(newMontantDon) || 0,
      statutReinscription: 'REINSCRIT',
    });

    setIsAddModalOpen(false);
    // Reset form
    setNewNom('');
    setNewPrenom('');
    setNewNomParent('');
    setNewTelephoneParent('');
    setNewEtablissementOrigine('');
    setNewDescriptionVenue('');
    onStudentsChanged();
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    SchoolStore.updateStudent(editingStudent);
    setEditingStudent(null);
    onStudentsChanged();
  };

  const handleDeleteConfirm = () => {
    if (!studentToDelete) return;
    SchoolStore.deleteStudent(studentToDelete.id);
    setStudentToDelete(null);
    onStudentsChanged();
  };

  const pendingReenrollCount = students.filter(
    (s) => s.statutReinscription === 'EN_ATTENTE_REINSCRIPTION'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-slate-900">
              Base des Élèves & Effectifs ({students.length})
            </h2>
            {pendingReenrollCount > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                {pendingReenrollCount} en attente de réinscription
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Gestion des effectifs pour l'année scolaire <strong>{CURRENT_SCHOOL_YEAR}</strong>, import massif Excel/CSV des anciens élèves et suivi du recouvrement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Bulk Import Button */}
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importer en Masse (Excel / CSV)</span>
          </button>

          {/* Add Student Button */}
          <button
            onClick={() => {
              handleClassChange('6ème');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscrire un Élève</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, matricule, parent..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Year Filter */}
        <div className="sm:col-span-3 flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Session:</span>
          <select
            value={anneeFilter}
            onChange={(e) => setAnneeFilter(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="ALL">Toutes les sessions</option>
            <option value={CURRENT_SCHOOL_YEAR}>Inscrits {CURRENT_SCHOOL_YEAR}</option>
            <option value="EN_ATTENTE">En attente réinscription</option>
            <option value={PREVIOUS_SCHOOL_YEAR}>Historique {PREVIOUS_SCHOOL_YEAR}</option>
          </select>
        </div>

        {/* Class Filter */}
        <div className="sm:col-span-3 flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Classe:</span>
          <select
            value={classeFilter}
            onChange={(e) => setClasseFilter(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {classesList.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'Toutes les classes' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-2 flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Solde:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SOLDE' | 'PARTIEL' | 'IMPAYE')}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="ALL">Tous</option>
            <option value="SOLDE">Soldés (100%)</option>
            <option value="PARTIEL">Partiels</option>
            <option value="IMPAYE">Impayés (0%)</option>
          </select>
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>Aucun élève ne correspond à vos filtres.</p>
            <p className="text-[11px] text-slate-400">
              Astuce : Cliquez sur « Importer en Masse » pour insérer la liste 2026-2027 depuis un fichier CSV ou Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Nom & Prénom</th>
                  <th className="py-3 px-4">Classe & Session</th>
                  <th className="py-3 px-4">Statut Fin Année</th>
                  <th className="py-3 px-4">Parent & Contact</th>
                  <th className="py-3 px-4 text-right">Scolarité Totale</th>
                  <th className="py-3 px-4 text-right">Déjà Versé</th>
                  <th className="py-3 px-4 text-right">Reste à Payer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
                  const isSold = reste === 0;
                  const isAwaiting = s.statutReinscription === 'EN_ATTENTE_REINSCRIPTION';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {s.matricule}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {s.prenom} {s.nom}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {s.classePrecedente ? `Ex: ${s.classePrecedente}` : `Inscrit le ${s.dateInscription}`}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {s.classe}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {s.anneeScolaire || CURRENT_SCHOOL_YEAR}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isAwaiting ? (
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              À réinscrire {CURRENT_SCHOOL_YEAR}
                            </span>
                            {s.statutFinAnnee && (
                              <span className="text-[10px] text-slate-500 block">
                                {s.statutFinAnnee === 'REDOUBLANT' ? 'Redoublant' : 'Passant'} {s.moyenneAnnuelle ? `(${s.moyenneAnnuelle}/20)` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900">
                            Inscrit {CURRENT_SCHOOL_YEAR} ✓
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{s.nomParent}</span>
                        <span className="font-mono text-slate-500 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.telephoneParent}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                        {s.scolariteTotale.toLocaleString('fr-FR')} F
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {s.montantPaye.toLocaleString('fr-FR')} F
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isSold ? (
                          <span className="text-emerald-700 text-[11px] font-semibold">Soldé ✓</span>
                        ) : (
                          <span className="text-amber-700">{reste.toLocaleString('fr-FR')} F</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Re-enroll button if waiting */}
                          {isAwaiting && (
                            <button
                              onClick={() => setStudentToReenroll(s)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                              title="Valider la réinscription 2027-2028"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Réinscrire</span>
                            </button>
                          )}

                          {/* Cash Desk button */}
                          <button
                            onClick={() => onGoToCashDesk(s.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Encaisser en espèces au guichet"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => setEditingStudent({ ...s })}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Modifier les informations"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete / Radier button */}
                          <button
                            onClick={() => setStudentToDelete(s)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Radier / Retirer de la base"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: BULK CSV/EXCEL IMPORT */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportCompleted={() => {
          onStudentsChanged();
        }}
      />

      {/* MODAL: RE-ENROLLMENT FOR IMPORTED STUDENT */}
      {studentToReenroll && (
        <ReenrollmentModal
          isOpen={Boolean(studentToReenroll)}
          onClose={() => setStudentToReenroll(null)}
          student={studentToReenroll}
          onReenrolled={() => {
            onStudentsChanged();
          }}
        />
      )}

      {/* MODAL: ADD NEW STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-700" />
                Inscrire un Élève (Session {CURRENT_SCHOOL_YEAR})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    placeholder="Ex: OUÉDRAOGO"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    value={newPrenom}
                    onChange={(e) => setNewPrenom(e.target.value)}
                    placeholder="Ex: Alassane"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classe *</label>
                  <select
                    value={newClasse}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {classesList.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scolarité totale exigible (FCFA) *</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={newScolarite}
                    onChange={(e) => setNewScolarite(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom du Parent / Tuteur *</label>
                  <input
                    type="text"
                    required
                    value={newNomParent}
                    onChange={(e) => setNewNomParent(e.target.value)}
                    placeholder="Ex: M. Jean Ouédraogo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone Parent *</label>
                  <input
                    type="tel"
                    required
                    value={newTelephoneParent}
                    onChange={(e) => setNewTelephoneParent(e.target.value)}
                    placeholder="Ex: 70 12 34 56"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quartier / Adresse</label>
                <input
                  type="text"
                  value={newAdresse}
                  onChange={(e) => setNewAdresse(e.target.value)}
                  placeholder="Ex: Somgandé, Ouagadougou"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Paramètres Scolaires & Bulletin du 3ème Trimestre */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="font-bold text-slate-800 text-[11px] block border-b border-slate-200 pb-1">
                  Bulletin du 3ème Trimestre & Motif d'arrivée
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Décision Bulletin 3ème T *</label>
                    <select
                      value={newDecisionBulletin}
                      onChange={(e) => setNewDecisionBulletin(e.target.value as 'PASSAGE' | 'REDOUBLEMENT' | 'NOUVEAU_CYCLE')}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none bg-white text-xs"
                    >
                      <option value="PASSAGE">Admis (Passage en classe sup.)</option>
                      <option value="REDOUBLEMENT">Non admis (Redoublement)</option>
                      <option value="NOUVEAU_CYCLE">Nouveau cycle (Maternelle/CP1)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Moyenne 3ème T (/20)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newMoyenneAnnuelle}
                      onChange={(e) => setNewMoyenneAnnuelle(e.target.value)}
                      placeholder="Ex: 13.50"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">École d'origine (si transfert)</label>
                    <input
                      type="text"
                      value={newEtablissementOrigine}
                      onChange={(e) => setNewEtablissementOrigine(e.target.value)}
                      placeholder="Ex: Lycée Saint-Joseph"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Motif principal</label>
                    <select
                      value={newMotifVenue}
                      onChange={(e) => setNewMotifVenue(e.target.value as 'DEMENAGEMENT' | 'EXCLUSION_PROBLEME' | 'RAPPROCHEMENT' | 'EXCELLENCE' | 'AUTRE')}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none bg-white text-xs"
                    >
                      <option value="DEMENAGEMENT">Déménagement / Mutation</option>
                      <option value="EXCLUSION_PROBLEME">Envoyé / Problème ancien lycée</option>
                      <option value="RAPPROCHEMENT">Rapprochement domicile</option>
                      <option value="EXCELLENCE">Recherche d'excellence</option>
                      <option value="AUTRE">Autre raison</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Circonstances de venue</label>
                  <input
                    type="text"
                    value={newDescriptionVenue}
                    onChange={(e) => setNewDescriptionVenue(e.target.value)}
                    placeholder="Ex: La famille a emménagé dans le secteur..."
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-950 mb-1">Don apporté lors de l'inscription (FCFA)</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={newMontantDon}
                    onChange={(e) => setNewMontantDon(Number(e.target.value) || 0)}
                    placeholder="Ex: 5000"
                    className="w-full px-2 py-1.5 rounded-lg border border-purple-300 focus:outline-none bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-medium rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                >
                  Enregistrer l'élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-700" />
                Modifier la Fiche Élève : {editingStudent.matricule}
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nom}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.prenom}
                    onChange={(e) => setEditingStudent({ ...editingStudent, prenom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classe</label>
                  <select
                    value={editingStudent.classe}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classe: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {classesList.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scolarité totale (FCFA)</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={editingStudent.scolariteTotale}
                    onChange={(e) => setEditingStudent({ ...editingStudent, scolariteTotale: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent titulaire</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nomParent}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nomParent: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone parent</label>
                  <input
                    type="tel"
                    required
                    value={editingStudent.telephoneParent}
                    onChange={(e) => setEditingStudent({ ...editingStudent, telephoneParent: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 font-medium rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE / RADIER CONFIRMATION */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-sm">
                Confirmer la radiation de l'élève ?
              </h3>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Êtes-vous sûr de vouloir retirer <strong className="text-slate-900">{studentToDelete.prenom} {studentToDelete.nom}</strong> ({studentToDelete.matricule} - {studentToDelete.classe}) de la base de données de l'école ?
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Montant déjà versé :</span>
                <span className="font-mono font-bold text-emerald-800">{studentToDelete.montantPaye.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Solde restant :</span>
                <span className="font-mono font-bold text-amber-800">
                  {Math.max(0, studentToDelete.scolariteTotale - studentToDelete.montantPaye).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 font-medium rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
              >
                Confirmer la radiation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
