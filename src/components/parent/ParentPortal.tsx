import React, { useState } from 'react';
import { 
  Search, 
  Smartphone, 
  CreditCard, 
  CheckCircle, 
  ShieldCheck, 
  Clock, 
  Receipt, 
  User, 
  BookOpen, 
  ArrowRight, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Printer,
  HeartHandshake
} from 'lucide-react';
import { Payment, PaymentMethod, Student } from '../../types';
import { SchoolStore, DEFAULT_SCHOOL_INFO } from '../../services/store';
import { PaymentService } from '../../services/paymentService';
import { AdmissionForm } from './AdmissionForm';

interface ParentPortalProps {
  students: Student[];
  onPaymentSuccess: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment) => void;
  activeTab: 'paiement' | 'inscription' | 'tarifs' | 'contact';
  setActiveTab: (tab: 'paiement' | 'inscription' | 'tarifs' | 'contact') => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  students,
  onPaymentSuccess,
  onOpenReceipt,
  activeTab,
  setActiveTab,
}) => {
  const school = DEFAULT_SCHOOL_INFO;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    students.length > 0 ? students[0] : null
  );

  // Payment form state
  const [montant, setMontant] = useState<number>(50000);
  const [customMontant, setCustomMontant] = useState<string>('50000');
  const [montantDon, setMontantDon] = useState<number>(0);
  const [operateur, setOperateur] = useState<PaymentMethod>('ORANGE_MONEY');
  const [telephonePayeur, setTelephonePayeur] = useState('70213456');
  const [nomPayeur, setNomPayeur] = useState('Moussa Ouédraogo');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [lastCompletedPayment, setLastCompletedPayment] = useState<Payment | null>(null);

  // Search filter
  const searchResults = searchQuery.trim() === ''
    ? []
    : students.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.nom.toLowerCase().includes(q) ||
          s.prenom.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q) ||
          s.telephoneParent.includes(q)
        );
      });

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setNomPayeur(student.nomParent);
    setTelephonePayeur(student.telephoneParent);
    
    // Default amount to either the remaining or 50,000
    const reste = Math.max(0, student.scolariteTotale - student.montantPaye);
    const defaultVal = reste > 0 ? Math.min(reste, 50000) : 0;
    setMontant(defaultVal);
    setCustomMontant(defaultVal.toString());
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const finalMontant = Number(customMontant) || 0;
    if (finalMontant <= 0 && montantDon <= 0) {
      alert('Veuillez spécifier un montant de scolarité ou un don supérieur à 0 FCFA.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Initialisation du paiement sécurisé...');

    try {
      const paymentResult = await PaymentService.traiterPaiementMobileMoney(
        {
          studentId: selectedStudent.id,
          studentMatricule: selectedStudent.matricule,
          studentNom: `${selectedStudent.prenom} ${selectedStudent.nom}`,
          studentClasse: selectedStudent.classe,
          montantScolarite: finalMontant,
          montantDon,
          operateur,
          telephone: telephonePayeur,
          nomPayeur: nomPayeur || selectedStudent.nomParent,
          notes: montantDon > 0 
            ? `Scolarité (${finalMontant} F) + Don (${montantDon} F) - ${selectedStudent.classe}` 
            : `Règlement scolarité ${selectedStudent.classe}`,
        },
        (step) => setProcessingStep(step)
      );

      // Save to store
      SchoolStore.addPayment(paymentResult);
      setLastCompletedPayment(paymentResult);
      onPaymentSuccess(paymentResult);

      // Refresh selected student data
      const updatedStudent = SchoolStore.getStudents().find(
        (s) => s.id === selectedStudent.id
      );
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Échec du paiement.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const resteAPayer = selectedStudent 
    ? Math.max(0, selectedStudent.scolariteTotale - selectedStudent.montantPaye)
    : 0;

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portail Officiel des Familles · Session 2025-2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 max-w-3xl mx-auto" style={{ textWrap: 'balance' }}>
            Réglez la scolarité de vos enfants en ligne en toute simplicité
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Plus besoin de faire la queue au secrétariat. Payez instantanément par 
            <strong> Orange Money</strong>, <strong>Moov Africa</strong> ou <strong>MTN</strong> et téléchargez votre reçu certifié.
          </p>

          {/* Dual Action Shortcut for parents */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('paiement')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
                activeTab === 'paiement'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Payer une Scolarité
            </button>
            <button
              onClick={() => setActiveTab('inscription')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
                activeTab === 'inscription'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Demande d'Admission
            </button>
            <button
              onClick={() => setActiveTab('tarifs')}
              className={`px-5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                activeTab === 'tarifs'
                  ? 'bg-white text-slate-900'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Grille Tarifaire
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        {/* TAB 1: PAIEMENT SCOLARITE */}
        {activeTab === 'paiement' && (
          <div className="space-y-6">
            {/* Payment success alert if recently paid */}
            {lastCompletedPayment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Paiement de {lastCompletedPayment.montant.toLocaleString('fr-FR')} FCFA validé !
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Réf: <span className="font-mono font-semibold">{lastCompletedPayment.reference}</span> · L'information a été transmise en direct au secrétariat.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenReceipt(lastCompletedPayment)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Voir & Imprimer le Reçu</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Student Selector & Info */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Étape 1 : Identifier l'Élève
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tapez le nom, matricule ou tél..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Search dropdown results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg">
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className="w-full p-2.5 text-left text-xs hover:bg-emerald-50 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{s.prenom} {s.nom}</p>
                            <p className="text-[11px] text-slate-500">
                              Matricule: {s.matricule} · Classe: {s.classe}
                            </p>
                          </div>
                          <span className="text-emerald-700 font-semibold text-[11px]">Choisir</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fast selection list for testing */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 block mb-2">
                      Ou sélectionnez un élève pour essayer rapidement :
                    </span>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {students.slice(0, 5).map((s) => {
                        const isSelected = selectedStudent?.id === s.id;
                        const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
                        return (
                          <button
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold">{s.prenom} {s.nom}</span>
                              <span className="text-slate-500 block text-[11px]">
                                {s.classe} · {s.matricule}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[11px] block">
                                {reste === 0 ? 'Soldé' : `${reste.toLocaleString('fr-FR')} F`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Student Card */}
                {selectedStudent ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Élève Sélectionné
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {selectedStudent.prenom} {selectedStudent.nom}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {selectedStudent.matricule}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Classe :</span>
                        <span className="font-semibold text-slate-800">{selectedStudent.classe}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Année scolaire :</span>
                        <span className="font-semibold text-slate-800">{school.anneeScolaire}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Parent / Tuteur :</span>
                        <span className="font-semibold text-slate-800">{selectedStudent.nomParent}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Téléphone :</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedStudent.telephoneParent}</span>
                      </div>
                    </div>

                    {/* Progress Bar of Tuition */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Progression du règlement :</span>
                        <span className="font-mono font-bold text-slate-900">
                          {Math.round((selectedStudent.montantPaye / selectedStudent.scolariteTotale) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (selectedStudent.montantPaye / selectedStudent.scolariteTotale) * 100
                              )
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-center text-[11px] bg-slate-50 p-2 rounded-xl">
                        <div>
                          <span className="text-slate-500 block">Scolarité totale</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedStudent.scolariteTotale.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Déjà payé</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {selectedStudent.montantPaye.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Reste à régler</span>
                          <span className="font-mono font-bold text-amber-700">
                            {resteAPayer.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-xs">
                    Veuillez sélectionner un élève ci-dessus pour afficher son dossier de scolarité.
                  </div>
                )}
              </div>

              {/* Right Column: Checkout Form (Mobile Money) */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Étape 2 : Règlement Sécurisé
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">
                        Paiement Mobile Money (Burkina Faso)
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Mode Simulation Actif</span>
                    </div>
                  </div>

                  {selectedStudent && resteAPayer === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Scolarité Entièrement Soldée !
                      </h3>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Félicitations, la totalité de la scolarité de <strong>{selectedStudent.prenom} {selectedStudent.nom}</strong> a été réglée pour l'année scolaire en cours.
                      </p>
                      {lastCompletedPayment && (
                        <button
                          onClick={() => onOpenReceipt(lastCompletedPayment)}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white cursor-pointer hover:bg-emerald-600"
                        >
                          Imprimer la Quittance Définitive
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handlePay} className="space-y-5">
                      {/* Operator Selector */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                          1. Choisissez votre opérateur Mobile Money
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* Orange Money */}
                          <button
                            type="button"
                            onClick={() => setOperateur('ORANGE_MONEY')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                              operateur === 'ORANGE_MONEY'
                                ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="inline-block w-4 h-4 rounded-full bg-[#FF7900] shadow-sm"></span>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">Orange Money</span>
                              <span className="text-[10px] text-slate-500 font-mono">*144*4*6#</span>
                            </div>
                          </button>

                          {/* Moov Money */}
                          <button
                            type="button"
                            onClick={() => setOperateur('MOOV_MONEY')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                              operateur === 'MOOV_MONEY'
                                ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="inline-block w-4 h-4 rounded-full bg-[#0070BA] shadow-sm"></span>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">Moov Africa</span>
                              <span className="text-[10px] text-slate-500 font-mono">*555#</span>
                            </div>
                          </button>

                          {/* MTN */}
                          <button
                            type="button"
                            onClick={() => setOperateur('MTN_MONEY')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                              operateur === 'MTN_MONEY'
                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="inline-block w-4 h-4 rounded-full bg-[#FFCC00] shadow-sm"></span>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">MTN MoMo</span>
                              <span className="text-[10px] text-slate-500 font-mono">*133#</span>
                            </div>
                          </button>

                          {/* LigdiCash */}
                          <button
                            type="button"
                            onClick={() => setOperateur('LIGDICASH')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                              operateur === 'LIGDICASH'
                                ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="inline-block w-4 h-4 rounded-full bg-emerald-600 shadow-sm"></span>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">LigdiCash</span>
                              <span className="text-[10px] text-slate-500">Cartes / Wave</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Amount Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            2. Montant à verser (FCFA)
                          </label>
                          {selectedStudent && (
                            <span className="text-[11px] text-slate-500">
                              Reste dû : <strong className="text-slate-800 font-mono">{resteAPayer.toLocaleString('fr-FR')} FCFA</strong>
                            </span>
                          )}
                        </div>

                        {/* Quick preset buttons */}
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {[25000, 50000, 75000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setMontant(preset);
                                setCustomMontant(preset.toString());
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                customMontant === preset.toString()
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {preset.toLocaleString('fr-FR')} F
                            </button>
                          ))}
                          {selectedStudent && resteAPayer > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMontant(resteAPayer);
                                setCustomMontant(resteAPayer.toString());
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                customMontant === resteAPayer.toString()
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              Payer tout le solde ({resteAPayer.toLocaleString('fr-FR')} F)
                            </button>
                          )}
                        </div>

                        {/* Custom amount input */}
                        <div className="relative">
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            required
                            value={customMontant}
                            onChange={(e) => {
                              setCustomMontant(e.target.value);
                              setMontant(Number(e.target.value) || 0);
                            }}
                            className="w-full px-3 py-2.5 text-base font-mono font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Montant personnalisé"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-500 font-mono">
                            FCFA
                          </div>
                        </div>

                        {/* Optional Donation / Contribution */}
                        <div className="mt-3 p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-purple-950 flex items-center gap-1">
                              <HeartHandshake className="w-3.5 h-3.5 text-purple-700" />
                              Ajouter un Don pour les Œuvres Scolaires
                            </span>
                            <span className="text-[11px] text-purple-700 font-mono font-bold">
                              {montantDon > 0 ? `+${montantDon.toLocaleString('fr-FR')} F` : 'Aucun don'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[0, 2000, 5000, 10000].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setMontantDon(d)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  montantDon === d
                                    ? 'bg-purple-800 text-white border-purple-800'
                                    : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                                }`}
                              >
                                {d === 0 ? 'Sans don' : `+${d.toLocaleString('fr-FR')} F`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Payer Phone & Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Numéro de téléphone payeur *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <input
                              type="tel"
                              required
                              value={telephonePayeur}
                              onChange={(e) => setTelephonePayeur(e.target.value)}
                              placeholder="Ex: 70 21 34 56"
                              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Le compte débité doit correspondre à ce numéro
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nom & Prénom du payeur *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={nomPayeur}
                              onChange={(e) => setNomPayeur(e.target.value)}
                              placeholder="Nom du parent ou tuteur"
                              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Processing feedback banner */}
                      {isProcessing && (
                        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center gap-3 animate-pulse">
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
                          <div className="text-xs">
                            <p className="font-semibold">{processingStep}</p>
                            <p className="text-[11px] text-slate-300">
                              Veuillez patienter pendant la validation de l'opérateur...
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isProcessing || !selectedStudent}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          isProcessing || !selectedStudent
                            ? 'bg-slate-400 cursor-not-allowed'
                            : operateur === 'ORANGE_MONEY'
                            ? 'bg-[#FF7900] hover:bg-[#e06b00]'
                            : operateur === 'MOOV_MONEY'
                            ? 'bg-[#0070BA] hover:bg-[#005c99]'
                            : operateur === 'MTN_MONEY'
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold'
                            : 'bg-emerald-700 hover:bg-emerald-600'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {isProcessing
                            ? 'Paiement en cours...'
                            : `Confirmer et Payer ${(Number(customMontant || 0) + montantDon).toLocaleString('fr-FR')} FCFA${
                                montantDon > 0 ? ` (dont ${montantDon.toLocaleString('fr-FR')} F de don)` : ''
                              }`}
                        </span>
                      </button>

                      <p className="text-center text-[11px] text-slate-500">
                        🔒 Paiement direct et sécurisé. Un reçu officiel téléchargeable est généré automatiquement dès la validation.
                      </p>
                    </form>
                  )}
                </div>

                {/* Info Callout for Cash Option */}
                <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-950">
                      Vous préférez payer sur place en espèces à l'école ?
                    </h5>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Le guichet de la comptabilité est ouvert du lundi au vendredi de 07h30 à 15h30. La secrétaire enregistre votre versement en main propre et vous remet immédiatement votre reçu imprimé.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSCRIPTION / DEMANDE DE PLACE */}
        {activeTab === 'inscription' && (
          <AdmissionForm
            onSuccess={() => {
              // Notification
            }}
          />
        )}

        {/* TAB 3: GRILLE DES TARIFS */}
        {activeTab === 'tarifs' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Année Scolaire {school.anneeScolaire}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Grille Officielle des Frais de Scolarité
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Les montants ci-dessous incluent les frais d'inscription, les fournitures pédagogiques de base et les activités périscolaires.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Cycle & Classes</th>
                    <th className="py-3 px-4">Frais Inscription</th>
                    <th className="py-3 px-4">Tranches (3x)</th>
                    <th className="py-3 px-4 text-right">Total Annuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Maternelle (Petite, Moyenne, Grande)
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">30 000 F</td>
                    <td className="py-3 px-4 font-mono text-slate-600">3 × 40 000 F</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">150 000 FCFA</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Primaire CP1 - CP2
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">35 000 F</td>
                    <td className="py-3 px-4 font-mono text-slate-600">3 × 40 000 F</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">155 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Primaire CE1 - CM2
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">40 000 F</td>
                    <td className="py-3 px-4 font-mono text-slate-600">3 × 45 000 F</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">175 000 FCFA</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Collège (6ème - 3ème)
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">50 000 F</td>
                    <td className="py-3 px-4 font-mono text-slate-600">3 × 60 000 F</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">230 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Lycée (Seconde - Terminale)
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">60 000 F</td>
                    <td className="py-3 px-4 font-mono text-slate-600">3 × 65 000 F</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">255 000 FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 text-slate-600">
              <p className="font-semibold text-slate-800">Échéancier des règlements :</p>
              <p>• 1ère tranche : À l'inscription ou avant le 15 Octobre 2025</p>
              <p>• 2ème tranche : Avant le 15 Janvier 2026</p>
              <p>• 3ème tranche (Solde) : Avant le 15 Mars 2026</p>
            </div>
          </div>
        )}

        {/* TAB 4: CONTACT & SECRETARIAT */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Assistance & Informations
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Coordonnées du Secrétariat
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Une équipe dédiée est à votre disposition pour vous orienter dans vos paiements et démarches scolaires.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Bureau du Secrétariat</h4>
                <p className="text-slate-600">{school.adresse}</p>
                <p className="text-slate-600">{school.ville}, {school.pays}</p>
                <p className="text-slate-600 font-semibold mt-2">
                  Tél direct : {school.telephone}
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Email : {school.email}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Horaires du Guichet de Caisse</h4>
                <p className="text-slate-600">Du Lundi au Vendredi : 07h30 - 15h30 sans interruption</p>
                <p className="text-slate-600">Samedi : 08h00 - 12h00</p>
                <p className="text-slate-600">Dimanche & Jours fériés : Fermé</p>
                <p className="text-emerald-700 font-semibold text-[11px] pt-1">
                  ✓ Paiements par Mobile Money disponibles 24h/24 et 7j/7 sur ce site
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs">Paiement certifié & Quittance instantanée</p>
                <p className="text-[11px] text-emerald-800">
                  Chaque versement effectué sur ce portail est instantanément enregistré et délivre une quittance officielle imprimable.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
