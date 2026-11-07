export type UserRole = 'parent' | 'admin';

export type PaymentMethod = 
  | 'ORANGE_MONEY' 
  | 'MOOV_MONEY' 
  | 'MTN_MONEY' 
  | 'LIGDICASH' 
  | 'ESPECES_GUICHET';

export type PaymentStatus = 'SUCCES' | 'EN_COURS' | 'ECHOUE';

export type AcademicDecision = 'PASSAGE' | 'REDOUBLEMENT' | 'NOUVEAU_CYCLE';

export type TransferReason = 
  | 'DEMENAGEMENT' 
  | 'EXCLUSION_PROBLEME' 
  | 'RAPPROCHEMENT' 
  | 'EXCELLENCE' 
  | 'AUTRE';

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  scolariteTotale: number;
  montantPaye: number;
  nomParent: string;
  telephoneParent: string;
  emailParent?: string;
  adresse?: string;
  dateInscription: string;
  statut: 'inscrit' | 'radie';
  // Nouveaux paramètres scolaires et transferts
  etablissementOrigine?: string;
  decisionBulletin?: AcademicDecision;
  moyenneAnnuelle?: number;
  motifVenue?: TransferReason;
  descriptionVenue?: string;
  bulletinNomFichier?: string;
  montantDonTotal?: number;
}

export type AdmissionStatus = 'en_attente' | 'accepte' | 'refuse';

export interface AdmissionRequest {
  id: string;
  dateDemande: string;
  nomEnfant: string;
  prenomEnfant: string;
  dateNaissance: string;
  classeDemandee: string;
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
  montantDon: number; // Argent versé pour don / soutien
}

export interface Payment {
  id: string;
  reference: string;
  studentId: string;
  studentMatricule: string;
  studentNom: string;
  studentClasse: string;
  montant: number; // Montant total encaissé (scolarité + don)
  montantScolarite: number;
  montantDon: number; // Don spécifique pour œuvres/soutien
  mode: PaymentMethod;
  telephonePayeur?: string;
  nomPayeur: string;
  statut: PaymentStatus;
  encaissePar: 'PARENT_EN_LIGNE' | 'SECRETAIRE_GUICHET';
  agentNom?: string;
  date: string;
  notes?: string;
}

export interface SchoolInfo {
  nom: string;
  devise: string;
  slogan: string;
  anneeScolaire: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  pays: string;
  agrementMinisteriel: string;
}
