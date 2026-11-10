import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Clock,
  User,
  Phone,
  Coins
} from 'lucide-react';
import { Student, TuitionTariff } from '../../types';
import { SchoolStore, CURRENT_SCHOOL_YEAR } from '../../services/store';

interface ReenrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onReenrolled: (updatedStudent: Student) => void;
}

export const ReenrollmentModal: React.FC<ReenrollmentModalProps> = ({
  isOpen,
  onClose,
  student,
  onReenrolled,
}) => {
  const tarifs = SchoolStore.getTarifs(CURRENT_SCHOOL_YEAR);

  // Suggested next class
  const defaultTargetClass = SchoolStore.calculerClasseSuivante(
    student.classePrecedente || student.classe,
    student.statutFinAnnee || 'PASSANT'
  );

  const [targetClass, setTargetClass] = useState<string>(defaultTargetClass);
  const [telephoneParent, setTelephoneParent] = useState<string>(student.telephoneParent || '');
  const [nomParent, setNomParent] = useState<string>(student.nomParent || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Selected class tariff
  const currentTariff = SchoolStore.getTarifForClass(targetClass, CURRENT_SCHOOL_YEAR);
  const totalScolarite = currentTariff ? currentTariff.totalExigible : 200000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updated = SchoolStore.reenrollStudent(student.id, targetClass, totalScolarite, {
      telephoneParent,
      nomParent,
    });

    setIsSubmitting(false);
    if (updated) {
      onReenrolled(updated);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Réinscription Année {CURRENT_SCHOOL_YEAR}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded font-mono">
                  Élève Reconduit
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Lycée Excellence & Avenir · Dossier scolaire retrouvé
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Previous Year Academic Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Matricule officiel :</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
                {student.matricule}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Identité élève :</span>
              <span className="font-bold text-slate-900">{student.prenom} {student.nom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Classe précédente (2026-2027) :</span>
              <span className="font-semibold text-slate-700">{student.classePrecedente || student.classe}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
              <span className="text-slate-500">Décision conseil de classe :</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                student.statutFinAnnee === 'REDOUBLANT'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {student.statutFinAnnee === 'REDOUBLANT' ? 'Redoublement' : 'Passant(e) en classe supérieure'}
                {student.moyenneAnnuelle ? ` (Moyenne: ${student.moyenneAnnuelle}/20)` : ''}
              </span>
            </div>
          </div>

          {/* New Class Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Confirmez la classe pour l'année {CURRENT_SCHOOL_YEAR} *
            </label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              required
            >
              {tarifs.map((t) => (
                <option key={t.id} value={t.niveau}>
                  {t.niveau} — {t.totalExigible.toLocaleString('fr-FR')} FCFA ({t.montantScolarite.toLocaleString('fr-FR')} F scolarité + {t.fraisInscription.toLocaleString('fr-FR')} F frais)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              La classe proposée par défaut découle automatiquement du statut de fin d'année.
            </p>
          </div>

          {/* Tuition Breakdown Card for 2027-2028 */}
          {currentTariff && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-700" />
                  Total exigible pour {CURRENT_SCHOOL_YEAR} :
                </span>
                <span className="font-mono text-sm text-emerald-700">
                  {currentTariff.totalExigible.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 space-y-0.5 pt-1 border-t border-emerald-200/60 font-mono">
                <div className="flex justify-between">
                  <span>• Frais de scolarité :</span>
                  <span>{currentTariff.montantScolarite.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between">
                  <span>• Frais d'inscription / réinscription :</span>
                  <span>{currentTariff.fraisInscription.toLocaleString('fr-FR')} F</span>
                </div>
                {currentTariff.fraisAnnexes > 0 && (
                  <div className="flex justify-between">
                    <span>• Frais annexes (tenue, APE, etc.) :</span>
                    <span>{currentTariff.fraisAnnexes.toLocaleString('fr-FR')} F</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parent Info Update */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nom du Parent / Responsable *
              </label>
              <input
                type="text"
                required
                value={nomParent}
                onChange={(e) => setNomParent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Téléphone de contact *
              </label>
              <input
                type="tel"
                required
                value={telephoneParent}
                onChange={(e) => setTelephoneParent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valider la Réinscription {CURRENT_SCHOOL_YEAR}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
