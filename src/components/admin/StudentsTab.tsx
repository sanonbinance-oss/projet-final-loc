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
  Check
} from 'lucide-react';
import { Student } from '../../types';
import { SchoolStore } from '../../services/store';

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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // New Student Form State
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newDateNaissance, setNewDateNaissance] = useState('2017-05-10');
  const [newClasse, setNewClasse] = useState('CP1');
  const [newScolarite, setNewScolarite] = useState(160000);
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
    'CP1',
    'CP2',
    'CE1',
    'CE2',
    'CM1',
    'CM2',
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    'Seconde',
    'Première',
    'Terminale',
  ];

  const filtered = students.filter((s) => {
    if (classeFilter !== 'ALL' && s.classe !== classeFilter) return false;
    
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
      s.telephoneParent.includes(q) ||
      s.nomParent.toLowerCase().includes(q) ||
      (s.etablissementOrigine && s.etablissementOrigine.toLowerCase().includes(q))
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Base de Données des Élèves ({students.length})
          </h2>
          <p className="text-xs text-slate-500">
            Consultez les effectifs, ajustez les montants de scolarité, ajoutez de nouveaux élèves ou radiez des dossiers.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inscrire un Nouvel Élève</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        {/* Search */}
        <div className="sm:col-span-5 relative">
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

        {/* Class Filter */}
        <div className="sm:col-span-4 flex items-center gap-2">
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
        <div className="sm:col-span-3 flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Solde:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SOLDE' | 'PARTIEL' | 'IMPAYE')}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SOLDE">Soldés (100%)</option>
            <option value="PARTIEL">Partiellement payés</option>
            <option value="IMPAYE">Impayés (0%)</option>
          </select>
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Aucun élève ne correspond à votre recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Nom & Prénom</th>
                  <th className="py-3 px-4">Classe</th>
                  <th className="py-3 px-4">Parent & Téléphone</th>
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

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {s.matricule}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {s.prenom} {s.nom}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Inscrit le {s.dateInscription}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {s.classe}
                        </span>
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

      {/* MODAL 1: ADD NEW STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-700" />
                Ajouter un Nouvel Élève au Registre
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    onChange={(e) => setNewClasse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {classesList.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scolarité totale (FCFA) *</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={newScolarite}
                    onChange={(e) => setNewScolarite(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
                    placeholder="Ex: La famille a emménagé à Dassasgho ou envoyé pour suivi..."
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

      {/* MODAL 2: EDIT STUDENT */}
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
                  Sauvegarder les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE / RADIER CONFIRMATION */}
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
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
