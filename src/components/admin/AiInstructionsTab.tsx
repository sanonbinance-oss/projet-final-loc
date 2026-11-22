import React, { useEffect, useState } from 'react';
import {
  Bot,
  Plus,
  RefreshCw,
  Trash2,
  Power,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { AiInstruction, AiInstructionCategory, StaffSession } from '../../types';
import { SupabaseSyncService } from '../../services/supabaseClient';

interface AiInstructionsTabProps {
  staffSession: StaffSession | null;
}

const CATEGORY_LABELS: Record<AiInstructionCategory, string> = {
  TARIF: 'Tarif / Frais',
  PROGRAMME: 'Programme / Filière',
  PROCEDURE: 'Procédure / Règle',
  URGENT: 'Annonce Urgente',
  INFO: 'Information Générale',
};

const CATEGORY_COLORS: Record<AiInstructionCategory, string> = {
  TARIF: 'bg-amber-100 text-amber-900 border-amber-200',
  PROGRAMME: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  PROCEDURE: 'bg-blue-100 text-blue-900 border-blue-200',
  URGENT: 'bg-rose-100 text-rose-900 border-rose-200',
  INFO: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};

const QUICK_TEMPLATES: Array<{
  label: string;
  categorie: AiInstructionCategory;
  titre: string;
  contenu: string;
}> = [
  {
    label: 'Nouveau tarif / remise',
    categorie: 'TARIF',
    titre: 'Mise à jour tarifaire / facilité de paiement',
    contenu:
      'Précisez ici les nouveaux montants ou remises (ex: réduction de 10% pour les familles inscrivant 3 enfants, ou nouveau tarif atelier technique).',
  },
  {
    label: 'Nouveau programme / filière',
    categorie: 'PROGRAMME',
    titre: 'Ouverture nouveau programme scolaire',
    contenu:
      "Indiquez le nouveau programme, l'horaire ou la filière ouverte aux inscriptions cette année et les conditions d'accès.",
  },
  {
    label: 'Nouvelle règle / date limite',
    categorie: 'URGENT',
    titre: 'Date limite et consigne importante',
    contenu:
      'Exemple : la date limite de dépôt des bulletins pour les demandes de transfert est prolongée jusqu’au 30 septembre.',
  },
];

export const AiInstructionsTab: React.FC<AiInstructionsTabProps> = ({ staffSession }) => {
  const [instructions, setInstructions] = useState<AiInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<AiInstructionCategory>('INFO');
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [estActif, setEstActif] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canEdit = staffSession?.staffRole !== 'CAISSIER';

  const loadInstructions = async () => {
    setLoading(true);
    setError('');
    const res = await SupabaseSyncService.listAiInstructionsForStaff();
    setLoading(false);
    if (res.ok && res.instructions) {
      setInstructions(res.instructions);
    } else {
      setError(res.error || 'Impossible de charger les instructions.');
    }
  };

  useEffect(() => {
    void loadInstructions();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCategorie('INFO');
    setTitre('');
    setContenu('');
    setEstActif(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || saving) return;
    setError('');
    setFeedback('');

    if (titre.trim().length < 2 || contenu.trim().length < 3) {
      setError('Veuillez renseigner un titre et le texte de la consigne.');
      return;
    }

    setSaving(true);
    const res = await SupabaseSyncService.saveAiInstruction({
      id: editingId || undefined,
      categorie,
      titre: titre.trim(),
      contenu: contenu.trim(),
      estActif,
    });
    setSaving(false);

    if (res.ok) {
      setFeedback(
        editingId
          ? "Consigne mise à jour : l'Assistant IA des parents l'utilise déjà en direct."
          : "Nouvelle consigne publiée : l'Assistant IA des parents y a accès immédiatement."
      );
      resetForm();
      void loadInstructions();
    } else {
      setError(res.error || 'Enregistrement impossible.');
    }
  };

  const handleEdit = (item: AiInstruction) => {
    setEditingId(item.id);
    setCategorie(item.categorie);
    setTitre(item.titre);
    setContenu(item.contenu);
    setEstActif(item.estActif);
    setFeedback('');
    setError('');
  };

  const handleToggle = async (item: AiInstruction) => {
    if (!canEdit) return;
    setError('');
    setFeedback('');
    const res = await SupabaseSyncService.toggleAiInstruction(item.id, !item.estActif);
    if (res.ok) {
      setFeedback(
        !item.estActif
          ? `Consigne « ${item.titre} » activée pour l'Assistant IA.`
          : `Consigne « ${item.titre} » mise en pause.`
      );
      void loadInstructions();
    } else {
      setError(res.error || 'Action impossible.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    setError('');
    setFeedback('');
    const res = await SupabaseSyncService.deleteAiInstruction(id);
    setConfirmDeleteId(null);
    if (res.ok) {
      setFeedback('Consigne supprimée.');
      if (editingId === id) resetForm();
      void loadInstructions();
    } else {
      setError(res.error || 'Suppression impossible.');
    }
  };

  const activeCount = instructions.filter((i) => i.estActif).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pré-instructions & Annonces pour l'Assistant IA Parents
            </h2>
            <p className="text-xs text-slate-500">
              Toute information activée ici ({activeCount} active{activeCount > 1 ? 's' : ''}) est transmise immédiatement à l'IA quand un parent pose une question.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadInstructions()}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>{editingId ? 'Modifier une consigne IA' : 'Publier une nouvelle information'}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Annuler l'édition
              </button>
            )}
          </div>

          {!editingId && canEdit && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Modèles rapides :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      setCategorie(tpl.categorie);
                      setTitre(tpl.titre);
                      setContenu(tpl.contenu);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-semibold border border-slate-200 cursor-pointer transition-colors"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catégorie *
              </label>
              <select
                value={categorie}
                disabled={!canEdit}
                onChange={(e) => setCategorie(e.target.value as AiInstructionCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="INFO">Information Générale</option>
                <option value="TARIF">Tarif / Frais de Scolarité</option>
                <option value="PROGRAMME">Nouveau Programme / Filière</option>
                <option value="PROCEDURE">Procédure / Dossier</option>
                <option value="URGENT">Annonce Urgente / Date limite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titre court de l'information *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex: Ouverture filière Informatique / Remise fratrie"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contenu précis à communiquer aux parents *
              </label>
              <textarea
                rows={4}
                required
                disabled={!canEdit}
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                placeholder="Ex: À compter d'aujourd'hui, la scolarité en Bac Pro inclut les tenues d'atelier. Le dépôt des extraits de naissance reste ouvert jusqu'au..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={estActif}
                disabled={!canEdit}
                onChange={(e) => setEstActif(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>Activer immédiatement dans les réponses de l'IA</span>
            </label>

            {canEdit ? (
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {saving
                    ? 'Enregistrement...'
                    : editingId
                    ? 'Mettre à jour la consigne IA'
                    : "Publier pour l'Assistant IA"}
                </span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Lecture seule pour le profil Caissier. Seuls la Direction et le Secrétariat peuvent publier des instructions IA.
              </p>
            )}
          </form>
        </div>

        {/* Right: List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-700" />
              <span>Instructions enregistrées ({instructions.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Chargement des instructions...</div>
          ) : instructions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Aucune consigne personnalisée publiée pour l'instant.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Ajoutez une nouveauté, un changement de tarif ou un programme ci-contre : l'Assistant IA des parents l'intégrera dans ses réponses dès la seconde suivante.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {instructions.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          CATEGORY_COLORS[item.categorie] || CATEGORY_COLORS.INFO
                        }`}
                      >
                        {CATEGORY_LABELS[item.categorie] || item.categorie}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.estActif
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.estActif ? 'Active en direct' : 'En pause'}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(item.dateModification).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{item.titre}</h4>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                      {item.contenu}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Publié par : {item.auteur}</p>
                  </div>

                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleToggle(item)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer inline-flex items-center gap-1 ${
                          item.estActif
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{item.estActif ? 'Mettre en pause' : 'Activer'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>

                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer inline-flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
