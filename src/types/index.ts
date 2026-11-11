export type UserRole = 'parent' | 'admin';

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

/**
 * Grille dynamique des tarifs de scolarité par classe et par année scolaire
 */
export interface TuitionTariff {
  id: string;
  anneeScolaire: string; // Ex: '2027-2028' ou '2026-2027'
  niveau: string;        // Ex: '6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'
  montantScolarite: number; // Montant net scolarité en FCFA
  fraisInscription: number; // Frais d'inscription / réinscription (par défaut 0)
  fraisAnnexes: number;     // Tenue, APE, bibliothèque, etc.
  totalExigible: number;    // Calculé : montantScolarite + fraisInscription + fraisAnnexes
  updatedAt: string;
}

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  anneeScolaire: string; // Ex: '2027-2028'
  scolariteTotale: number;
  montantPaye: number;
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
  montantDonTotal?: number;

  // Gestion de la bascule d'année et réinscriptions (2026-2027 -> 2027-2028)
  anneeOrigine?: string;             // Ex: '2026-2027'
  classePrecedente?: string;         // Ex: '6ème A'
  statutFinAnnee?: 'PASSANT' | 'REDOUBLANT'; // Décision de l'année passée
  statutReinscription?: 'EN_ATTENTE_REINSCRIPTION' | 'REINSCRIT';
  fraisInscriptionPayes?: boolean;
}

export type AdmissionStatus = 'en_attente' | 'accepte' | 'refuse';

export interface AdmissionRequest {
  id: string;
  dateDemande: string;
  nomEnfant: string;
  prenomEnfant: string;
  dateNaissance: string;
  classeDemandee: string;
  anneeScolaire: string; // Ex: '2027-2028'
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  adresse: string;
  statut: AdmissionStatus;
  matriculeAttribue?: string;
  notes?: string;
  motifRefus?: string;
  
  // Paramètres du bulletin du 3ème trimestre et transfert
  estNouveauTransfert: boolean;
  etablissementOrigine?: string;
  decisionBulletin: AcademicDecision;
  moyenneAnnuelle?: number;
  motifVenue?: TransferReason;
  descriptionVenue?: string;
  bulletinNomFichier?: string;
  bulletinUrl?: string; // Data URL ou image du document réel téléversé
  montantDon: number;
}

export interface Payment {
  id: string;
  reference: string;
  studentId: string;
  studentMatricule: string;
  studentNom: string;
  studentClasse: string;
  anneeScolaire?: string; // Ex: '2027-2028'
  montant: number; // Montant total encaissé (scolarité + don)
  montantScolarite: number;
  montantDon: number; // Don spécifique pour œuvres/soutien
  mode: PaymentMethod;
  telephonePayeur?: string;
  nomPayeur: string;
  statut: PaymentStatus;
  encaissePar: 'PARENT_EN_LIGNE' | 'SECRETAIRE_GUICHET';
  agentNom?: string;
  codeOtp?: string;
  dateValidationSecretaire?: string;
  motifRejetPaiement?: string;
  date: string;
  notes?: string;
}

export interface SchoolInfo {
  nom: string;
  devise: string;
  slogan: string;
  anneeScolaire: string; // Ex: '2027 - 2028'
  anneePrecedente: string; // Ex: '2026 - 2027'
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
  agrementMinisteriel: string;
}

export type AuditActionType = 
  | 'CONNEXION'
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

