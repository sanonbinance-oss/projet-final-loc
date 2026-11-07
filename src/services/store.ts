import { AdmissionRequest, Payment, SchoolInfo, Student } from '../types';

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  nom: 'Groupe Scolaire Excellence & Avenir',
  devise: 'Discipline - Travail - Réussite',
  slogan: 'L excellence au service de la nation',
  anneeScolaire: '2025 - 2026',
  telephone: '+226 25 36 78 90 / +226 70 00 11 22',
  email: 'contact@excellence-avenir.bf',
  adresse: 'Secteur 28, Boulevard Charles de Gaulle',
  ville: 'Ouagadougou',
  pays: 'Burkina Faso',
  agrementMinisteriel: 'Arrêté N° 2023-0482/MENAPLN/SG/DREPS',
};

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'STU_001',
    matricule: 'EDU-25-001',
    nom: 'OUÉDRAOGO',
    prenom: 'Aminata',
    dateNaissance: '2018-04-12',
    classe: 'CP1',
    scolariteTotale: 150000,
    montantPaye: 100000,
    nomParent: 'Moussa Ouédraogo',
    telephoneParent: '70213456',
    emailParent: 'moussa.oued@gmail.com',
    adresse: 'Gounghin, Ouagadougou',
    dateInscription: '2025-09-02',
    statut: 'inscrit',
    etablissementOrigine: 'Maternelle Les Anges',
    decisionBulletin: 'NOUVEAU_CYCLE',
    moyenneAnnuelle: 15.2,
    motifVenue: 'EXCELLENCE',
    descriptionVenue: 'Inscription au cours préparatoire après une excellente maternelle.',
    bulletinNomFichier: 'bulletin_maternelle_aminata.pdf',
    montantDonTotal: 10000,
  },
  {
    id: 'STU_002',
    matricule: 'EDU-25-002',
    nom: 'KABORÉ',
    prenom: 'Ibrahim',
    dateNaissance: '2016-11-20',
    classe: 'CE2',
    scolariteTotale: 175000,
    montantPaye: 175000,
    nomParent: 'Aïssata Kaboré',
    telephoneParent: '76889900',
    emailParent: 'aissata.k@yahoo.fr',
    adresse: 'Dassasgho, Ouagadougou',
    dateInscription: '2025-09-05',
    statut: 'inscrit',
    etablissementOrigine: 'Complexe Scolaire Wend-Kuni',
    decisionBulletin: 'PASSAGE',
    moyenneAnnuelle: 14.10,
    motifVenue: 'DEMENAGEMENT',
    descriptionVenue: 'La famille a déménagé de Koudougou pour s installer à Dassasgho.',
    bulletinNomFichier: 'bulletin_t3_ce1_ibrahim.pdf',
    montantDonTotal: 15000,
  },
  {
    id: 'STU_003',
    matricule: 'EDU-25-003',
    nom: 'SAWADOGO',
    prenom: 'Fatimata',
    dateNaissance: '2013-02-15',
    classe: '6ème',
    scolariteTotale: 210000,
    montantPaye: 90000,
    nomParent: 'Ousmane Sawadogo',
    telephoneParent: '65443322',
    emailParent: 'sawadogo.ous@hotmail.com',
    adresse: 'Wemtenga, Ouagadougou',
    dateInscription: '2025-09-10',
    statut: 'inscrit',
    etablissementOrigine: 'École Primaire Privée Sainte Famille',
    decisionBulletin: 'PASSAGE',
    moyenneAnnuelle: 16.05,
    motifVenue: 'EXCELLENCE',
    descriptionVenue: 'Admise au CEP, recherche d un collège d excellence réputé.',
    bulletinNomFichier: 'releve_cep_fatimata.pdf',
    montantDonTotal: 5000,
  },
  {
    id: 'STU_004',
    matricule: 'EDU-25-004',
    nom: 'COMPAORÉ',
    prenom: 'Cheick Aziz',
    dateNaissance: '2010-08-30',
    classe: '3ème',
    scolariteTotale: 230000,
    montantPaye: 50000,
    nomParent: 'Madame Compaoré Mariam',
    telephoneParent: '78112233',
    emailParent: 'm.compaore@fasonet.bf',
    adresse: 'Karpala, Ouagadougou',
    dateInscription: '2025-09-12',
    statut: 'inscrit',
    etablissementOrigine: 'Lycée Privé Le Progrès',
    decisionBulletin: 'REDOUBLEMENT',
    moyenneAnnuelle: 9.40,
    motifVenue: 'EXCLUSION_PROBLEME',
    descriptionVenue: 'Non admis en classe supérieure dans son ancien lycée, envoyé ici pour bénéficier d un suivi personnalisé et redoubler sereinement la 3ème.',
    bulletinNomFichier: 'bulletin_3eme_trimestre_cheick.pdf',
    montantDonTotal: 0,
  },
  {
    id: 'STU_005',
    matricule: 'EDU-25-005',
    nom: 'TRAORÉ',
    prenom: 'Mariam',
    dateNaissance: '2014-06-18',
    classe: 'CM2',
    scolariteTotale: 185000,
    montantPaye: 135000,
    nomParent: 'Bakary Traoré',
    telephoneParent: '71556677',
    adresse: 'Somgandé, Ouagadougou',
    dateInscription: '2025-09-15',
    statut: 'inscrit',
    etablissementOrigine: 'École Publique Somgandé B',
    decisionBulletin: 'PASSAGE',
    moyenneAnnuelle: 13.80,
    motifVenue: 'RAPPROCHEMENT',
    descriptionVenue: 'Rapprochement du domicile des parents pour éviter les grands axes.',
    bulletinNomFichier: 'bulletin_cm1_t3_traore.pdf',
    montantDonTotal: 10000,
  },
  {
    id: 'STU_006',
    matricule: 'EDU-25-006',
    nom: 'SANON',
    prenom: 'Abdoulaye',
    dateNaissance: '2017-09-04',
    classe: 'CP2',
    scolariteTotale: 160000,
    montantPaye: 60000,
    nomParent: 'Yacouba Sanon',
    telephoneParent: '74123498',
    adresse: 'Tanghin, Ouagadougou',
    dateInscription: '2025-09-18',
    statut: 'inscrit',
    etablissementOrigine: 'Groupe Scolaire Excellence & Avenir',
    decisionBulletin: 'PASSAGE',
    moyenneAnnuelle: 14.50,
    motifVenue: 'EXCELLENCE',
    descriptionVenue: 'Élève régulier de l école passant du CP1 au CP2.',
    bulletinNomFichier: 'bulletin_cp1_sanon.pdf',
    montantDonTotal: 0,
  },
];

