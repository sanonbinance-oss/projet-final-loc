export type UserRole = 'parent' | 'admin';

export type ParentTab = 'paiement' | 'inscription' | 'messages' | 'historique' | 'tarifs' | 'contact';

export type AdminTab =
  | 'dashboard'
  | 'guichet'
  | 'eleves'
  | 'demandes'
  | 'transactions'
  | 'tarifs'
  | 'journal'
  | 'equipe'
  | 'ia'
  | 'api';

export type StaffRole = 'DIRECTEUR' | 'SECRETAIRE' | 'CAISSIER';

export interface ParentAccount {
  id: string;
  nomComplet: string;
  telephone: string;
  telephoneNormalise?: string;
  email?: string;
}

export interface ParentAccountSummary {
  id: string;
  nomComplet: string;
  telephone: string;
  email?: string;
  estActif: boolean;
  dateCreation: string;
}

export type AiInstructionCategory = 'TARIF' | 'PROGRAMME' | 'PROCEDURE' | 'URGENT' | 'INFO';

export interface AiInstruction {
  id: string;
  categorie: AiInstructionCategory;
  titre: string;
  contenu: string;
  auteur: string;
  estActif: boolean;
  dateCreation: string;
  dateModification: string;
}

export interface StaffSession {
  author: string;
  staffRole: StaffRole;
  email?: string;
}

export interface StaffUser {
  id: number;
  nomComplet: string;
  email: string;
  role: StaffRole;
  telephone?: string;
  estActif: boolean;
  dateDerniereConnexion?: string | null;
  dateCreation: string;
}

export type PaymentMethod =
  | 'ORANGE_MONEY'
  | 'MOOV_MONEY'
  | 'MTN_MONEY'
  | 'LIGDICASH'
  | 'ESPECES_GUICHET';

export type PaymentStatus = 'SUCCES' | 'EN_COURS' | 'ECHOUE' | 'EN_ATTENTE_VERIFICATION';

export type AcademicDecision = 'PASSAGE' | 'REDOUBLEMENT' | 'NOUVEAU_CYCLE';

export type TransferReason =
  | 'DEMENAGEMENT'
  | 'EXCLUSION_PROBLEME'
  | 'RAPPROCHEMENT'
  | 'EXCELLENCE'
  | 'AUTRE';

export interface TuitionTariff {
  id: string;
  anneeScolaire: string;
  niveau: string;
  montantScolarite: number;
  fraisInscription: number;
  fraisAnnexes: number;
  totalExigible: number;
  updatedAt: string;
}

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  anneeScolaire: string;
  scolariteTotale: number;
  montantPaye: number;
  parentCompteId?: string;
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  adresse?: string;
  dateInscription: string;
  statut: 'inscrit' | 'radie';

  // Paramètres scolaires & transferts
  etablissementOrigine?: string;
  decisionBulletin?: AcademicDecision;
  moyenneAnnuelle?: number;
  motifVenue?: TransferReason;
  descriptionVenue?: string;
  bulletinNomFichier?: string;
  extraitNaissanceNomFichier?: string;
  montantDonTotal?: number;

  // Gestion de la bascule d'année et réinscriptions (2026-2027 -> 2027-2028)
  anneeOrigine?: string;
  classePrecedente?: string;
  statutFinAnnee?: 'PASSANT' | 'REDOUBLANT';
  statutReinscription?: 'EN_ATTENTE_REINSCRIPTION' | 'REINSCRIT';
  fraisInscriptionPayes?: boolean;
}

export type AdmissionStatus = 'en_attente' | 'accepte' | 'refuse';

export interface AdmissionRequest {
  id: string;
  dateDemande: string;
  parentCompteId?: string;
  nomEnfant: string;
  prenomEnfant: string;
  dateNaissance: string;
  classeDemandee: string;
  anneeScolaire: string;
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  adresse: string;
  statut: AdmissionStatus;
  matriculeAttribue?: string;
  notes?: string;
  motifRefus?: string;
  dateTraitement?: string;

  // Pièces justificatives : Bulletin du 3ème trimestre & Extrait de naissance
  estNouveauTransfert: boolean;
  etablissementOrigine?: string;
  decisionBulletin: AcademicDecision;
  moyenneAnnuelle?: number;
  motifVenue?: TransferReason;
  descriptionVenue?: string;
  bulletinNomFichier?: string;
  bulletinUrl?: string;
  extraitNaissanceNomFichier?: string;
  extraitNaissanceUrl?: string;
  montantDon: number;
}

export interface Payment {
  id: string;
  reference: string;
  parentCompteId?: string;
  studentId: string;
  studentMatricule: string;
  studentNom: string;
  studentClasse: string;
  anneeScolaire?: string;
  montant: number;
  montantScolarite: number;
  montantDon: number;
  mode: PaymentMethod;
  telephonePayeur?: string;
  nomPayeur: string;
  statut: PaymentStatus;
  encaissePar: 'PARENT_EN_LIGNE' | 'SECRETAIRE_GUICHET';
  agentNom?: string;
  codeOtp?: string;
  qrSignature?: string;
  dateValidationSecretaire?: string;
  motifRejetPaiement?: string;
  date: string;
  notes?: string;
}

export interface ReceiptVerificationResult {
  found: boolean;
  authentic: boolean;
  signatureValid: boolean;
  receipt: {
    reference: string;
    anneeScolaire: string;
    studentMatricule: string;
    studentNom: string;
    studentClasse: string;
    montant: number;
    montantScolarite: number;
    montantDon: number;
    mode: PaymentMethod;
    encaissePar: string;
    statut: PaymentStatus;
    agentNom: string;
    date: string;
  } | null;
}

export interface SchoolInfo {
  nom: string;
  devise: string;
  slogan: string;
  anneeScolaire: string;
  anneePrecedente: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
  agrementMinisteriel: string;
}

export type AuditActionType =
  | 'CONNEXION'
  | 'CREATION_AGENT'
  | 'MODIFICATION_TARIF'
  | 'VALIDATION_ADMISSION'
  | 'REFUS_ADMISSION'
  | 'SUPPRESSION_ELEVE'
  | 'AJOUT_ELEVE'
  | 'INSCRIPTION_MANUELLE'
  | 'REINSCRIPTION_EFFECTUEE'
  | 'IMPORT_MASSIF'
  | 'ENCAISSEMENT_ESPECES'
  | 'PAIEMENT_MOBILE_MONEY'
  | 'VALIDATION_PAIEMENT_MOBILE_MONEY'
  | 'REJET_PAIEMENT_MOBILE_MONEY'
  | 'INIT_BASE'
  | 'RESET_MDP_PARENT'
  | 'INSTRUCTION_IA'
  | 'AUTRE';

export interface AuditLog {
  id: string;
  dateAction: string;
  typeAction: AuditActionType;
  auteur: string;
  description: string;
  details?: Record<string, unknown>;
  niveauGravite: 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE';
}
