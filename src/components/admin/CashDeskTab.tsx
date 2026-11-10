import React, { useState } from 'react';
import { 
  Banknote, 
  Search, 
  Printer, 
  CheckCircle, 
  User, 
  Phone, 
  FileText, 
  AlertCircle,
  Receipt,
  HeartHandshake,
  FileCheck,
  School,
  FileSpreadsheet
} from 'lucide-react';
import { Payment, Student } from '../../types';
import { SchoolStore } from '../../services/store';
import { PaymentService } from '../../services/paymentService';

import { ReenrollmentModal } from '../parent/ReenrollmentModal';

interface CashDeskTabProps {
  students: Student[];
  onPaymentRecorded: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment, scolariteTotale: number, montantTotalPaye: number) => void;
  initialSelectedStudentId?: string | null;
}

export const CashDeskTab: React.FC<CashDeskTabProps> = ({
  students,
  onPaymentRecorded,
  onOpenReceipt,
  initialSelectedStudentId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    if (initialSelectedStudentId) {
      return students.find((s) => s.id === initialSelectedStudentId) || students[0] || null;
    }
    return students[0] || null;
  });

  const [montantScolarite, setMontantScolarite] = useState<string>('50000');
  const [montantDon, setMontantDon] = useState<string>('5000');
  const [nomPayeur, setNomPayeur] = useState(selectedStudent?.nomParent || '');
  const [telephonePayeur, setTelephonePayeur] = useState(selectedStudent?.telephoneParent || '');
  const [agentNom, setAgentNom] = useState('Mme Sanfo (Secrétaire Comptable)');
  const [notes, setNotes] = useState('Règlement scolarité + don au guichet');
  const [isReenrollModalOpen, setIsReenrollModalOpen] = useState(false);

  const filteredStudents = searchQuery.trim() === ''
    ? []
    : students.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.nom.toLowerCase().includes(q) ||
          s.prenom.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q)
        );
      });

  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setSearchQuery('');
    setNomPayeur(s.nomParent);
    setTelephonePayeur(s.telephoneParent);

    const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
    if (reste > 0) {
      setMontantScolarite(Math.min(reste, 50000).toString());
    } else {
      setMontantScolarite('0');
    }
  };

  const handleCashPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const numScolarite = Number(montantScolarite) || 0;
    const numDon = Number(montantDon) || 0;

    if (numScolarite <= 0 && numDon <= 0) {
      alert('Veuillez saisir un montant de scolarité ou un don supérieur à 0 FCFA.');
      return;
    }

    const payment = PaymentService.encaisserEspecesAuGuichet({
      studentId: selectedStudent.id,
      studentMatricule: selectedStudent.matricule,
      studentNom: `${selectedStudent.prenom} ${selectedStudent.nom}`,
      studentClasse: selectedStudent.classe,
      montantScolarite: numScolarite,
      montantDon: numDon,
      nomPayeur: nomPayeur || selectedStudent.nomParent,
      telephonePayeur,
      agentNom,
      notes,
    });

    // Save into store
    SchoolStore.addPayment(payment);

    // Refresh student in state
    const updated = SchoolStore.getStudents().find((s) => s.id === selectedStudent.id);
    if (updated) {
      setSelectedStudent(updated);
    }

    onPaymentRecorded(payment);

    // Open receipt modal directly for printing
    if (updated) {
      onOpenReceipt(payment, updated.scolariteTotale, updated.montantPaye);
    }
  };

  const resteAPayer = selectedStudent
    ? Math.max(0, selectedStudent.scolariteTotale - selectedStudent.montantPaye)
    : 0;

  const totalRecuEnMains = (Number(montantScolarite) || 0) + (Number(montantDon) || 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Guichet Caisse : Encaissement Scolarité & Dons
            </h2>
            <p className="text-xs text-slate-500">
              Enregistrez le versement d'un parent en espèces (scolarité, bulletin du 3ème trimestre et dons), et imprimez directement son reçu certifié.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 block">Agent de guichet</span>
          <span className="text-xs font-semibold text-slate-800">{agentNom}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Student Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick search input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Sélectionner l'élève au guichet
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom, matricule ou parent..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Results dropdown */}
            {filteredStudents.length > 0 && (
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className="w-full p-2.5 text-left text-xs hover:bg-emerald-50 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{s.prenom} {s.nom}</p>
                      <p className="text-[11px] text-slate-500">{s.matricule} · {s.classe}</p>
                    </div>
                    <span className="text-emerald-700 font-semibold text-[11px]">Sélectionner</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick picker list or empty state */}
            <div className="pt-2 border-t border-slate-100">
              {students.length > 0 ? (
                <>
                  <span className="text-[11px] text-slate-500 block mb-2">
                    Élèves enregistrés :
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {students.map((s) => {
                      const isSelected = selectedStudent?.id === s.id;
                      const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className={`w-full p-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold">{s.prenom} {s.nom}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {s.classe} · {s.matricule}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] shrink-0">
                            {reste === 0 ? 'Soldé' : `${reste.toLocaleString('fr-FR')} F`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Aucun élève enregistré dans la base pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* Student Status & Academic Record Card */}
          {selectedStudent && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Dossier Scolaire & Pédagogique
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedStudent.matricule}
                </span>
              </div>

              {/* Re-enrollment callout if imported student */}
              {selectedStudent.statutReinscription === 'EN_ATTENTE_REINSCRIPTION' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 space-y-2">
                  <div className="font-bold flex items-center justify-between">
                    <span>Élève 2026-2027 en attente de réinscription</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Action requise</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Cet élève a été importé. Validez sa nouvelle classe avant d'enregistrer le paiement de sa scolarité.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsReenrollModalOpen(true)}
                    className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg cursor-pointer transition-colors text-center text-xs"
                  >
                    Valider la Réinscription 2027-2028
                  </button>
                </div>
              )}

              {/* Academic decision and 3rd term report card info */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Décision 3ème Trimestre :</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedStudent.decisionBulletin === 'PASSAGE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedStudent.decisionBulletin === 'REDOUBLEMENT'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-blue-100 text-blue-900'
                  }`}>
                    {selectedStudent.decisionBulletin === 'PASSAGE'
                      ? 'Passage en classe supérieure'
                      : selectedStudent.decisionBulletin === 'REDOUBLEMENT'
                      ? 'Redoublement de classe'
                      : 'Nouveau cycle'}
                  </span>
                </div>

                {selectedStudent.moyenneAnnuelle && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Moyenne 3ème trimestre :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedStudent.moyenneAnnuelle} / 20
                    </span>
                  </div>
                )}

                {selectedStudent.etablissementOrigine && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">École d'origine :</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[190px]">
                      {selectedStudent.etablissementOrigine}
                    </span>
                  </div>
                )}

                {selectedStudent.descriptionVenue && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Raison de venue :</span>
                    <p className="text-[11px] text-slate-700 italic">
                      « {selectedStudent.descriptionVenue} »
                    </p>
                  </div>
                )}
              </div>

              {/* Financial balances */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 text-[10px] block">Scolarité totale</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    {selectedStudent.scolariteTotale.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <span className="text-emerald-700 text-[10px] block">Déjà versé</span>
                  <span className="font-mono font-bold text-emerald-800 text-[11px]">
                    {selectedStudent.montantPaye.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl">
                  <span className="text-amber-700 text-[10px] block">Reste à payer</span>
                  <span className="font-mono font-bold text-amber-800 text-[11px]">
                    {resteAPayer.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cash Deposit Form with Donation */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  2. Enregistrement des Espèces
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Encaissement Scolarité & Dons
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Règlement Direct Guichet</span>
              </span>
            </div>

            {selectedStudent ? (
              <form onSubmit={handleCashPayment} className="space-y-4">
                {/* 1. Part Scolarité */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Montant versé pour la Scolarité (FCFA) *
                    </label>
                    <span className="text-xs text-slate-500">
                      Reste scolarité : <strong className="text-amber-700 font-mono">{resteAPayer.toLocaleString('fr-FR')} FCFA</strong>
                    </span>
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[20000, 30000, 50000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMontantScolarite(val.toString())}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          montantScolarite === val.toString()
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {val.toLocaleString('fr-FR')} F
                      </button>
                    ))}
                    {resteAPayer > 0 && (
                      <button
                        type="button"
                        onClick={() => setMontantScolarite(resteAPayer.toString())}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          montantScolarite === resteAPayer.toString()
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        Solder scolarité ({resteAPayer.toLocaleString('fr-FR')} F)
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      value={montantScolarite}
                      onChange={(e) => setMontantScolarite(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Montant scolarité"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-500 font-mono">
                      FCFA SCOLARITÉ
                    </div>
                  </div>
                </div>

                {/* 2. Part Don & Œuvres scolaires */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-purple-700" />
                      Argent versé pour Don / Soutien (FCFA)
                    </label>
                    <span className="text-[11px] text-purple-700 font-semibold">
                      Cantine & Bibliothèque
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[0, 2000, 5000, 10000].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMontantDon(d.toString())}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border cursor-pointer ${
                          montantDon === d.toString()
                            ? 'bg-purple-800 text-white border-purple-800'
                            : 'bg-white text-purple-900 border-purple-200'
                        }`}
                      >
                        {d === 0 ? '0 F' : `+${d.toLocaleString('fr-FR')} F`}
                      </button>
                    ))}

                    <div className="relative flex-1 min-w-[120px]">
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={montantDon}
                        onChange={(e) => setMontantDon(e.target.value)}
                        placeholder="Don libre"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold text-purple-950 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Global Alert */}
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
                  <span>Total liquide à encaisser en mains :</span>
                  <span className="font-mono font-extrabold text-base text-emerald-400">
                    {totalRecuEnMains.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {/* Payer Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom du déposant (Parent / Tuteur) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomPayeur}
                      onChange={(e) => setNomPayeur(e.target.value)}
                      placeholder="Ex: M. Ouédraogo"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Téléphone du déposant
                    </label>
                    <input
                      type="tel"
                      value={telephonePayeur}
                      onChange={(e) => setTelephonePayeur(e.target.value)}
                      placeholder="Ex: 70 12 34 56"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Cashier Agent & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Agent caissier
                    </label>
                    <input
                      type="text"
                      value={agentNom}
                      onChange={(e) => setAgentNom(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observation sur le versement
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observation caisse..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      Encaisser {totalRecuEnMains.toLocaleString('fr-FR')} FCFA & Imprimer le Reçu Officiel
                    </span>
                  </button>
                  <p className="text-center text-[11px] text-slate-500 mt-2">
                    ✓ La quittance officielle imprimée détaille le montant de scolarité et la part du don.
                  </p>
                </div>
              </form>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Sélectionnez un élève à gauche pour commencer l'encaissement.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedStudent && (
        <ReenrollmentModal
          isOpen={isReenrollModalOpen}
          onClose={() => setIsReenrollModalOpen(false)}
          student={selectedStudent}
          onReenrolled={(updated) => {
            setSelectedStudent(updated);
            const reste = Math.max(0, updated.scolariteTotale - updated.montantPaye);
            if (reste > 0) {
              setMontantScolarite(Math.min(reste, 50000).toString());
            } else {
              setMontantScolarite('0');
            }
          }}
        />
      )}
    </div>
  );
};