const INITIAL_ADMISSIONS: AdmissionRequest[] = [
  {
    id: 'ADM_001',
    dateDemande: new Date(Date.now() - 3600000 * 2).toISOString(),
    nomEnfant: 'KABORÉ',
    prenomEnfant: 'Oumar',
    dateNaissance: '2019-03-25',
    classeDemandee: 'CP1',
    nomParent: 'Salif Kaboré',
    telephoneParent: '70123456',
    emailParent: 'salif.kabore@gmail.com',
    adresse: 'Patte d’Oie, Ouagadougou',
    statut: 'en_attente',
    notes: 'Dossier complet avec bulletin de grande section.',
    estNouveauTransfert: true,
    etablissementOrigine: 'Maternelle Les Papillons',
    decisionBulletin: 'NOUVEAU_CYCLE',
    moyenneAnnuelle: 16.2,
    motifVenue: 'RAPPROCHEMENT',
    descriptionVenue: 'Déménagement récent à Patte d Oie, recherche d une école proche.',
    bulletinNomFichier: 'bulletin_3eme_trimestre_oumar.pdf',
    montantDon: 5000,
  },
  {
    id: 'ADM_002',
    dateDemande: new Date(Date.now() - 3600000 * 5).toISOString(),
    nomEnfant: 'ZONGO',
    prenomEnfant: 'Aïcha',
    dateNaissance: '2013-10-14',
    classeDemandee: '6ème',
    nomParent: 'Alimatou Zongo',
    telephoneParent: '76998877',
    emailParent: 'zongo.alima@yahoo.com',
    adresse: 'Tampouy, Ouagadougou',
    statut: 'en_attente',
    notes: 'Admise au CEP session 2025.',
    estNouveauTransfert: true,
    etablissementOrigine: 'École Primaire Privée Bangr-Nooma',
    decisionBulletin: 'PASSAGE',
    moyenneAnnuelle: 15.75,
    motifVenue: 'EXCELLENCE',
    descriptionVenue: 'Passage en 6ème, les parents recherchent un meilleur encadrement pour le secondaire.',
    bulletinNomFichier: 'bulletin_cm2_t3_aicha_passage.pdf',
    montantDon: 10000,
  },
  {
    id: 'ADM_003',
    dateDemande: new Date(Date.now() - 86400000 * 2).toISOString(),
    nomEnfant: 'BATIONO',
    prenomEnfant: 'Noufou',
    dateNaissance: '2017-01-10',
    classeDemandee: 'CE1',
    nomParent: 'Issa Bationo',
    telephoneParent: '65432100',
    adresse: 'Pissy, Ouagadougou',
    statut: 'accepte',
    matriculeAttribue: 'EDU-25-007',
    notes: 'Dossier validé et scolarité initiale enregistrée.',
    estNouveauTransfert: true,
    etablissementOrigine: 'École Saint Joseph de Bobo-Dioulasso',
    decisionBulletin: 'REDOUBLEMENT',
    moyenneAnnuelle: 9.80,
    motifVenue: 'DEMENAGEMENT',
    descriptionVenue: 'Mutation professionnelle du père de Bobo-Dioulasso à Ouagadougou.',
    bulletinNomFichier: 'bulletin_t3_redoublement_bationo.pdf',
    montantDon: 5000,
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'PAY_INIT_1',
    reference: 'REC-2025-OM-BF-819201',
    studentId: 'STU_001',
    studentMatricule: 'EDU-25-001',
    studentNom: 'Aminata OUÉDRAOGO',
    studentClasse: 'CP1',
    montant: 110000,
    montantScolarite: 100000,
    montantDon: 10000,
    mode: 'ORANGE_MONEY',
    telephonePayeur: '70213456',
    nomPayeur: 'Moussa Ouédraogo',
    statut: 'SUCCES',
    encaissePar: 'PARENT_EN_LIGNE',
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    notes: 'Tranches 1 & 2 (100.000 F) + Don de soutien école (10.000 F)',
  },
  {
    id: 'PAY_INIT_2',
    reference: 'REC-2025-ESP-44912',
    studentId: 'STU_002',
    studentMatricule: 'EDU-25-002',
    studentNom: 'Ibrahim KABORÉ',
    studentClasse: 'CE2',
    montant: 190000,
    montantScolarite: 175000,
    montantDon: 15000,
    mode: 'ESPECES_GUICHET',
    telephonePayeur: '76889900',
    nomPayeur: 'Aïssata Kaboré',
    statut: 'SUCCES',
    encaissePar: 'SECRETAIRE_GUICHET',
    agentNom: 'Mme Sanfo (Secrétaire)',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Scolarité soldée en espèces (175.000 F) + Don pour la bibliothèque (15.000 F)',
  },
  {
    id: 'PAY_INIT_3',
    reference: 'REC-2025-MV-BF-629104',
    studentId: 'STU_003',
    studentMatricule: 'EDU-25-003',
    studentNom: 'Fatimata SAWADOGO',
    studentClasse: '6ème',
    montant: 95000,
    montantScolarite: 90000,
    montantDon: 5000,
    mode: 'MOOV_MONEY',
    telephonePayeur: '65443322',
    nomPayeur: 'Ousmane Sawadogo',
    statut: 'SUCCES',
    encaissePar: 'PARENT_EN_LIGNE',
    date: new Date(Date.now() - 3600000 * 18).toISOString(),
    notes: '1ère tranche scolarité (90.000 F) + Don œuvres scolaires (5.000 F)',
  },
  {
    id: 'PAY_INIT_4',
    reference: 'REC-2025-ESP-90812',
    studentId: 'STU_005',
    studentMatricule: 'EDU-25-005',
    studentNom: 'Mariam TRAORÉ',
    studentClasse: 'CM2',
    montant: 145000,
    montantScolarite: 135000,
    montantDon: 10000,
    mode: 'ESPECES_GUICHET',
    telephonePayeur: '71556677',
    nomPayeur: 'Bakary Traoré',
    statut: 'SUCCES',
    encaissePar: 'SECRETAIRE_GUICHET',
    agentNom: 'Mme Sanfo (Secrétaire)',
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'Avance scolarité (135.000 F) + Don cantine (10.000 F)',
  },
];

