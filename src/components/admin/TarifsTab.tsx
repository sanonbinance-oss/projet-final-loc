import React, { useState } from 'react';
import { 
  Coins, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  HelpCircle,
  TrendingUp,
  GraduationCap,
  Calendar,
  X,
  Wrench,
  BookOpen,
  CloudCheck
} from 'lucide-react';
import { TuitionTariff } from '../../types';
import { SchoolStore, CURRENT_SCHOOL_YEAR, PREVIOUS_SCHOOL_YEAR, DEFAULT_TARIFS_2027_2028 } from '../../services/store';
import { SUPABASE_PROJECT_ID } from '../../services/supabaseClient';

export const TarifsTab: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>(CURRENT_SCHOOL_YEAR);
  const [tarifs, setTarifs] = useState<TuitionTariff[]>(() => SchoolStore.getTarifs(selectedYear));
  const [editingTariff, setEditingTariff] = useState<TuitionTariff | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'ALL' | 'COLLEGE' | 'GENERAL' | 'TECHNIQUE'>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Form state for adding/editing a tariff
  const [formData, setFormData] = useState({
    niveau: '',
    montantScolarite: 160000,
    fraisInscription: 25000,
    fraisAnnexes: 15000,
  });

  const refreshTarifs = (year: string) => {
    setTarifs(SchoolStore.getTarifs(year));
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    refreshTarifs(year);
  };

  const handleOpenEdit = (tariff: TuitionTariff) => {
    setEditingTariff(tariff);
    setFormData({
      niveau: tariff.niveau,
      montantScolarite: tariff.montantScolarite,
      fraisInscription: tariff.fraisInscription,
      fraisAnnexes: tariff.fraisAnnexes,
    });
  };

  const handleOpenNew = () => {
    setEditingTariff(null);
    setFormData({
      niveau: '',
      montantScolarite: 200000,
      fraisInscription: 35000,
      fraisAnnexes: 25000,
    });
    setIsNewModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.niveau) return;

    if (editingTariff) {
      SchoolStore.updateTariff({
        ...editingTariff,
        niveau: formData.niveau,
        montantScolarite: Number(formData.montantScolarite) || 0,
        fraisInscription: Number(formData.fraisInscription) || 0,
        fraisAnnexes: Number(formData.fraisAnnexes) || 0,
      });
      setNotification(`Tarif pour « ${formData.niveau} » mis à jour et synchronisé avec Supabase.`);
    } else {
      SchoolStore.addTariff({
        anneeScolaire: selectedYear,
        niveau: formData.niveau,
        montantScolarite: Number(formData.montantScolarite) || 0,
        fraisInscription: Number(formData.fraisInscription) || 0,
        fraisAnnexes: Number(formData.fraisAnnexes) || 0,
      });
      setNotification(`Nouveau tarif pour « ${formData.niveau} » ajouté avec succès.`);
    }

    setEditingTariff(null);
    setIsNewModalOpen(false);
    refreshTarifs(selectedYear);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDelete = (id: string, niveau: string) => {
    if (confirm(`Supprimer définitivement la grille tarifaire pour la classe ${niveau} ?`)) {
      SchoolStore.deleteTariff(id);
      refreshTarifs(selectedYear);
      setNotification(`Tarif ${niveau} supprimé.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResetDefaults = () => {
    if (confirm(`Restaurer la grille complète officielle (Collège, Lycée Général et Technique) pour la session ${selectedYear} ?`)) {
      SchoolStore.saveTarifs(DEFAULT_TARIFS_2027_2028);
      refreshTarifs(selectedYear);
      setNotification('Grille officielle complète (Collège & Technique) restaurée.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Filter by cycle
  const filteredTarifs = tarifs.filter((t) => {
    const niv = t.niveau.toLowerCase();
    const isCollege = niv.includes('6ème') || niv.includes('5ème') || niv.includes('4ème') || niv.includes('3ème');
    const isTechnique = niv.includes('bep') || niv.includes('bac pro') || niv === "c'" || niv === "d'";
    const isGeneral = (niv.includes('2nde') || niv.includes('1ère') || niv.includes('tle')) && !isTechnique;

    if (cycleFilter === 'COLLEGE') return isCollege;
    if (cycleFilter === 'GENERAL') return isGeneral;
    if (cycleFilter === 'TECHNIQUE') return isTechnique;
    return true;
  });

  const totalClasses = tarifs.length;
  const averageScolarite = totalClasses > 0
    ? Math.round(tarifs.reduce((acc, t) => acc + t.totalExigible, 0) / totalClasses)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Paramétrage Institutionnel
            </span>
            <span className="text-xs text-slate-500 font-medium">Session active :</span>
            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {selectedYear}
            </span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase : {SUPABASE_PROJECT_ID}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Gestion des Tarifs de Scolarité (Collège, Lycée & Technique)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Ajustez les montants pour l'enseignement général et les filières techniques (Bac Pro 1 & 2, BEP 1 & 2, C', D'). Les modifications sont instantanément appliquées au portail parent et au guichet.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Academic Year Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs">
            <button
              onClick={() => handleYearChange(CURRENT_SCHOOL_YEAR)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedYear === CURRENT_SCHOOL_YEAR
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {CURRENT_SCHOOL_YEAR} (Actif)
            </button>
            <button
              onClick={() => handleYearChange(PREVIOUS_SCHOOL_YEAR)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedYear === PREVIOUS_SCHOOL_YEAR
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {PREVIOUS_SCHOOL_YEAR}
            </button>
          </div>

          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Classe</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            Fermer
          </button>
        </div>
      )}

      {/* Cycle Filter Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCycleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              cycleFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Toutes les séries ({tarifs.length})
          </button>
          <button
            onClick={() => setCycleFilter('COLLEGE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              cycleFilter === 'COLLEGE'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Collège (6ème - 3ème)</span>
          </button>
          <button
            onClick={() => setCycleFilter('GENERAL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              cycleFilter === 'GENERAL'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Lycée Général (2nde A/C - Tle A/D)</span>
          </button>
          <button
            onClick={() => setCycleFilter('TECHNIQUE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              cycleFilter === 'TECHNIQUE'
                ? 'bg-purple-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-300" />
            <span>Technique (Bac Pro, BEP, C', D')</span>
          </button>
        </div>

        <button
          onClick={handleResetDefaults}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
          title="Restaurer l'ensemble des grilles Collège, Général et Technique"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurer la Grille Complète</span>
        </button>
      </div>

      {/* Tariffs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-700" />
            <span>Grille Officielle des Frais · Session {selectedYear}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {filteredTarifs.length} classe(s) affichée(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Cycle / Filière</th>
                <th className="py-3 px-4">Niveau / Classe</th>
                <th className="py-3 px-4">Scolarité Nette</th>
                <th className="py-3 px-4">Frais Inscription</th>
                <th className="py-3 px-4">Frais Annexes / Atelier</th>
                <th className="py-3 px-4 text-right">Total Annuel Exigible</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTarifs.map((t) => {
                const niv = t.niveau.toLowerCase();
                const isTech = niv.includes('bep') || niv.includes('bac pro') || niv === "c'" || niv === "d'";
                const isCollege = niv.includes('6ème') || niv.includes('5ème') || niv.includes('4ème') || niv.includes('3ème');

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[11px] text-slate-500">
                      {isTech ? (
                        <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-200">
                          <Wrench className="w-3 h-3" />
                          Technique / Pro
                        </span>
                      ) : isCollege ? (
                        <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-bold border border-blue-200">
                          <BookOpen className="w-3 h-3" />
                          Collège
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                          <GraduationCap className="w-3 h-3" />
                          Lycée Général
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {t.niveau}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {t.montantScolarite.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {t.fraisInscription > 0 ? `${t.fraisInscription.toLocaleString('fr-FR')} FCFA` : '0 F'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {t.fraisAnnexes > 0 ? `${t.fraisAnnexes.toLocaleString('fr-FR')} FCFA` : 'Néant'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-emerald-800">
                      {t.totalExigible.toLocaleString('fr-FR')} FCFA
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier le montant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.niveau)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {(isNewModalOpen || editingTariff) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingTariff ? `Modifier le Tarif : ${editingTariff.niveau}` : `Ajouter une Classe (${selectedYear})`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingTariff(null);
                  setIsNewModalOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Niveau / Classe (Général ou Technique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bac Pro 1, BEP 2, C', D', 3ème..."
                  value={formData.niveau}
                  onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Montant net scolarité (FCFA) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={formData.montantScolarite}
                  onChange={(e) => setFormData({ ...formData, montantScolarite: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Frais d'inscription (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.fraisInscription}
                    onChange={(e) => setFormData({ ...formData, fraisInscription: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Frais annexes / Atelier
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.fraisAnnexes}
                    onChange={(e) => setFormData({ ...formData, fraisAnnexes: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Live Total preview */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <span className="font-semibold text-emerald-950">Total exigible :</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {(
                    Number(formData.montantScolarite || 0) +
                    Number(formData.fraisInscription || 0) +
                    Number(formData.fraisAnnexes || 0)
                  ).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTariff(null);
                    setIsNewModalOpen(false);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white font-bold bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-sm cursor-pointer transition-colors"
                >
                  Enregistrer & Synchroniser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
