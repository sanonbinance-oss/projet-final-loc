import { AdmissionRequest, Payment, SchoolInfo, Student, TuitionTariff, AuditLog, AuditActionType } from '../types';
import { SupabaseSyncService } from './supabaseClient';

export const CURRENT_SCHOOL_YEAR = '2027-2028';
export const PREVIOUS_SCHOOL_YEAR = '2026-2027';

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  nom: 'Groupe Scolaire Excellence & Avenir (Collège & Enseignement Technique)',
  devise: 'Discipline - Travail - Réussite',
  slogan: 'L excellence générale et technologique au service de la nation',
  anneeScolaire: '2027 - 2028',
  anneePrecedente: '2026 - 2027',
  telephone: '+226 25 36 78 90 / +226 70 00 11 22',
  email: 'contact@excellence-avenir.bf',
  adresse: 'Secteur 28, Boulevard Charles de Gaulle',
  ville: 'Ouagadougou',
  pays: 'Burkina Faso',
  agrementMinisteriel: 'Arrêté N° 2023-0482/MENAPLN/SG/DREPS (Filières Générales & Techniques)',
};

/**
 * Grille tarifaire officielle par défaut intégrant strictement :
 * 1. Collège : 6ème, 5ème, 4ème, 3ème
 * 2. Lycée Général : 2nde A, 2nde C, 1ère A, 1ère D, Tle A, Tle D
 * 3. Enseignement Technique & Professionnel : Bac Pro 1, Bac Pro 2, BEP 1, BEP 2, C', D'
 */
export const DEFAULT_TARIFS_2027_2028: TuitionTariff[] = [
  // --- CYCLE COLLÈGE ---
  {
    id: 'TARIF_6EME',
    anneeScolaire: '2027-2028',
    niveau: '6ème',
    montantScolarite: 160000,
    fraisInscription: 25000,
    fraisAnnexes: 15000,
    totalExigible: 200000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_5EME',
    anneeScolaire: '2027-2028',
    niveau: '5ème',
    montantScolarite: 160000,
    fraisInscription: 25000,
    fraisAnnexes: 15000,
    totalExigible: 200000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_4EME',
    anneeScolaire: '2027-2028',
    niveau: '4ème',
    montantScolarite: 175000,
    fraisInscription: 25000,
    fraisAnnexes: 15000,
    totalExigible: 215000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_3EME',
    anneeScolaire: '2027-2028',
    niveau: '3ème',
    montantScolarite: 190000,
    fraisInscription: 30000,
    fraisAnnexes: 20000,
    totalExigible: 240000,
    updatedAt: new Date().toISOString(),
  },

  // --- CYCLE LYCÉE ENSEIGNEMENT GÉNÉRAL ---
  {
    id: 'TARIF_2NDE_A',
    anneeScolaire: '2027-2028',
    niveau: '2nde A',
    montantScolarite: 210000,
    fraisInscription: 30000,
    fraisAnnexes: 20000,
    totalExigible: 260000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_2NDE_C',
    anneeScolaire: '2027-2028',
    niveau: '2nde C',
    montantScolarite: 215000,
    fraisInscription: 30000,
    fraisAnnexes: 20000,
    totalExigible: 265000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_1ERE_A',
    anneeScolaire: '2027-2028',
    niveau: '1ère A',
    montantScolarite: 225000,
    fraisInscription: 35000,
    fraisAnnexes: 20000,
    totalExigible: 280000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_1ERE_D',
    anneeScolaire: '2027-2028',
    niveau: '1ère D',
    montantScolarite: 230000,
    fraisInscription: 35000,
    fraisAnnexes: 20000,
    totalExigible: 285000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_TLE_A',
    anneeScolaire: '2027-2028',
    niveau: 'Tle A',
    montantScolarite: 250000,
    fraisInscription: 40000,
    fraisAnnexes: 25000,
    totalExigible: 315000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_TLE_D',
    anneeScolaire: '2027-2028',
    niveau: 'Tle D',
    montantScolarite: 260000,
    fraisInscription: 40000,
    fraisAnnexes: 25000,
    totalExigible: 325000,
    updatedAt: new Date().toISOString(),
  },

  // --- CYCLE TECHNIQUE & PROFESSIONNEL ---
  {
    id: 'TARIF_BEP_1',
    anneeScolaire: '2027-2028',
    niveau: 'BEP 1',
    montantScolarite: 200000,
    fraisInscription: 35000,
    fraisAnnexes: 30000, // Frais matériel d'atelier & blouses
    totalExigible: 265000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_BEP_2',
    anneeScolaire: '2027-2028',
    niveau: 'BEP 2',
    montantScolarite: 210000,
    fraisInscription: 35000,
    fraisAnnexes: 30000,
    totalExigible: 275000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_BAC_PRO_1',
    anneeScolaire: '2027-2028',
    niveau: 'Bac Pro 1',
    montantScolarite: 230000,
    fraisInscription: 40000,
    fraisAnnexes: 35000,
    totalExigible: 305000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_BAC_PRO_2',
    anneeScolaire: '2027-2028',
    niveau: 'Bac Pro 2',
    montantScolarite: 245000,
    fraisInscription: 40000,
    fraisAnnexes: 35000,
    totalExigible: 320000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_SERIE_C_PRIME',
    anneeScolaire: '2027-2028',
    niveau: "C'",
    montantScolarite: 255000,
    fraisInscription: 40000,
    fraisAnnexes: 35000,
    totalExigible: 330000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TARIF_SERIE_D_PRIME',
    anneeScolaire: '2027-2028',
    niveau: "D'",
    montantScolarite: 265000,
    fraisInscription: 40000,
    fraisAnnexes: 35000,
    totalExigible: 340000,
    updatedAt: new Date().toISOString(),
  },
];