const STORAGE_KEYS = {
  STUDENTS: 'edupay_students_v2',
  ADMISSIONS: 'edupay_admissions_v2',
  PAYMENTS: 'edupay_payments_v2',
  SCHOOL: 'edupay_school_v2',
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('edupay_storage_change'));
  }
}

export class SchoolStore {
  static getStudents(): Student[] {
    if (typeof window === 'undefined') return INITIAL_STUDENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    this.saveStudents(INITIAL_STUDENTS);
    return INITIAL_STUDENTS;
  }

  static saveStudents(students: Student[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      notifyListeners();
    }
  }

  static getAdmissions(): AdmissionRequest[] {
    if (typeof window === 'undefined') return INITIAL_ADMISSIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADMISSIONS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    this.saveAdmissions(INITIAL_ADMISSIONS);
    return INITIAL_ADMISSIONS;
  }

  static saveAdmissions(admissions: AdmissionRequest[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ADMISSIONS, JSON.stringify(admissions));
      notifyListeners();
    }
  }

  static getPayments(): Payment[] {
    if (typeof window === 'undefined') return INITIAL_PAYMENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    this.savePayments(INITIAL_PAYMENTS);
    return INITIAL_PAYMENTS;
  }

  static savePayments(payments: Payment[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      notifyListeners();
    }
  }

  static getSchoolInfo(): SchoolInfo {
    if (typeof window === 'undefined') return DEFAULT_SCHOOL_INFO;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SCHOOL);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_SCHOOL_INFO;
  }

  static addStudent(
    studentData: Omit<Student, 'id' | 'matricule' | 'montantPaye' | 'dateInscription' | 'statut'> & {
      montantPaye?: number;
    }
  ): Student {
    const students = this.getStudents();
    const count = students.length + 1;
    const matricule = `EDU-25-${count.toString().padStart(3, '0')}`;

    const newStudent: Student = {
      ...studentData,
      id: 'STU_' + Date.now(),
      matricule,
      montantPaye: studentData.montantPaye || 0,
      montantDonTotal: studentData.montantDonTotal || 0,
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'inscrit',
    };

    students.unshift(newStudent);
    this.saveStudents(students);
    return newStudent;
  }

  static updateStudent(student: Student) {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === student.id);
    if (index !== -1) {
      students[index] = student;
      this.saveStudents(students);
    }
  }

  static deleteStudent(studentId: string): boolean {
    const students = this.getStudents();
    const filtered = students.filter((s) => s.id !== studentId);
    if (filtered.length !== students.length) {
      this.saveStudents(filtered);
      return true;
    }
    return false;
  }

  static addPayment(payment: Payment) {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.savePayments(payments);

    // Update student's scolarite & don
    const students = this.getStudents();
    const studentIndex = students.findIndex((s) => s.id === payment.studentId);
    if (studentIndex !== -1) {
      const student = students[studentIndex];
      student.montantPaye = (student.montantPaye || 0) + payment.montantScolarite;
      student.montantDonTotal = (student.montantDonTotal || 0) + (payment.montantDon || 0);
      this.saveStudents(students);
    }
  }

  static addAdmissionRequest(
    request: Omit<AdmissionRequest, 'id' | 'dateDemande' | 'statut'>
  ): AdmissionRequest {
    const admissions = this.getAdmissions();
    const newReq: AdmissionRequest = {
      ...request,
      id: 'ADM_' + Date.now(),
      dateDemande: new Date().toISOString(),
      statut: 'en_attente',
    };
    admissions.unshift(newReq);
    this.saveAdmissions(admissions);
    return newReq;
  }

  static acceptAdmission(requestId: string, scolariteTotale: number = 180000): Student | null {
    const admissions = this.getAdmissions();
    const req = admissions.find((a) => a.id === requestId);
    if (!req) return null;

    const student = this.addStudent({
      nom: req.nomEnfant.toUpperCase(),
      prenom: req.prenomEnfant,
      dateNaissance: req.dateNaissance,
      classe: req.classeDemandee,
      scolariteTotale,
      nomParent: req.nomParent,
      telephoneParent: req.telephoneParent,
      emailParent: req.emailParent,
      adresse: req.adresse,
      montantPaye: 0,
      montantDonTotal: req.montantDon || 0,
      etablissementOrigine: req.etablissementOrigine,
      decisionBulletin: req.decisionBulletin,
      moyenneAnnuelle: req.moyenneAnnuelle,
      motifVenue: req.motifVenue,
      descriptionVenue: req.descriptionVenue,
      bulletinNomFichier: req.bulletinNomFichier,
    });

    req.statut = 'accepte';
    req.matriculeAttribue = student.matricule;
    this.saveAdmissions(admissions);

    return student;
  }

  static rejectAdmission(requestId: string, motif?: string) {
    const admissions = this.getAdmissions();
    const req = admissions.find((a) => a.id === requestId);
    if (req) {
      req.statut = 'refuse';
      req.motifRefus = motif || 'Places indisponibles ou dossier non retenu.';
      this.saveAdmissions(admissions);
    }
  }

  static resetToDefaultData() {
    this.saveStudents(INITIAL_STUDENTS);
    this.saveAdmissions(INITIAL_ADMISSIONS);
    this.savePayments(INITIAL_PAYMENTS);
  }

  static subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
}
