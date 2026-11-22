import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Smartphone, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  Receipt, 
  User, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  HeartHandshake,
  GraduationCap,
  RotateCw,
  Mail,
  Bell,
  Link2,
  LogOut,
  ShieldCheck,
  QrCode,
  FileCheck
} from 'lucide-react';
import { Payment, PaymentMethod, Student, TuitionTariff, AdmissionRequest, ParentTab, ParentAccount } from '../../types';
import { SchoolStore, DEFAULT_SCHOOL_INFO, CURRENT_SCHOOL_YEAR } from '../../services/store';
import { SyncService } from '../../services/sync';
import { PaymentService } from '../../services/paymentService';
import { AdmissionForm } from './AdmissionForm';
import { PaymentOtpModal } from './PaymentOtpModal';
import { ReenrollmentModal } from './ReenrollmentModal';
import { ParentMessagesTab, buildParentMessages } from './ParentMessagesTab';
import { ParentAuthCard, LinkChildModal } from './ParentAuthCard';
import { ParentHistoryTab } from './ParentHistoryTab';
import { ParentAiAssistant } from './ParentAiAssistant';

interface ParentPortalProps {
  parentAccount: ParentAccount | null;
  onParentAuthenticated: (parent: ParentAccount) => void;
  onParentLogout: () => void;
  onOpenVerifyReceipt: () => void;
  students: Student[];
  admissions: AdmissionRequest[];
  payments: Payment[];
  readMessageIds: string[];
  onPaymentSuccess: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment) => void;
  activeTab: ParentTab;
  setActiveTab: (tab: ParentTab) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  parentAccount,
  onParentAuthenticated,
  onParentLogout,
  onOpenVerifyReceipt,
  students,
  admissions,
  payments,
  readMessageIds,
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

  // Dynamic tariffs state
  const [tarifs, setTarifs] = useState<TuitionTariff[]>(() => SchoolStore.getTarifs(CURRENT_SCHOOL_YEAR));

  // Payment form state
  const [montant, setMontant] = useState<number>(50000);
  const [customMontant, setCustomMontant] = useState<string>('50000');
  const [montantDon, setMontantDon] = useState<number>(0);
  const [operateur, setOperateur] = useState<PaymentMethod>('ORANGE_MONEY');
  const [telephonePayeur, setTelephonePayeur] = useState(parentAccount?.telephone || '');
  const [nomPayeur, setNomPayeur] = useState(parentAccount?.nomComplet || '');

  // Modals state
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isReenrollModalOpen, setIsReenrollModalOpen] = useState(false);
  const [isLinkChildModalOpen, setIsLinkChildModalOpen] = useState(false);
  const [lastCompletedPayment, setLastCompletedPayment] = useState<Payment | null>(null);
  const [pendingVerificationPayment, setPendingVerificationPayment] = useState<Payment | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = useState<string>('');

  // Restaure un paiement Mobile Money en attente après rechargement mobile et débloque dès validation secrétaire
  useEffect(() => {
    if (!pendingVerificationPayment) {
      if (selectedStudent) {
        const existingPending = payments.find(
          (p) => p.studentId === selectedStudent.id && p.statut === 'EN_ATTENTE_VERIFICATION'
        );
        if (existingPending && existingPending.id !== lastCompletedPayment?.id) {
          setPendingVerificationPayment(existingPending);
        }
      }
      return;
    }

    const checkMatch = (allPayments: Payment[]) => {
      const match = allPayments.find((p) => p.id === pendingVerificationPayment.id);
      if (match) {
        if (match.statut === 'SUCCES') {
          setPendingVerificationPayment(null);
          setRejectionMessage(null);
          setLastCompletedPayment(match);
          onPaymentSuccess(match);
        } else if (match.statut === 'ECHOUE') {
          setPendingVerificationPayment(null);
          setRejectionMessage(match.motifRejetPaiement || "Fonds non reçus sur le terminal de l'école");
        }
      }
    };

    checkMatch(payments);
    const unsubscribe = SchoolStore.subscribe(() => {
      checkMatch(SchoolStore.getPayments());
    });
    return () => unsubscribe();
  }, [pendingVerificationPayment, payments, selectedStudent, lastCompletedPayment, onPaymentSuccess]);

  // Sync selectedStudent when students prop updates
  useEffect(() => {
    if (selectedStudent) {
      const found = students.find((s) => s.id === selectedStudent.id);
      if (found) {
        setSelectedStudent(found);
      } else {
        setSelectedStudent(students.length > 0 ? students[0] : null);
      }
    } else if (students.length > 0) {
      setSelectedStudent(students[0]);
      setNomPayeur(students[0].nomParent || parentAccount?.nomComplet || '');
      setTelephonePayeur(students[0].telephoneParent || parentAccount?.telephone || '');
    }
  }, [students]);

  useEffect(() => {
    if (!parentAccount) {
      setSelectedStudent(null);
      setLastCompletedPayment(null);
      setPendingVerificationPayment(null);
      setRejectionMessage(null);
      setNomPayeur('');
      setTelephonePayeur('');
    } else {
      setNomPayeur((prev) => prev || parentAccount.nomComplet);
      setTelephonePayeur((prev) => prev || parentAccount.telephone);
    }
  }, [parentAccount]);

  // Sync tariffs on tab switch or store change
  useEffect(() => {
    setTarifs(SchoolStore.getTarifs(CURRENT_SCHOOL_YEAR));
  }, [activeTab]);

  // Search filter (handles matricule, nom, prenom, tel)
  const searchResults = searchQuery.trim() === ''
    ? []
    : students.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.nom.toLowerCase().includes(q) ||
          s.prenom.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q) ||
          (s.telephoneParent && s.telephoneParent.includes(q))
        );
      });

  // Search pending admissions matching the query
  const pendingAdmissionsMatch = searchQuery.trim() === ''
    ? []
    : (admissions || []).filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          a.statut === 'en_attente' &&
          (a.nomEnfant.toLowerCase().includes(q) ||
           a.prenomEnfant.toLowerCase().includes(q) ||
           a.id.toLowerCase().includes(q) ||
           a.telephoneParent.includes(q))
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

  const handleOpenOtpModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setPaymentFormError('');

    const finalMontant = Number(customMontant) || 0;
    if (finalMontant <= 0 && montantDon <= 0) {
      setPaymentFormError('Veuillez spécifier un montant de scolarité ou un don supérieur à 0 FCFA.');
      return;
    }

    if (!telephonePayeur || telephonePayeur.trim().length < 8) {
      setPaymentFormError('Veuillez saisir un numéro de téléphone valide pour recevoir le code OTP.');
      return;
    }

    // Open interactive OTP modal
    setIsOtpModalOpen(true);
  };

  const handleOtpConfirmSuccess = async (otpCode: string) => {
    if (!selectedStudent) return;

    const finalMontant = Number(customMontant) || 0;

    const paymentResult = await PaymentService.traiterPaiementMobileMoney({
      studentId: selectedStudent.id,
      studentMatricule: selectedStudent.matricule,
      studentNom: `${selectedStudent.prenom} ${selectedStudent.nom}`,
      studentClasse: selectedStudent.classe,
      montantScolarite: finalMontant,
      montantDon,
      operateur,
      telephone: telephonePayeur,
      nomPayeur: nomPayeur || selectedStudent.nomParent,
      codeOtp: otpCode,
      notes: montantDon > 0 
        ? `Scolarité (${finalMontant} F) + Don (${montantDon} F) - ${selectedStudent.classe} [Code OTP: ${otpCode}]` 
        : `Règlement scolarité ${selectedStudent.classe} [Code OTP: ${otpCode}]`,
    });

    // Save pending payment awaiting secretary cash verification and push to Supabase
    await SchoolStore.addPaymentAsync(paymentResult);
    setPendingVerificationPayment(paymentResult);
    void SyncService.synchroniserMaintenant();

    // Refresh selected student state
    const updatedStudent = SchoolStore.getStudents().find((s) => s.id === selectedStudent.id);
    if (updatedStudent) {
      setSelectedStudent(updatedStudent);
    }
  };

  const resteAPayer = selectedStudent 
    ? Math.max(0, selectedStudent.scolariteTotale - selectedStudent.montantPaye)
    : 0;

  const isAwaitingReenrollment = selectedStudent?.statutReinscription === 'EN_ATTENTE_REINSCRIPTION';

  const scopedStudentIds = new Set(
    parentAccount ? students.filter((s) => s.parentCompteId === parentAccount.id).map((s) => s.id) : []
  );
  const scopedAdmissions = parentAccount
    ? admissions.filter((a) => a.parentCompteId === parentAccount.id)
    : [];
  const scopedPayments = parentAccount
    ? payments.filter((p) => p.parentCompteId === parentAccount.id || scopedStudentIds.has(p.studentId))
    : [];
  const parentMessages = buildParentMessages(scopedAdmissions, scopedPayments);
  const readSet = new Set(readMessageIds);
  const unreadMessages = parentMessages.filter((m) => !readSet.has(m.id));
  const latestUnreadRefusal = unreadMessages.find((m) => m.category === 'ADMISSION_REFUSEE');
  const latestUnreadMessage = latestUnreadRefusal || unreadMessages[0];

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white pt-7 pb-12 sm:pt-10 sm:pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-500/40 text-emerald-200 text-[11px] sm:text-xs font-semibold mb-3 sm:mb-4">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Portail Officiel des Familles · Rentrée {CURRENT_SCHOOL_YEAR}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 sm:mb-8 max-w-3xl mx-auto leading-tight" style={{ textWrap: 'balance' }}>
            Réglez la scolarité et réinscrivez vos enfants en ligne en toute sérénité
          </h1>

          {/* Action Shortcut for parents */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center justify-center gap-2 sm:gap-3 max-w-xl sm:max-w-none mx-auto">
            <button
              onClick={() => setActiveTab('paiement')}
              className={`w-full sm:w-auto px-3 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center text-center ${
                activeTab === 'paiement'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Payer une Scolarité
            </button>
            <button
              onClick={() => setActiveTab('inscription')}
              className={`w-full sm:w-auto px-3 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center text-center ${
                activeTab === 'inscription'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Demande d'Admission
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full sm:w-auto px-3 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center gap-1.5 ${
                activeTab === 'messages'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Messages</span>
              {parentAccount && unreadMessages.length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-extrabold leading-none rounded-full">
                  {unreadMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('historique')}
              className={`w-full sm:w-auto px-3 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center gap-1.5 ${
                activeTab === 'historique'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Mes Reçus</span>
            </button>
            <button
              onClick={() => setActiveTab('tarifs')}
              className={`w-full sm:w-auto px-3 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center text-center ${
                activeTab === 'tarifs'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/30'
              }`}
            >
              Grille Tarifaire
            </button>
            <button
              type="button"
              onClick={onOpenVerifyReceipt}
              className="w-full sm:w-auto px-3 sm:px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center gap-1.5 bg-slate-900/60 hover:bg-slate-900 text-emerald-200 border border-emerald-500/30"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span>Vérifier un Reçu</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        {/* Logged-in Parent Space Status Strip */}
        {parentAccount && (
          <div className="mb-5 bg-white rounded-2xl border border-emerald-200 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">
                  Espace Privé de {parentAccount.nomComplet}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {parentAccount.telephone} · {students.length} enfant{students.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLinkChildModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Rattacher un élève</span>
              </button>
              <button
                type="button"
                onClick={() => void SyncService.synchroniserMaintenant()}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>
              <button
                type="button"
                onClick={onParentLogout}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        )}
        {/* Live Notification Banner when Secretary sends a refusal/response message */}
        {parentAccount && activeTab !== 'messages' && latestUnreadMessage && (
          <div
            className={`mb-6 rounded-2xl border-2 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              latestUnreadMessage.category === 'ADMISSION_REFUSEE'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  latestUnreadMessage.category === 'ADMISSION_REFUSEE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                  Nouveau message du Secrétariat ({unreadMessages.length})
                </span>
                <h4 className="font-bold text-sm mt-0.5">{latestUnreadMessage.title}</h4>
                {latestUnreadMessage.motif && (
                  <p className="text-xs mt-1 italic">
                    Motif : « {latestUnreadMessage.motif} »
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm ${
                latestUnreadMessage.category === 'ADMISSION_REFUSEE'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Ouvrir l'onglet Messages</span>
            </button>
          </div>
        )}

        {/* Auth Gate on private parent tabs */}
        {!parentAccount && (activeTab === 'paiement' || activeTab === 'inscription' || activeTab === 'messages' || activeTab === 'historique') && (
          <ParentAuthCard onAuthenticated={onParentAuthenticated} />
        )}

        {/* TAB 1: PAIEMENT SCOLARITE */}
        {parentAccount && activeTab === 'paiement' && (
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
                      Paiement de {lastCompletedPayment.montant.toLocaleString('fr-FR')} FCFA validé avec succès !
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Réf Quittance : <span className="font-mono font-bold">{lastCompletedPayment.reference}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenReceipt(lastCompletedPayment)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Imprimer le Reçu Officiel</span>
                </button>
              </div>
            )}

            {/* Pending Mobile Money Secretary Verification Banner */}
            {pendingVerificationPayment && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-900">
                        Paiement en attente de validation
                      </span>
                      <span className="text-xs text-amber-800 font-mono">
                        · Réf: {pendingVerificationPayment.reference}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-1">
                      Montant : <strong>{pendingVerificationPayment.montant.toLocaleString('fr-FR')} FCFA</strong> · Code OTP : <span className="font-mono font-bold">{pendingVerificationPayment.codeOtp || 'Saisi'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void SyncService.synchroniserMaintenant()}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Actualiser</span>
                </button>
              </div>
            )}

            {/* Rejection Alert */}
            {rejectionMessage && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-rose-950 text-xs">Paiement Mobile Money non validé</h5>
                    <p className="text-xs text-rose-800">
                      Motif du secrétariat : <strong>{rejectionMessage}</strong>. Veuillez vérifier que l'envoi a bien été débité de votre compte.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectionMessage(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Student Selector & Info */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Rechercher un élève
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tapez le nom, prénom ou matricule..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Search dropdown results */}
                  {(searchResults.length > 0 || pendingAdmissionsMatch.length > 0) && (
                    <div className="mt-2 border border-slate-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white shadow-xl p-1.5 space-y-1">
                      {/* Active validated students ready to pay */}
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectStudent(s)}
                          className="w-full p-2.5 text-left text-xs hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{s.prenom} {s.nom}</p>
                            <p className="text-[11px] text-slate-500">
                              Matricule: {s.matricule} · {s.classe} {s.statutReinscription === 'EN_ATTENTE_REINSCRIPTION' ? '(Attente Réinscription)' : ''}
                            </p>
                          </div>
                          <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Sélectionner
                          </span>
                        </button>
                      ))}

                      {/* Pending admissions awaiting secretary validation */}
                      {pendingAdmissionsMatch.map((adm) => (
                        <div key={adm.id} className="p-3 bg-amber-50/95 border border-amber-300 rounded-lg text-xs space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              {adm.prenomEnfant} {adm.nomEnfant} ({adm.classeDemandee})
                            </span>
                            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono">
                              {adm.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Dossier en cours d'examen. Vous pourrez régler la scolarité après validation.
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Student list */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {students.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-slate-500">
                            Mes enfants ({students.length}) :
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLinkChildModalOpen(true)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            + Rattacher un élève
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {students.map((s) => {
                            const isSelected = selectedStudent?.id === s.id;
                            const reste = Math.max(0, s.scolariteTotale - s.montantPaye);
                            const isWaiting = s.statutReinscription === 'EN_ATTENTE_REINSCRIPTION';
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold">{s.prenom} {s.nom}</span>
                                    {isWaiting && (
                                      <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                                        À réinscrire
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-500 block text-[11px]">
                                    {s.classe} · {s.matricule}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-[11px] block">
                                    {isWaiting ? 'Bascule 27-28' : reste === 0 ? 'Soldé' : `${reste.toLocaleString('fr-FR')} F`}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2.5">
                        <p className="text-xs text-slate-600 font-medium">
                          Aucun élève encore rattaché à votre compte.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => setActiveTab('inscription')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Demander une Place
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsLinkChildModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Rattacher par matricule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact tracking of this parent's admission requests */}
                {admissions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                        <span>Mes Demandes d'Admission ({admissions.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('messages')}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Voir Messages
                      </button>
                    </div>
                    <div className="space-y-2">
                      {admissions.slice(0, 3).map((adm) => {
                        const matchedStu = students.find(
                          (s) =>
                            (adm.matriculeAttribue && s.matricule === adm.matriculeAttribue) ||
                            `${s.prenom} ${s.nom}`.toLowerCase() ===
                              `${adm.prenomEnfant} ${adm.nomEnfant}`.toLowerCase()
                        );
                        return (
                          <div
                            key={adm.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {adm.prenomEnfant} {adm.nomEnfant} ({adm.classeDemandee})
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {adm.statut === 'en_attente'
                                  ? 'En attente de validation du secrétariat'
                                  : adm.statut === 'accepte'
                                  ? `Validée · ${adm.matriculeAttribue || ''}`
                                  : 'Refusée (voir Messages)'}
                              </p>
                            </div>
                            {adm.statut === 'accepte' && matchedStu && (
                              <button
                                type="button"
                                onClick={() => handleSelectStudent(matchedStu)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] cursor-pointer shrink-0"
                              >
                                Payer
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Student Card */}
                {selectedStudent ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Dossier Élève
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {selectedStudent.prenom} {selectedStudent.nom}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {selectedStudent.matricule}
                      </span>
                    </div>

                    {/* Reenrollment Callout Banner if imported from 2026-2027 */}
                    {isAwaitingReenrollment && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 space-y-2 animate-in fade-in">
                        <div className="flex items-start gap-2 font-bold">
                          <GraduationCap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <p>Élève retrouvé de la session 2026-2027 !</p>
                            <p className="text-[11px] font-normal text-amber-800">
                              Statut conseil : <strong>{selectedStudent.statutFinAnnee === 'REDOUBLANT' ? 'Redoublant' : 'Passant en classe supérieure'}</strong>. Veuillez valider sa réinscription pour l'année {CURRENT_SCHOOL_YEAR}.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsReenrollModalOpen(true)}
                          className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Confirmer la Réinscription {CURRENT_SCHOOL_YEAR}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Classe actuelle :</span>
                        <span className="font-semibold text-slate-800">{selectedStudent.classe}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Année scolaire :</span>
                        <span className="font-semibold text-slate-800">{selectedStudent.anneeScolaire || CURRENT_SCHOOL_YEAR}</span>
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
                          {selectedStudent.scolariteTotale > 0
                            ? Math.round((selectedStudent.montantPaye / selectedStudent.scolariteTotale) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              selectedStudent.scolariteTotale > 0
                                ? Math.round((selectedStudent.montantPaye / selectedStudent.scolariteTotale) * 100)
                                : 0
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
                          <span className="text-slate-500 block">Déjà versé</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {selectedStudent.montantPaye.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Reste à payer</span>
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

              {/* Right Column: Checkout Form (Mobile Money with OTP verification) */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-7 shadow-sm">
                  <div className="border-b border-slate-100 pb-4 mb-5">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Paiement Mobile Money
                    </h2>
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
                        Félicitations, la totalité de la scolarité de <strong>{selectedStudent.prenom} {selectedStudent.nom}</strong> a été réglée pour l'année scolaire {CURRENT_SCHOOL_YEAR}.
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
                    <form onSubmit={handleOpenOtpModal} className="space-y-5">
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
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
                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 mb-2.5">
                          {[25000, 50000, 75000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setMontant(preset);
                                setCustomMontant(preset.toString());
                              }}
                              className={`px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
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
                              className={`col-span-3 sm:col-span-1 px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
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
                        <div className="mt-3 p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <span className="font-semibold text-purple-950 flex items-center gap-1">
                              <HeartHandshake className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                              <span>Don pour les Œuvres Scolaires</span>
                            </span>
                            <span className="text-[11px] text-purple-700 font-mono font-bold">
                              {montantDon > 0 ? `+${montantDon.toLocaleString('fr-FR')} F` : 'Aucun don'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
                            {[0, 2000, 5000, 10000].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setMontantDon(d)}
                                className={`px-2.5 py-1.5 sm:py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
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

                      {paymentFormError && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{paymentFormError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!selectedStudent}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          !selectedStudent
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
                          {`Payer ${(Number(customMontant || 0) + montantDon).toLocaleString('fr-FR')} FCFA${
                            montantDon > 0 ? ` (dont ${montantDon.toLocaleString('fr-FR')} F don)` : ''
                          }`}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSCRIPTION / DEMANDE DE PLACE */}
        {parentAccount && activeTab === 'inscription' && (
          <AdmissionForm
            parentAccount={parentAccount}
            onSuccess={() => {
              // Saved in parent account space
            }}
            onGoToMessages={() => setActiveTab('messages')}
          />
        )}

        {/* TAB MESSAGES: RÉPONSES & MOTIFS DU SECRÉTARIAT */}
        {parentAccount && activeTab === 'messages' && (
          <ParentMessagesTab
            parentAccount={parentAccount}
            admissions={admissions}
            payments={payments}
            students={students}
            readMessageIds={readMessageIds}
            onGoToAdmission={() => setActiveTab('inscription')}
            onGoToPaymentWithStudent={(student) => {
              handleSelectStudent(student);
              setActiveTab('paiement');
            }}
            onOpenReceipt={onOpenReceipt}
            onSessionInvalid={onParentLogout}
          />
        )}

        {/* TAB HISTORIQUE: REÇUS & FRATRIE */}
        {parentAccount && activeTab === 'historique' && (
          <ParentHistoryTab
            parentAccount={parentAccount}
            students={students}
            admissions={admissions}
            payments={payments}
            onOpenReceipt={onOpenReceipt}
            onOpenLinkChild={() => setIsLinkChildModalOpen(true)}
            onSelectStudentToPay={(student) => {
              handleSelectStudent(student);
              setActiveTab('paiement');
            }}
            onGoToAdmission={() => setActiveTab('inscription')}
            onOpenVerifyReceipt={onOpenVerifyReceipt}
            onSessionInvalid={onParentLogout}
          />
        )}

        {/* TAB 3: GRILLE DES TARIFS OFFICIELS DYNAMIQUES */}
        {activeTab === 'tarifs' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Année Scolaire {CURRENT_SCHOOL_YEAR}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Grille des Frais de Scolarité
              </h2>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
              <table className="w-full min-w-[540px] text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Cycle & Classes</th>
                    <th className="py-3 px-4">Scolarité Nette</th>
                    <th className="py-3 px-4">Frais Inscription</th>
                    <th className="py-3 px-4">Frais Annexes (Tenue/APE)</th>
                    <th className="py-3 px-4 text-right">Total Annuel Exigible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {tarifs.map((t, idx) => (
                    <tr key={t.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>{t.niveau}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {t.montantScolarite.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {t.fraisInscription > 0 ? `${t.fraisInscription.toLocaleString('fr-FR')} F` : '0 F'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {t.fraisAnnexes > 0 ? `${t.fraisAnnexes.toLocaleString('fr-FR')} F` : 'Néant'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                        {t.totalExigible.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 text-slate-600">
              <p className="font-semibold text-slate-800">Modalités et échéancier des versements :</p>
              <p>• <strong>1ère tranche :</strong> À l'inscription / réinscription (minimum 50 000 FCFA ou totalité de l'inscription)</p>
              <p>• <strong>2ème tranche :</strong> Avant le 15 Janvier 2028</p>
              <p>• <strong>3ème tranche (Solde) :</strong> Avant le 15 Mars 2028</p>
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
                <h4 className="font-bold text-slate-900 text-sm">Horaires d'Ouverture Caisse</h4>
                <p className="text-slate-600">Du Lundi au Vendredi :</p>
                <p className="font-semibold text-slate-800">07h30 - 12h30 · 15h00 - 17h30</p>
                <p className="text-slate-600 mt-2">Samedi :</p>
                <p className="font-semibold text-slate-800">08h00 - 12h00 (Sur permanence)</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OTP Verification Modal */}
      {selectedStudent && (
        <PaymentOtpModal
          isOpen={isOtpModalOpen}
          onClose={() => setIsOtpModalOpen(false)}
          student={selectedStudent}
          montantScolarite={Number(customMontant) || 0}
          montantDon={montantDon}
          totalMontant={(Number(customMontant) || 0) + montantDon}
          operateur={operateur}
          telephone={telephonePayeur}
          nomPayeur={nomPayeur}
          onConfirmSuccess={handleOtpConfirmSuccess}
        />
      )}

      {/* Reenrollment Modal */}
      {selectedStudent && (
        <ReenrollmentModal
          isOpen={isReenrollModalOpen}
          onClose={() => setIsReenrollModalOpen(false)}
          student={selectedStudent}
          onReenrolled={(updated) => {
            setSelectedStudent(updated);
            const reste = Math.max(0, updated.scolariteTotale - updated.montantPaye);
            setCustomMontant(reste > 0 ? Math.min(reste, 50000).toString() : '0');
          }}
        />
      )}

      {/* Link Existing Child Modal */}
      {parentAccount && (
        <LinkChildModal
          isOpen={isLinkChildModalOpen}
          defaultPhone={parentAccount.telephone}
          onClose={() => setIsLinkChildModalOpen(false)}
          onLinked={() => {
            void SyncService.synchroniserMaintenant();
          }}
        />
      )}

      {/* Floating Parent AI Assistant (always live-synced with secretary instructions) */}
      <ParentAiAssistant />
    </div>
  );
};