const STORAGE_KEYS = {
  STUDENTS: 'edupay_eleves_supabase_v5',
  ADMISSIONS: 'edupay_admissions_supabase_v5',
  PAYMENTS: 'edupay_paiements_supabase_v5',
  SCHOOL: 'edupay_etablissement_supabase_v5',
  TARIFS: 'edupay_tarifs_supabase_v5',
  AUDIT_LOGS: 'edupay_journal_activites_v5',
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
  /* ==========================================================================
     TARIFS DE SCOLARITÉ DYNAMIQUES (Synchronisé Supabase)
     ========================================================================== */
  static getTarifs(annee: string = CURRENT_SCHOOL_YEAR): TuitionTariff[] {
    if (typeof window === 'undefined') return DEFAULT_TARIFS_2027_2028;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TARIFS);
      if (stored) {
        const parsed: TuitionTariff[] = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed.filter((t) => t.anneeScolaire === annee);
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_TARIFS_2027_2028.filter((t) => t.anneeScolaire === annee);
  }

  static getAllTarifs(): TuitionTariff[] {
    if (typeof window === 'undefined') return DEFAULT_TARIFS_2027_2028;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TARIFS);
      if (stored) {
        const parsed: TuitionTariff[] = JSON.parse(stored);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TARIFS_2027_2028;
  }

  static saveTarifs(tarifs: TuitionTariff[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TARIFS, JSON.stringify(tarifs));
      notifyListeners();
    }
  }

  static updateTariff(tariff: TuitionTariff) {
    const all = this.getAllTarifs();
    const index = all.findIndex((t) => t.id === tariff.id || (t.anneeScolaire === tariff.anneeScolaire && t.niveau === tariff.niveau));
    const totalExigible = Number(tariff.montantScolarite || 0) + Number(tariff.fraisInscription || 0) + Number(tariff.fraisAnnexes || 0);
    const updated: TuitionTariff = {
      ...tariff,
      totalExigible,
      updatedAt: new Date().toISOString(),
    };

    if (index !== -1) {
      all[index] = updated;
    } else {
      all.push(updated);
    }
    this.saveTarifs(all);

    // Sync in background with Supabase
    SupabaseSyncService.syncTarifToSupabase({
      annee_scolaire: updated.anneeScolaire,
      niveau: updated.niveau,
      montant_scolarite: updated.montantScolarite,
      frais_inscription: updated.fraisInscription,
      frais_annexes: updated.fraisAnnexes,
    });

    this.addAuditLog({
      typeAction: 'MODIFICATION_TARIF',
      auteur: 'Secrétaire Principale',
      description: `Mise à jour tarif ${updated.niveau} (${updated.anneeScolaire}) : Scolarité ${updated.montantScolarite.toLocaleString()} F, Total ${updated.totalExigible.toLocaleString()} FCFA`,
      details: { niveau: updated.niveau, annee: updated.anneeScolaire, total: updated.totalExigible },
      niveauGravite: 'AVERTISSEMENT',
    });

    return updated;
  }

  static addTariff(tariffData: Omit<TuitionTariff, 'id' | 'totalExigible' | 'updatedAt'>): TuitionTariff {
    const all = this.getAllTarifs();
    const totalExigible = Number(tariffData.montantScolarite || 0) + Number(tariffData.fraisInscription || 0) + Number(tariffData.fraisAnnexes || 0);
    const newTariff: TuitionTariff = {
      ...tariffData,
      id: 'TARIF_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      totalExigible,
      updatedAt: new Date().toISOString(),
    };
    all.push(newTariff);
    this.saveTarifs(all);

    // Sync in background with Supabase
    SupabaseSyncService.syncTarifToSupabase({
      annee_scolaire: newTariff.anneeScolaire,
      niveau: newTariff.niveau,
      montant_scolarite: newTariff.montantScolarite,
      frais_inscription: newTariff.fraisInscription,
      frais_annexes: newTariff.fraisAnnexes,
    });

    this.addAuditLog({
      typeAction: 'MODIFICATION_TARIF',
      auteur: 'Secrétaire Principale',
      description: `Nouveau barème tarifaire configuré pour ${newTariff.niveau} (${newTariff.anneeScolaire}) : Total ${newTariff.totalExigible.toLocaleString()} FCFA`,
      details: { niveau: newTariff.niveau, total: newTariff.totalExigible },
      niveauGravite: 'INFO',
    });

    return newTariff;
  }

  static deleteTariff(tariffId: string): boolean {
    const all = this.getAllTarifs();
    const filtered = all.filter((t) => t.id !== tariffId);
    if (filtered.length !== all.length) {
      this.saveTarifs(filtered);
      return true;
    }
    return false;
  }

  static getTarifForClass(classe: string, annee: string = CURRENT_SCHOOL_YEAR): TuitionTariff | null {
    const tarifs = this.getTarifs(annee);
    const normalizedClass = classe.trim().toLowerCase();
    
    // Direct exact match
    const directMatch = tarifs.find((t) => t.niveau.toLowerCase() === normalizedClass);
    if (directMatch) return directMatch;

    // Special match for C' and D'
    if (normalizedClass.includes("c'") || normalizedClass === "c'") {
      const cPrime = tarifs.find((t) => t.niveau === "C'");
      if (cPrime) return cPrime;
    }
    if (normalizedClass.includes("d'") || normalizedClass === "d'") {
      const dPrime = tarifs.find((t) => t.niveau === "D'");
      if (dPrime) return dPrime;
    }

    // Prefix match (ex: '6ème A' -> '6ème')
    const prefixMatch = tarifs.find((t) => normalizedClass.startsWith(t.niveau.toLowerCase()));
    if (prefixMatch) return prefixMatch;

    return null;
  }

  /* ==========================================================================
     GESTION DES ÉLÈVES & IMPORTATION EN MASSE
     ========================================================================== */
  static getStudents(): Student[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveStudents(students: Student[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      notifyListeners();
    }
  }

  static addStudent(
    studentData: Omit<Student, 'id' | 'matricule' | 'montantPaye' | 'dateInscription' | 'statut' | 'anneeScolaire'> & {
      matricule?: string;
      montantPaye?: number;
      anneeScolaire?: string;
    }
  ): Student {
    const students = this.getStudents();
    const count = students.length + 1;
    const matricule = studentData.matricule || `EDU-27-${count.toString().padStart(4, '0')}`;
    const anneeScolaire = studentData.anneeScolaire || CURRENT_SCHOOL_YEAR;

    const newStudent: Student = {
      ...studentData,
      id: 'STU_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      matricule,
      anneeScolaire,
      montantPaye: studentData.montantPaye || 0,
      montantDonTotal: studentData.montantDonTotal || 0,
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'inscrit',
      statutReinscription: studentData.statutReinscription || 'REINSCRIT',
    };

    students.unshift(newStudent);
    this.saveStudents(students);

    // Sync in background with Supabase (eleves & inscriptions_annuelles)
    SupabaseSyncService.syncEleveToSupabase({
      id: newStudent.id,
      matricule: newStudent.matricule,
      nom: newStudent.nom,
      prenom: newStudent.prenom,
      date_naissance: newStudent.dateNaissance,
      classe: newStudent.classe,
      annee_scolaire: newStudent.anneeScolaire,
      scolarite_totale: newStudent.scolariteTotale,
      montant_paye: newStudent.montantPaye,
      montant_don_total: newStudent.montantDonTotal,
      nom_parent: newStudent.nomParent,
      telephone_parent: newStudent.telephoneParent,
      email_parent: newStudent.emailParent,
      adresse_domicile: newStudent.adresse,
      annee_origine: newStudent.anneeOrigine,
      classe_precedente: newStudent.classePrecedente,
      statut_fin_annee: newStudent.statutFinAnnee,
      statut_reinscription: newStudent.statutReinscription,
      decision_bulletin: newStudent.decisionBulletin,
      moyenne_annuelle: newStudent.moyenneAnnuelle,
      etablissement_origine: newStudent.etablissementOrigine,
      motif_venue: newStudent.motifVenue,
      description_motif: newStudent.descriptionVenue,
      bulletin_nom_fichier: newStudent.bulletinNomFichier,
      statut_inscription: newStudent.statut,
    });

    SupabaseSyncService.syncInscriptionAnnuelleToSupabase({
      eleve_id: newStudent.id,
      eleve_matricule: newStudent.matricule,
      annee_scolaire: newStudent.anneeScolaire,
      classe: newStudent.classe,
      scolarite_totale: newStudent.scolariteTotale,
      montant_paye: newStudent.montantPaye,
      statut_reinscription: newStudent.statutReinscription || 'REINSCRIT',
    });

    this.addAuditLog({
      typeAction: 'INSCRIPTION_MANUELLE',
      auteur: 'Secrétaire Principale',
      description: `Inscription de l'élève ${newStudent.prenom} ${newStudent.nom} en classe de ${newStudent.classe} (Matricule: ${newStudent.matricule})`,
      details: { matricule: newStudent.matricule, classe: newStudent.classe, scolarite: newStudent.scolariteTotale },
      niveauGravite: 'INFO',
    });

    return newStudent;
  }

  static updateStudent(student: Student) {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === student.id);
    if (index !== -1) {
      students[index] = student;
      this.saveStudents(students);

      SupabaseSyncService.syncEleveToSupabase({
        id: student.id,
        matricule: student.matricule,
        nom: student.nom,
        prenom: student.prenom,
        date_naissance: student.dateNaissance,
        classe: student.classe,
        annee_scolaire: student.anneeScolaire,
        scolarite_totale: student.scolariteTotale,
        montant_paye: student.montantPaye,
        montant_don_total: student.montantDonTotal,
        nom_parent: student.nomParent,
        telephone_parent: student.telephoneParent,
        email_parent: student.emailParent,
        adresse_domicile: student.adresse,
        annee_origine: student.anneeOrigine,
        classe_precedente: student.classePrecedente,
        statut_fin_annee: student.statutFinAnnee,
        statut_reinscription: student.statutReinscription,
        decision_bulletin: student.decisionBulletin,
        moyenne_annuelle: student.moyenneAnnuelle,
        etablissement_origine: student.etablissementOrigine,
        motif_venue: student.motifVenue,
        description_motif: student.descriptionVenue,
        bulletin_nom_fichier: student.bulletinNomFichier,
        statut_inscription: student.statut,
      });
    }
  }

  static deleteStudent(studentId: string): boolean {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    const filtered = students.filter((s) => s.id !== studentId);
    if (filtered.length !== students.length) {
      this.saveStudents(filtered);
      if (student) {
        SupabaseSyncService.deleteEleveFromSupabase(student.id, student.matricule);
        this.addAuditLog({
          typeAction: 'SUPPRESSION_ELEVE',
          auteur: 'Secrétaire Principale',
          description: `Suppression définitive de l'élève ${student.prenom} ${student.nom} (Matricule: ${student.matricule}, Classe: ${student.classe})`,
          details: { studentId: student.id, matricule: student.matricule, classe: student.classe },
          niveauGravite: 'CRITIQUE',
        });
      }
      return true;
    }
    return false;
  }

  static importStudentsBatch(
    records: Array<{
      matricule: string;
      nom: string;
      prenom: string;
      classeOrigine: string;
      statutFinAnnee: 'PASSANT' | 'REDOUBLANT';
      moyenneAnnuelle?: number;
      telephoneParent?: string;
      nomParent?: string;
      dateNaissance?: string;
    }>,
    anneeOrigine: string = PREVIOUS_SCHOOL_YEAR,
    anneeCible: string = CURRENT_SCHOOL_YEAR
  ): { created: number; updated: number; total: number } {
    const currentStudents = this.getStudents();
    const studentMap = new Map<string, Student>();

    currentStudents.forEach((s) => {
      studentMap.set(s.matricule.trim().toUpperCase(), s);
    });

    let created = 0;
    let updated = 0;

    for (const row of records) {
      const cleanMatricule = row.matricule.trim().toUpperCase();
      if (!cleanMatricule) continue;

      const existing = studentMap.get(cleanMatricule);
      const classeProjetee = this.calculerClasseSuivante(row.classeOrigine, row.statutFinAnnee);
      const tarif = this.getTarifForClass(classeProjetee, anneeCible);
      const scolariteTotale = tarif ? tarif.totalExigible : 200000;

      if (existing) {
        existing.anneeOrigine = anneeOrigine;
        existing.classePrecedente = row.classeOrigine;
        existing.statutFinAnnee = row.statutFinAnnee;
        existing.moyenneAnnuelle = row.moyenneAnnuelle || existing.moyenneAnnuelle;
        if (row.telephoneParent) existing.telephoneParent = row.telephoneParent;
        if (row.nomParent) existing.nomParent = row.nomParent;
        existing.statutReinscription = existing.statutReinscription || 'EN_ATTENTE_REINSCRIPTION';
        updated++;
      } else {
        const newStudent: Student = {
          id: 'STU_IMP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          matricule: cleanMatricule,
          nom: row.nom.trim().toUpperCase(),
          prenom: row.prenom.trim(),
          dateNaissance: row.dateNaissance || '2012-01-01',
          classe: classeProjetee,
          classePrecedente: row.classeOrigine,
          anneeScolaire: anneeCible,
          anneeOrigine,
          statutFinAnnee: row.statutFinAnnee,
          statutReinscription: 'EN_ATTENTE_REINSCRIPTION',
          scolariteTotale,
          montantPaye: 0,
          montantDonTotal: 0,
          nomParent: row.nomParent || 'Parent ' + row.nom.toUpperCase(),
          telephoneParent: row.telephoneParent || '70000000',
          moyenneAnnuelle: row.moyenneAnnuelle,
          dateInscription: new Date().toISOString().split('T')[0],
          statut: 'inscrit',
        };
        studentMap.set(cleanMatricule, newStudent);
        created++;
      }
    }

    const updatedList = Array.from(studentMap.values());
    this.saveStudents(updatedList);

    // Sync in background to Supabase (batch upsert eleves)
    const recordsToSync = updatedList.map((s) => ({
      id: s.id,
      matricule: s.matricule,
      nom: s.nom,
      prenom: s.prenom,
      date_naissance: s.dateNaissance,
      classe: s.classe,
      annee_scolaire: s.anneeScolaire,
      scolarite_totale: s.scolariteTotale,
      montant_paye: s.montantPaye || 0,
      montant_don_total: s.montantDonTotal || 0,
      nom_parent: s.nomParent,
      telephone_parent: s.telephoneParent,
      annee_origine: s.anneeOrigine,
      classe_precedente: s.classePrecedente,
      statut_fin_annee: s.statutFinAnnee,
      statut_reinscription: s.statutReinscription,
      moyenne_annuelle: s.moyenneAnnuelle,
      statut_inscription: s.statut,
    }));
    SupabaseSyncService.syncElevesBatchToSupabase(recordsToSync);

    this.addAuditLog({
      typeAction: 'IMPORT_MASSIF',
      auteur: 'Secrétaire Principale',
      description: `Importation en masse : ${created} nouvel(s) élève(s) créé(s), ${updated} mis à jour (${records.length} lignes traitées)`,
      details: { total: records.length, created, updated, anneeOrigine, anneeCible },
      niveauGravite: 'AVERTISSEMENT',
    });

    return { created, updated, total: records.length };
  }

  static reenrollStudent(
    studentId: string,
    nouvelleClasse: string,
    nouvelleScolariteTotale: number,
    options?: {
      telephoneParent?: string;
      nomParent?: string;
    }
  ): Student | null {
    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return null;

    student.classe = nouvelleClasse;
    student.anneeScolaire = CURRENT_SCHOOL_YEAR;
    student.scolariteTotale = nouvelleScolariteTotale;
    student.statutReinscription = 'REINSCRIT';
    student.dateInscription = new Date().toISOString().split('T')[0];

    if (options?.telephoneParent) student.telephoneParent = options.telephoneParent;
    if (options?.nomParent) student.nomParent = options.nomParent;

    this.saveStudents(students);

    // Sync updated re-enrollment status and annual registration to Supabase
    SupabaseSyncService.syncEleveToSupabase({
      id: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      classe: student.classe,
      annee_scolaire: student.anneeScolaire,
      scolarite_totale: student.scolariteTotale,
      montant_paye: student.montantPaye,
      montant_don_total: student.montantDonTotal,
      nom_parent: student.nomParent,
      telephone_parent: student.telephoneParent,
      statut_reinscription: 'REINSCRIT',
      classe_precedente: student.classePrecedente,
      statut_fin_annee: student.statutFinAnnee,
      annee_origine: student.anneeOrigine,
    });

    SupabaseSyncService.syncInscriptionAnnuelleToSupabase({
      eleve_id: student.id,
      eleve_matricule: student.matricule,
      annee_scolaire: CURRENT_SCHOOL_YEAR,
      classe: student.classe,
      scolarite_totale: student.scolariteTotale,
      montant_paye: student.montantPaye || 0,
      statut_reinscription: 'REINSCRIT',
    });

    this.addAuditLog({
      typeAction: 'REINSCRIPTION_EFFECTUEE',
      auteur: 'Secrétaire Principale',
      description: `Réinscription confirmée pour ${student.prenom} ${student.nom} (${student.matricule}) en classe de ${student.classe}`,
      details: { matricule: student.matricule, classe: student.classe, scolariteTotale: nouvelleScolariteTotale },
      niveauGravite: 'INFO',
    });

    return student;
  }

  static calculerClasseSuivante(classeActuelle: string, decision: 'PASSANT' | 'REDOUBLANT'): string {
    if (decision === 'REDOUBLANT') {
      return classeActuelle;
    }

    const cycleProgression: Record<string, string> = {
      '6ème': '5ème',
      '5ème': '4ème',
      '4ème': '3ème',
      '3ème': '2nde A',
      '2nde A': '1ère A',
      '2nde C': '1ère D',
      '1ère A': 'Tle A',
      '1ère D': 'Tle D',
      // Classes techniques
      'BEP 1': 'BEP 2',
      'BEP 2': 'Bac Pro 1',
      'Bac Pro 1': 'Bac Pro 2',
      "C'": "D'",
    };

    const clean = classeActuelle.trim();
    for (const [curr, next] of Object.entries(cycleProgression)) {
      if (clean.toLowerCase().startsWith(curr.toLowerCase())) {
        return next;
      }
    }

    return classeActuelle;
  }

  /* ==========================================================================
     PAIEMENTS & ENCAISSEMENTS
     ========================================================================== */
  static getPayments(): Payment[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static savePayments(payments: Payment[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      notifyListeners();
    }
  }

  static addPayment(payment: Payment) {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.savePayments(payments);

    // Only update student balance if already confirmed (ex: cash desk)
    if (payment.statut === 'SUCCES') {
      const students = this.getStudents();
      const studentIndex = students.findIndex((s) => s.id === payment.studentId);
      if (studentIndex !== -1) {
        const student = students[studentIndex];
        student.montantPaye = (student.montantPaye || 0) + payment.montantScolarite;
        student.montantDonTotal = (student.montantDonTotal || 0) + (payment.montantDon || 0);
        this.saveStudents(students);
      }
    }

    // Sync in background to Supabase
    SupabaseSyncService.syncPaiementToSupabase({
      id: payment.id,
      reference_quittance: payment.reference,
      annee_scolaire: payment.anneeScolaire || CURRENT_SCHOOL_YEAR,
      eleve_id: payment.studentId,
      eleve_matricule: payment.studentMatricule,
      nom_eleve: payment.studentNom,
      classe_eleve: payment.studentClasse,
      montant_total: payment.montant,
      montant_scolarite: payment.montantScolarite,
      montant_don: payment.montantDon,
      mode_paiement: payment.mode,
      encaisse_par: payment.encaissePar,
      statut_paiement: payment.statut,
      nom_payeur: payment.nomPayeur,
      telephone_payeur: payment.telephonePayeur,
      nom_agent: payment.agentNom,
      observations: payment.notes,
    });

    const isEspeces = payment.mode === 'ESPECES_GUICHET';
    this.addAuditLog({
      typeAction: isEspeces ? 'ENCAISSEMENT_ESPECES' : 'PAIEMENT_MOBILE_MONEY',
      auteur: payment.agentNom || payment.encaissePar || 'Caisse Secrétariat',
      description: payment.statut === 'EN_ATTENTE_VERIFICATION'
        ? `Nouvelle notification Mobile Money (${payment.mode}) de ${payment.montant.toLocaleString()} FCFA soumise par ${payment.nomPayeur} - En attente de vérification bancaire/SMS par la secrétaire`
        : `Règlement de ${payment.montant.toLocaleString()} FCFA pour ${payment.studentNom} (${payment.studentClasse}) - Quittance : ${payment.reference}`,
      details: {
        reference: payment.reference,
        montant: payment.montant,
        mode: payment.mode,
        payeur: payment.nomPayeur,
        matricule: payment.studentMatricule,
        statut: payment.statut,
      },
      niveauGravite: payment.statut === 'EN_ATTENTE_VERIFICATION' ? 'AVERTISSEMENT' : 'INFO',
    });
  }

  /**
   * Validation définitive d'un paiement Mobile Money par la secrétaire
   * (après vérification de la réception effective des fonds sur le compte de l'école)
   */
  static validateMobileMoneyPayment(paymentId: string, agentNom: string = 'Secrétaire Principale'): Payment | null {
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) return null;

    const payment = payments[index];
    payment.statut = 'SUCCES';
    payment.dateValidationSecretaire = new Date().toISOString();
    payment.agentNom = agentNom;
    this.savePayments(payments);

    // Update student balance
    const students = this.getStudents();
    const studentIndex = students.findIndex((s) => s.id === payment.studentId);
    if (studentIndex !== -1) {
      const student = students[studentIndex];
      student.montantPaye = (student.montantPaye || 0) + payment.montantScolarite;
      student.montantDonTotal = (student.montantDonTotal || 0) + (payment.montantDon || 0);
      this.saveStudents(students);
    }

    // Sync to Supabase
    SupabaseSyncService.syncPaiementToSupabase({
      id: payment.id,
      reference_quittance: payment.reference,
      annee_scolaire: payment.anneeScolaire || CURRENT_SCHOOL_YEAR,
      eleve_id: payment.studentId,
      eleve_matricule: payment.studentMatricule,
      nom_eleve: payment.studentNom,
      classe_eleve: payment.studentClasse,
      montant_total: payment.montant,
      montant_scolarite: payment.montantScolarite,
      montant_don: payment.montantDon,
      mode_paiement: payment.mode,
      encaisse_par: 'SECRETAIRE_GUICHET',
      statut_paiement: 'SUCCES',
      nom_payeur: payment.nomPayeur,
      telephone_payeur: payment.telephonePayeur,
      nom_agent: agentNom,
      observations: `Paiement Mobile Money vérifié et validé par ${agentNom}. Reçu officiel débloqué.`,
    });

    this.addAuditLog({
      typeAction: 'VALIDATION_PAIEMENT_MOBILE_MONEY',
      auteur: agentNom,
      description: `Validation & Quittance émise pour ${payment.studentNom} (${payment.studentClasse}) - Montant vérifié : ${payment.montant.toLocaleString()} FCFA (${payment.mode})`,
      details: {
        reference: payment.reference,
        montant: payment.montant,
        mode: payment.mode,
        payeur: payment.nomPayeur,
        matricule: payment.studentMatricule,
      },
      niveauGravite: 'INFO',
    });

    return payment;
  }

  /**
   * Rejet d'un paiement Mobile Money si les fonds n'ont pas été reçus sur le téléphone de l'école
   */
  static rejectMobileMoneyPayment(paymentId: string, motif: string = 'Fonds non reçus sur le numéro de l\'établissement'): Payment | null {
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) return null;

    const payment = payments[index];
    payment.statut = 'ECHOUE';
    payment.motifRejetPaiement = motif;
    this.savePayments(payments);

    // Sync to Supabase
    SupabaseSyncService.syncPaiementToSupabase({
      id: payment.id,
      reference_quittance: payment.reference,
      annee_scolaire: payment.anneeScolaire || CURRENT_SCHOOL_YEAR,
      eleve_id: payment.studentId,
      eleve_matricule: payment.studentMatricule,
      nom_eleve: payment.studentNom,
      classe_eleve: payment.studentClasse,
      montant_total: payment.montant,
      montant_scolarite: payment.montantScolarite,
      montant_don: payment.montantDon,
      mode_paiement: payment.mode,
      encaisse_par: payment.encaissePar,
      statut_paiement: 'ECHOUE',
      nom_payeur: payment.nomPayeur,
      telephone_payeur: payment.telephonePayeur,
      observations: `Paiement rejeté par la caisse. Motif : ${motif}`,
    });

    this.addAuditLog({
      typeAction: 'REJET_PAIEMENT_MOBILE_MONEY',
      auteur: 'Secrétaire Principale',
      description: `Rejet du paiement Mobile Money de ${payment.montant.toLocaleString()} FCFA pour ${payment.studentNom} - Motif : ${motif}`,
      details: { reference: payment.reference, montant: payment.montant, motif },
      niveauGravite: 'CRITIQUE',
    });

    return payment;
  }

  /* ==========================================================================
     DEMANDES D'ADMISSION EN LIGNE
     ========================================================================== */
  static getAdmissions(): AdmissionRequest[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADMISSIONS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveAdmissions(admissions: AdmissionRequest[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ADMISSIONS, JSON.stringify(admissions));
      notifyListeners();
    }
  }

  static addAdmissionRequest(
    request: Omit<AdmissionRequest, 'id' | 'dateDemande' | 'statut' | 'anneeScolaire'> & {
      anneeScolaire?: string;
    }
  ): AdmissionRequest {
    const admissions = this.getAdmissions();
    const newReq: AdmissionRequest = {
      ...request,
      id: 'ADM_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      dateDemande: new Date().toISOString(),
      statut: 'en_attente',
      anneeScolaire: request.anneeScolaire || CURRENT_SCHOOL_YEAR,
    };
    admissions.unshift(newReq);
    this.saveAdmissions(admissions);

    // Sync to Supabase demandes_admission
    SupabaseSyncService.syncDemandeAdmissionToSupabase({
      id: newReq.id,
      annee_scolaire: newReq.anneeScolaire || CURRENT_SCHOOL_YEAR,
      nom_enfant: newReq.nomEnfant,
      prenom_enfant: newReq.prenomEnfant,
      date_naissance: newReq.dateNaissance,
      classe_demandee: newReq.classeDemandee,
      nom_parent: newReq.nomParent,
      telephone_parent: newReq.telephoneParent,
      email_parent: newReq.emailParent,
      adresse_domicile: newReq.adresse,
      est_nouvel_eleve: newReq.estNouveauTransfert,
      etablissement_origine: newReq.etablissementOrigine,
      decision_bulletin: newReq.decisionBulletin,
      moyenne_annuelle: newReq.moyenneAnnuelle,
      motif_venue: newReq.motifVenue,
      description_motif: newReq.descriptionVenue || '',
      bulletin_nom_fichier: newReq.bulletinNomFichier,
      montant_don: newReq.montantDon,
      statut_admission: 'EN_ATTENTE',
    });

    return newReq;
  }

  static acceptAdmission(requestId: string, customScolarite?: number): Student | null {
    const admissions = this.getAdmissions();
    const req = admissions.find((a) => a.id === requestId);
    if (!req) return null;

    const tarif = this.getTarifForClass(req.classeDemandee, req.anneeScolaire || CURRENT_SCHOOL_YEAR);
    const scolariteTotale = customScolarite !== undefined ? customScolarite : (tarif ? tarif.totalExigible : 200000);

    const student = this.addStudent({
      nom: req.nomEnfant.toUpperCase(),
      prenom: req.prenomEnfant,
      dateNaissance: req.dateNaissance,
      classe: req.classeDemandee,
      anneeScolaire: req.anneeScolaire || CURRENT_SCHOOL_YEAR,
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
      statutReinscription: 'REINSCRIT',
    });

    req.statut = 'accepte';
    req.matriculeAttribue = student.matricule;
    this.saveAdmissions(admissions);

    SupabaseSyncService.syncDemandeAdmissionToSupabase({
      id: req.id,
      annee_scolaire: req.anneeScolaire || CURRENT_SCHOOL_YEAR,
      nom_enfant: req.nomEnfant,
      prenom_enfant: req.prenomEnfant,
      classe_demandee: req.classeDemandee,
      nom_parent: req.nomParent,
      telephone_parent: req.telephoneParent,
      description_motif: req.descriptionVenue || '',
      statut_admission: 'ACCEPTE',
      matricule_attribue: student.matricule,
    });

    this.addAuditLog({
      typeAction: 'VALIDATION_ADMISSION',
      auteur: 'Secrétaire Principale',
      description: `Validation du dossier d'admission de ${req.prenomEnfant} ${req.nomEnfant} (${req.classeDemandee}). Matricule attribué : ${student.matricule}`,
      details: { requestId: req.id, matricule: student.matricule, classe: req.classeDemandee, scolariteTotale },
      niveauGravite: 'INFO',
    });

    return student;
  }

  static rejectAdmission(requestId: string, motif?: string) {
    const admissions = this.getAdmissions();
    const req = admissions.find((a) => a.id === requestId);
    if (req) {
      req.statut = 'refuse';
      req.motifRefus = motif || 'Places indisponibles ou dossier non retenu.';
      this.saveAdmissions(admissions);

      SupabaseSyncService.syncDemandeAdmissionToSupabase({
        id: req.id,
        annee_scolaire: req.anneeScolaire || CURRENT_SCHOOL_YEAR,
        nom_enfant: req.nomEnfant,
        prenom_enfant: req.prenomEnfant,
        classe_demandee: req.classeDemandee,
        nom_parent: req.nomParent,
        telephone_parent: req.telephoneParent,
        description_motif: req.descriptionVenue || '',
        statut_admission: 'REFUSE',
        motif_refus: req.motifRefus,
      });

      this.addAuditLog({
        typeAction: 'REFUS_ADMISSION',
        auteur: 'Secrétaire Principale',
        description: `Refus de la demande d'admission pour ${req.prenomEnfant} ${req.nomEnfant} (${req.classeDemandee}). Motif : ${req.motifRefus}`,
        details: { requestId: req.id, motif: req.motifRefus },
        niveauGravite: 'AVERTISSEMENT',
      });
    }
  }

  /* ==========================================================================
     JOURNAL D'AUDIT & TRAÇABILITÉ (Transparence totale)
     ========================================================================== */
  static getAuditLogs(): AuditLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveAuditLogs(logs: AuditLog[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
      notifyListeners();
    }
  }

  static addAuditLog(entry: {
    typeAction: AuditActionType;
    auteur?: string;
    description: string;
    details?: Record<string, unknown>;
    niveauGravite?: 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE';
  }): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'LOG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      dateAction: new Date().toISOString(),
      typeAction: entry.typeAction,
      auteur: entry.auteur || 'Secrétaire Principale',
      description: entry.description,
      details: entry.details,
      niveauGravite: entry.niveauGravite || 'INFO',
    };
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop();
    this.saveAuditLogs(logs);

    // Sync direct to Supabase
    SupabaseSyncService.syncAuditLogToSupabase({
      id: newLog.id,
      date_action: newLog.dateAction,
      type_action: newLog.typeAction,
      auteur: newLog.auteur,
      description: newLog.description,
      details: newLog.details,
      niveau_gravite: newLog.niveauGravite,
    });

    return newLog;
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

  static clearAllData() {
    this.saveStudents([]);
    this.saveAdmissions([]);
    this.savePayments([]);
    this.saveTarifs(DEFAULT_TARIFS_2027_2028);
    this.saveAuditLogs([]);
  }

  static subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
}
