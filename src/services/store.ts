import { AdmissionRequest, Payment, SchoolInfo, Student, TuitionTariff, AuditLog, AuditActionType } from '../types';
import { getActiveAuthScope, getParentAccount, getStaffSession, SupabaseSyncService } from './supabaseClient';

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
  OUTBOX: 'edupay_sync_outbox_v5',
};

// Nettoyer d'anciens caches globaux non isolés par compte s'ils existent encore
if (typeof window !== 'undefined') {
  try {
    [
      STORAGE_KEYS.STUDENTS,
      STORAGE_KEYS.ADMISSIONS,
      STORAGE_KEYS.PAYMENTS,
      STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.OUTBOX,
      'edupay_parent_read_messages_v5',
    ].forEach((legacyKey) => {
      localStorage.removeItem(legacyKey);
    });
  } catch {
    // ignore storage cleanup errors
  }
}

export type OutboxKind = 'ELEVE' | 'INSCRIPTION' | 'DEMANDE' | 'PAIEMENT' | 'AUDIT' | 'TARIF';

export interface OutboxEntry {
  key: string;
  kind: OutboxKind;
  recordId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  lastError?: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const memoryFallbackStore: Record<string, string> = {};
let activeStoreScope = 'public';

function scopedKey(baseKey: string): string {
  return `${baseKey}__${activeStoreScope}`;
}

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key) ?? memoryFallbackStore[key] ?? null;
  } catch {
    return memoryFallbackStore[key] ?? null;
  }
}

function safeSetItem(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(value);
  memoryFallbackStore[key] = serialized;
  try {
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`[SchoolStore] Quota localStorage dépassé pour ${key}, nettoyage des aperçus lourds...`, err);
    if (key.startsWith(STORAGE_KEYS.ADMISSIONS) && Array.isArray(value)) {
      try {
        const trimmed = value.map((item, idx) =>
          idx === 0
            ? item
            : { ...item, bulletinUrl: undefined, extraitNaissanceUrl: undefined }
        );
        const trimmedStr = JSON.stringify(trimmed);
        memoryFallbackStore[key] = trimmedStr;
        localStorage.setItem(key, trimmedStr);
        return;
      } catch {
        try {
          const minimal = value.map((item) => ({
            ...item,
            bulletinUrl: undefined,
            extraitNaissanceUrl: undefined,
          }));
          const minimalStr = JSON.stringify(minimal);
          localStorage.setItem(key, minimalStr);
          return;
        } catch {
          // Keep in-memory fallback only
        }
      }
    } else if (key.startsWith(STORAGE_KEYS.OUTBOX) && Array.isArray(value)) {
      try {
        const trimmed = value.map((entry: OutboxEntry) => ({
          ...entry,
          payload: {
            ...entry.payload,
            bulletin_url: undefined,
            extrait_naissance_url: undefined,
          },
        }));
        const trimmedStr = JSON.stringify(trimmed);
        memoryFallbackStore[key] = trimmedStr;
        localStorage.setItem(key, trimmedStr);
      } catch {
        // Keep in-memory fallback only
      }
    }
  }
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('edupay_storage_change'));
  }
}

export class SchoolStore {
  static setScope(scope: string) {
    const clean = (scope || 'public').replace(/[^a-zA-Z0-9_:-]/g, '_');
    if (activeStoreScope !== clean) {
      activeStoreScope = clean;
      notifyListeners();
    }
  }

  static getScope(): string {
    return activeStoreScope;
  }

  private static getActiveStaffAuthor(): string {
    return getStaffSession()?.author || 'Secrétaire Principale';
  }
  /* ==========================================================================
     TARIFS DE SCOLARITÉ DYNAMIQUES (Synchronisé Supabase)
     ========================================================================== */
  static getTarifs(annee: string = CURRENT_SCHOOL_YEAR): TuitionTariff[] {
    if (typeof window === 'undefined') return DEFAULT_TARIFS_2027_2028;
    try {
      const stored = safeGetItem(STORAGE_KEYS.TARIFS);
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
      const stored = safeGetItem(STORAGE_KEYS.TARIFS);
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
      safeSetItem(STORAGE_KEYS.TARIFS, tarifs);
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
      auteur: this.getActiveStaffAuthor(),
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
      auteur: this.getActiveStaffAuthor(),
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
    if (typeof window === 'undefined' || activeStoreScope === 'public') return [];
    try {
      const stored = safeGetItem(scopedKey(STORAGE_KEYS.STUDENTS));
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveStudents(students: Student[]) {
    if (typeof window !== 'undefined') {
      if (activeStoreScope !== 'public') {
        safeSetItem(scopedKey(STORAGE_KEYS.STUDENTS), students);
      }
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

    // Sync sequentially (eleve must exist in Postgres before inscriptions_annuelles FK)
    const stuPayload = this.buildStudentPayload(newStudent);
    const inscPayload = {
      eleve_id: newStudent.id,
      eleve_matricule: newStudent.matricule,
      annee_scolaire: newStudent.anneeScolaire,
      classe: newStudent.classe,
      scolarite_totale: newStudent.scolariteTotale,
      montant_paye: newStudent.montantPaye,
      statut_reinscription: newStudent.statutReinscription || 'REINSCRIT',
    };
    this.enqueueOutbox('ELEVE', newStudent.id, stuPayload);
    this.enqueueOutbox('INSCRIPTION', newStudent.id, inscPayload);

    void (async () => {
      const stuRes = await SupabaseSyncService.syncEleveToSupabase(stuPayload);
      if (stuRes.ok) {
        this.removeOutbox('ELEVE', newStudent.id);
        const inscRes = await SupabaseSyncService.syncInscriptionAnnuelleToSupabase(inscPayload);
        if (inscRes.ok) this.removeOutbox('INSCRIPTION', newStudent.id);
      }
    })();

    this.addAuditLog({
      typeAction: 'INSCRIPTION_MANUELLE',
      auteur: this.getActiveStaffAuthor(),
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

      SupabaseSyncService.syncEleveToSupabase(this.buildStudentPayload(student));
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
          auteur: this.getActiveStaffAuthor(),
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
    const recordsToSync = updatedList.map((s) => this.buildStudentPayload(s));
    SupabaseSyncService.syncElevesBatchToSupabase(recordsToSync);

    this.addAuditLog({
      typeAction: 'IMPORT_MASSIF',
      auteur: this.getActiveStaffAuthor(),
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

    if (getActiveAuthScope() === 'parent' && getParentAccount()) {
      void SupabaseSyncService.parentReenrollStudent({
        studentId: student.id,
        targetClass: nouvelleClasse,
        nomParent: options?.nomParent || student.nomParent,
        telephoneParent: options?.telephoneParent || student.telephoneParent,
        anneeScolaire: CURRENT_SCHOOL_YEAR,
      });
      return student;
    }

    // Sync sequentially (eleve must exist in Postgres before inscriptions_annuelles FK)
    const stuPayload = this.buildStudentPayload(student);
    const inscPayload = {
      eleve_id: student.id,
      eleve_matricule: student.matricule,
      annee_scolaire: CURRENT_SCHOOL_YEAR,
      classe: student.classe,
      scolarite_totale: student.scolariteTotale,
      montant_paye: student.montantPaye || 0,
      statut_reinscription: 'REINSCRIT',
    };
    this.enqueueOutbox('ELEVE', student.id, stuPayload);
    this.enqueueOutbox('INSCRIPTION', student.id, inscPayload);

    void (async () => {
      const stuRes = await SupabaseSyncService.syncEleveToSupabase(stuPayload);
      if (stuRes.ok) {
        this.removeOutbox('ELEVE', student.id);
        const inscRes = await SupabaseSyncService.syncInscriptionAnnuelleToSupabase(inscPayload);
        if (inscRes.ok) this.removeOutbox('INSCRIPTION', student.id);
      }
    })();

    this.addAuditLog({
      typeAction: 'REINSCRIPTION_EFFECTUEE',
      auteur: this.getActiveStaffAuthor(),
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
     FILE D'ATTENTE DE SYNCHRONISATION (OUTBOX ANTI-PERTE)
     ========================================================================== */
  static getOutbox(): OutboxEntry[] {
    if (typeof window === 'undefined' || activeStoreScope === 'public') return [];
    try {
      const stored = safeGetItem(scopedKey(STORAGE_KEYS.OUTBOX));
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  static saveOutbox(entries: OutboxEntry[]) {
    if (typeof window !== 'undefined' && activeStoreScope !== 'public') {
      safeSetItem(scopedKey(STORAGE_KEYS.OUTBOX), entries);
    }
  }

  static enqueueOutbox(
    kind: OutboxKind,
    recordId: string,
    payload: Record<string, unknown>,
    lastError?: string
  ) {
    const entries = this.getOutbox();
    const key = `${kind}:${recordId}`;
    const existingIdx = entries.findIndex((e) => e.key === key);
    const entry: OutboxEntry = {
      key,
      kind,
      recordId,
      payload,
      createdAt: new Date().toISOString(),
      lastError,
    };
    if (existingIdx !== -1) {
      entries[existingIdx] = entry;
    } else {
      entries.push(entry);
    }
    this.saveOutbox(entries);
  }

  static removeOutbox(kind: OutboxKind, recordId: string) {
    const entries = this.getOutbox();
    const key = `${kind}:${recordId}`;
    const filtered = entries.filter((e) => e.key !== key);
    if (filtered.length !== entries.length) {
      this.saveOutbox(filtered);
    }
  }

  static async flushOutbox(): Promise<{ flushed: number; remaining: number }> {
    const entries = this.getOutbox();
    if (entries.length === 0) return { flushed: 0, remaining: 0 };

    // Respect foreign key dependencies: ELEVE first, then TARIF/INSCRIPTION/DEMANDE/PAIEMENT/AUDIT
    const order: Record<OutboxKind, number> = {
      TARIF: 1,
      ELEVE: 2,
      INSCRIPTION: 3,
      DEMANDE: 4,
      PAIEMENT: 5,
      AUDIT: 6,
    };
    const sorted = [...entries].sort((a, b) => order[a.kind] - order[b.kind]);
    const remaining: OutboxEntry[] = [];
    let flushed = 0;

    for (const item of sorted) {
      let res: { ok: boolean; error?: string } = { ok: false };
      if (item.kind === 'ELEVE') {
        res = await SupabaseSyncService.syncEleveToSupabase(item.payload);
      } else if (item.kind === 'DEMANDE') {
        res = await SupabaseSyncService.syncDemandeAdmissionToSupabase(item.payload);
      } else if (item.kind === 'PAIEMENT') {
        res = await SupabaseSyncService.syncPaiementToSupabase(item.payload);
      } else if (item.kind === 'INSCRIPTION') {
        res = await SupabaseSyncService.syncInscriptionAnnuelleToSupabase(item.payload as any);
      } else if (item.kind === 'TARIF') {
        res = await SupabaseSyncService.syncTarifToSupabase(item.payload as any);
      } else if (item.kind === 'AUDIT') {
        res = await SupabaseSyncService.syncAuditLogToSupabase(item.payload as any);
      }

      if (res.ok) {
        flushed++;
      } else {
        remaining.push({ ...item, lastError: res.error });
      }
    }

    this.saveOutbox(remaining);
    return { flushed, remaining: remaining.length };
  }

  private static buildStudentPayload(student: Student): Record<string, unknown> {
    return {
      id: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      date_naissance: student.dateNaissance || null,
      classe: student.classe,
      annee_scolaire: student.anneeScolaire,
      scolarite_totale: student.scolariteTotale,
      montant_paye: student.montantPaye || 0,
      montant_don_total: student.montantDonTotal || 0,
      parent_compte_id: student.parentCompteId || null,
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
      extrait_naissance_nom_fichier: student.extraitNaissanceNomFichier,
      statut_inscription: student.statut,
    };
  }

  private static buildPaymentPayload(payment: Payment, overrideObservations?: string): Record<string, unknown> {
    return {
      id: payment.id,
      reference_quittance: payment.reference,
      annee_scolaire: payment.anneeScolaire || CURRENT_SCHOOL_YEAR,
      parent_compte_id: payment.parentCompteId || getParentAccount()?.id || null,
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
      code_validation_otp: payment.codeOtp,
      nom_payeur: payment.nomPayeur,
      telephone_payeur: payment.telephonePayeur,
      nom_agent: payment.agentNom,
      observations: overrideObservations ?? payment.notes,
    };
  }

  private static buildAdmissionPayload(req: AdmissionRequest): Record<string, unknown> {
    const safeAvg =
      req.moyenneAnnuelle !== undefined && !Number.isNaN(req.moyenneAnnuelle)
        ? Math.round(Math.min(20, Math.max(0, Number(req.moyenneAnnuelle))) * 100) / 100
        : undefined;
    const safeFileName = req.bulletinNomFichier ? req.bulletinNomFichier.slice(0, 200) : undefined;
    const safeExtraitName = req.extraitNaissanceNomFichier ? req.extraitNaissanceNomFichier.slice(0, 200) : undefined;
    const statutUpper =
      req.statut === 'accepte' ? 'ACCEPTE' : req.statut === 'refuse' ? 'REFUSE' : 'EN_ATTENTE';

    return {
      id: req.id,
      annee_scolaire: req.anneeScolaire || CURRENT_SCHOOL_YEAR,
      parent_compte_id: req.parentCompteId || getParentAccount()?.id || null,
      nom_enfant: req.nomEnfant.slice(0, 100),
      prenom_enfant: req.prenomEnfant.slice(0, 100),
      date_naissance: req.dateNaissance || '2018-01-01',
      classe_demandee: req.classeDemandee.slice(0, 50),
      nom_parent: req.nomParent.slice(0, 150),
      telephone_parent: req.telephoneParent.slice(0, 50),
      email_parent: req.emailParent ? req.emailParent.slice(0, 150) : undefined,
      adresse_domicile: req.adresse,
      est_nouvel_eleve: req.estNouveauTransfert,
      etablissement_origine: req.etablissementOrigine ? req.etablissementOrigine.slice(0, 250) : undefined,
      decision_bulletin: req.decisionBulletin,
      moyenne_annuelle: safeAvg,
      motif_venue: req.motifVenue,
      description_motif: req.descriptionVenue?.trim() || "Demande d'inscription en ligne",
      bulletin_nom_fichier: safeFileName,
      bulletin_url: req.bulletinUrl || null,
      extrait_naissance_nom_fichier: safeExtraitName || null,
      extrait_naissance_url: req.extraitNaissanceUrl || null,
      observations_secretaire: req.notes || null,
      montant_don: Number(req.montantDon) || 0,
      statut_admission: statutUpper,
      matricule_attribue: req.matriculeAttribue,
      motif_refus: req.motifRefus,
      date_traitement: req.dateTraitement,
    };
  }

  /* ==========================================================================
     PAIEMENTS & ENCAISSEMENTS
     ========================================================================== */
  static getPayments(): Payment[] {
    if (typeof window === 'undefined' || activeStoreScope === 'public') return [];
    try {
      const stored = safeGetItem(scopedKey(STORAGE_KEYS.PAYMENTS));
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static savePayments(payments: Payment[]) {
    if (typeof window !== 'undefined') {
      if (activeStoreScope !== 'public') {
        safeSetItem(scopedKey(STORAGE_KEYS.PAYMENTS), payments);
      }
      notifyListeners();
    }
  }

  private static preparePaymentLocally(payment: Payment): { updatedStudent?: Student } {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.savePayments(payments);

    let updatedStudent: Student | undefined;
    if (payment.statut === 'SUCCES') {
      const students = this.getStudents();
      const studentIndex = students.findIndex((s) => s.id === payment.studentId);
      if (studentIndex !== -1) {
        const student = { ...students[studentIndex] };
        student.montantPaye = (student.montantPaye || 0) + payment.montantScolarite;
        student.montantDonTotal = (student.montantDonTotal || 0) + (payment.montantDon || 0);
        students[studentIndex] = student;
        this.saveStudents(students);
        updatedStudent = student;
      }
    }

    const isEspeces = payment.mode === 'ESPECES_GUICHET';
    this.addAuditLog({
      typeAction: isEspeces ? 'ENCAISSEMENT_ESPECES' : 'PAIEMENT_MOBILE_MONEY',
      auteur: payment.agentNom || payment.encaissePar || 'Caisse Secrétariat',
      description:
        payment.statut === 'EN_ATTENTE_VERIFICATION'
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

    return { updatedStudent };
  }

  static async addPaymentAsync(payment: Payment): Promise<{ synced: boolean; error?: string }> {
    const { updatedStudent } = this.preparePaymentLocally(payment);
    const payPayload = this.buildPaymentPayload(payment);
    this.enqueueOutbox('PAIEMENT', payment.id, payPayload);

    if (updatedStudent) {
      const stuPayload = this.buildStudentPayload(updatedStudent);
      this.enqueueOutbox('ELEVE', updatedStudent.id, stuPayload);
      const stuRes = await SupabaseSyncService.syncEleveToSupabase(stuPayload);
      if (stuRes.ok) {
        this.removeOutbox('ELEVE', updatedStudent.id);
      }
    }

    const payRes = await SupabaseSyncService.syncPaiementToSupabase(payPayload);
    if (payRes.ok) {
      this.removeOutbox('PAIEMENT', payment.id);
      return { synced: true };
    }
    this.enqueueOutbox('PAIEMENT', payment.id, payPayload, payRes.error);
    return { synced: false, error: payRes.error };
  }

  static addPayment(payment: Payment) {
    void this.addPaymentAsync(payment);
  }

  /**
   * Validation définitive d'un paiement Mobile Money par la secrétaire
   * (après vérification de la réception effective des fonds sur le compte de l'école)
   */
  static validateMobileMoneyPayment(paymentId: string, agentNom?: string): Payment | null {
    const resolvedAgent = agentNom || this.getActiveStaffAuthor();
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) return null;

    const payment = { ...payments[index] };
    payment.statut = 'SUCCES';
    payment.dateValidationSecretaire = new Date().toISOString();
    payment.agentNom = resolvedAgent;
    payment.encaissePar = 'SECRETAIRE_GUICHET';
    payments[index] = payment;
    this.savePayments(payments);

    // Update student balance AND sync updated student balance to Supabase
    const students = this.getStudents();
    const studentIndex = students.findIndex((s) => s.id === payment.studentId);
    let updatedStudent: Student | undefined;
    if (studentIndex !== -1) {
      const student = { ...students[studentIndex] };
      student.montantPaye = (student.montantPaye || 0) + payment.montantScolarite;
      student.montantDonTotal = (student.montantDonTotal || 0) + (payment.montantDon || 0);
      students[studentIndex] = student;
      this.saveStudents(students);
      updatedStudent = student;
    }

    const payPayload = this.buildPaymentPayload(
      payment,
      `Paiement Mobile Money vérifié et validé par ${resolvedAgent}. Reçu officiel débloqué.`
    );
    this.enqueueOutbox('PAIEMENT', payment.id, payPayload);

    void (async () => {
      if (updatedStudent) {
        const stuPayload = this.buildStudentPayload(updatedStudent);
        this.enqueueOutbox('ELEVE', updatedStudent.id, stuPayload);
        const stuRes = await SupabaseSyncService.syncEleveToSupabase(stuPayload);
        if (stuRes.ok) this.removeOutbox('ELEVE', updatedStudent.id);
      }
      const payRes = await SupabaseSyncService.syncPaiementToSupabase(payPayload);
      if (payRes.ok) {
        this.removeOutbox('PAIEMENT', payment.id);
      } else {
        this.enqueueOutbox('PAIEMENT', payment.id, payPayload, payRes.error);
      }
    })();

    this.addAuditLog({
      typeAction: 'VALIDATION_PAIEMENT_MOBILE_MONEY',
      auteur: resolvedAgent,
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
  static rejectMobileMoneyPayment(
    paymentId: string,
    motif: string = "Fonds non reçus sur le numéro de l'établissement"
  ): Payment | null {
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) return null;

    const payment = { ...payments[index] };
    payment.statut = 'ECHOUE';
    payment.motifRejetPaiement = motif;
    payments[index] = payment;
    this.savePayments(payments);

    const payPayload = this.buildPaymentPayload(payment, `Paiement rejeté par la caisse. Motif : ${motif}`);
    this.enqueueOutbox('PAIEMENT', payment.id, payPayload);
    void SupabaseSyncService.syncPaiementToSupabase(payPayload).then((res) => {
      if (res.ok) {
        this.removeOutbox('PAIEMENT', payment.id);
      } else {
        this.enqueueOutbox('PAIEMENT', payment.id, payPayload, res.error);
      }
    });

    this.addAuditLog({
      typeAction: 'REJET_PAIEMENT_MOBILE_MONEY',
      auteur: this.getActiveStaffAuthor(),
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
    if (typeof window === 'undefined' || activeStoreScope === 'public') return [];
    try {
      const stored = safeGetItem(scopedKey(STORAGE_KEYS.ADMISSIONS));
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveAdmissions(admissions: AdmissionRequest[]) {
    if (typeof window !== 'undefined') {
      if (activeStoreScope !== 'public') {
        safeSetItem(scopedKey(STORAGE_KEYS.ADMISSIONS), admissions);
      }
      notifyListeners();
    }
  }

  private static createAdmissionLocally(
    request: Omit<AdmissionRequest, 'id' | 'dateDemande' | 'statut' | 'anneeScolaire'> & {
      anneeScolaire?: string;
    }
  ): AdmissionRequest {
    const admissions = this.getAdmissions();
    const safeAvg =
      request.moyenneAnnuelle !== undefined && !Number.isNaN(request.moyenneAnnuelle)
        ? Math.round(Math.min(20, Math.max(0, Number(request.moyenneAnnuelle))) * 100) / 100
        : undefined;
    const safeFileName = request.bulletinNomFichier ? request.bulletinNomFichier.slice(0, 200) : undefined;
    const safeExtraitName = request.extraitNaissanceNomFichier
      ? request.extraitNaissanceNomFichier.slice(0, 200)
      : undefined;

    const newReq: AdmissionRequest = {
      ...request,
      parentCompteId: request.parentCompteId || getParentAccount()?.id,
      moyenneAnnuelle: safeAvg,
      bulletinNomFichier: safeFileName,
      extraitNaissanceNomFichier: safeExtraitName,
      id: 'ADM_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      dateDemande: new Date().toISOString(),
      statut: 'en_attente',
      anneeScolaire: request.anneeScolaire || CURRENT_SCHOOL_YEAR,
    };
    admissions.unshift(newReq);
    this.saveAdmissions(admissions);
    return newReq;
  }

  static async addAdmissionRequestAsync(
    request: Omit<AdmissionRequest, 'id' | 'dateDemande' | 'statut' | 'anneeScolaire'> & {
      anneeScolaire?: string;
    }
  ): Promise<{ request: AdmissionRequest; synced: boolean; error?: string }> {
    const newReq = this.createAdmissionLocally(request);
    const payload = this.buildAdmissionPayload(newReq);
    this.enqueueOutbox('DEMANDE', newReq.id, payload);

    const res = await SupabaseSyncService.syncDemandeAdmissionToSupabase(payload);
    if (res.ok) {
      this.removeOutbox('DEMANDE', newReq.id);
      return { request: newReq, synced: true };
    }
    this.enqueueOutbox('DEMANDE', newReq.id, payload, res.error);
    return { request: newReq, synced: false, error: res.error };
  }

  static async retrySyncAdmission(requestId: string): Promise<{ synced: boolean; error?: string }> {
    const req = this.getAdmissions().find((a) => a.id === requestId);
    if (!req) return { synced: false, error: 'Demande introuvable localement' };
    const payload = this.buildAdmissionPayload(req);
    const res = await SupabaseSyncService.syncDemandeAdmissionToSupabase(payload);
    if (res.ok) {
      this.removeOutbox('DEMANDE', req.id);
      return { synced: true };
    }
    this.enqueueOutbox('DEMANDE', req.id, payload, res.error);
    return { synced: false, error: res.error };
  }

  static addAdmissionRequest(
    request: Omit<AdmissionRequest, 'id' | 'dateDemande' | 'statut' | 'anneeScolaire'> & {
      anneeScolaire?: string;
    }
  ): AdmissionRequest {
    const newReq = this.createAdmissionLocally(request);
    const payload = this.buildAdmissionPayload(newReq);
    this.enqueueOutbox('DEMANDE', newReq.id, payload);
    void SupabaseSyncService.syncDemandeAdmissionToSupabase(payload).then((res) => {
      if (res.ok) {
        this.removeOutbox('DEMANDE', newReq.id);
      } else {
        this.enqueueOutbox('DEMANDE', newReq.id, payload, res.error);
      }
    });
    return newReq;
  }

  static acceptAdmission(requestId: string, customScolarite?: number): Student | null {
    const admissions = this.getAdmissions();
    const req = admissions.find((a) => a.id === requestId);
    if (!req) return null;

    const tarif = this.getTarifForClass(req.classeDemandee, req.anneeScolaire || CURRENT_SCHOOL_YEAR);
    const scolariteTotale =
      customScolarite !== undefined ? customScolarite : tarif ? tarif.totalExigible : 200000;

    // Create student record locally (without firing parallel FK-racing demand update yet)
    const students = this.getStudents();
    const count = students.length + 1;
    const matricule = `EDU-27-${count.toString().padStart(4, '0')}`;
    const anneeScolaire = req.anneeScolaire || CURRENT_SCHOOL_YEAR;

    const student: Student = {
      id: 'STU_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      matricule,
      nom: req.nomEnfant.toUpperCase(),
      prenom: req.prenomEnfant,
      dateNaissance: req.dateNaissance,
      classe: req.classeDemandee,
      anneeScolaire,
      scolariteTotale,
      montantPaye: 0,
      montantDonTotal: req.montantDon || 0,
      parentCompteId: req.parentCompteId,
      nomParent: req.nomParent,
      telephoneParent: req.telephoneParent,
      emailParent: req.emailParent,
      adresse: req.adresse,
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'inscrit',
      statutReinscription: 'REINSCRIT',
      etablissementOrigine: req.etablissementOrigine,
      decisionBulletin: req.decisionBulletin,
      moyenneAnnuelle: req.moyenneAnnuelle,
      motifVenue: req.motifVenue,
      descriptionVenue: req.descriptionVenue,
      bulletinNomFichier: req.bulletinNomFichier,
      extraitNaissanceNomFichier: req.extraitNaissanceNomFichier,
    };

    students.unshift(student);
    this.saveStudents(students);

    req.statut = 'accepte';
    req.matriculeAttribue = student.matricule;
    req.dateTraitement = new Date().toISOString();
    this.saveAdmissions(admissions);

    const stuPayload = this.buildStudentPayload(student);
    const inscPayload = {
      eleve_id: student.id,
      eleve_matricule: student.matricule,
      annee_scolaire: student.anneeScolaire,
      classe: student.classe,
      scolarite_totale: student.scolariteTotale,
      montant_paye: student.montantPaye,
      statut_reinscription: 'REINSCRIT',
    };
    const admPayload = this.buildAdmissionPayload(req);

    this.enqueueOutbox('ELEVE', student.id, stuPayload);
    this.enqueueOutbox('INSCRIPTION', student.id, inscPayload);
    this.enqueueOutbox('DEMANDE', req.id, admPayload);

    // CRITICAL: Sequential await so `eleves(matricule)` exists in Postgres BEFORE `demandes_admission(matricule_attribue)` references it!
    void (async () => {
      const stuRes = await SupabaseSyncService.syncEleveToSupabase(stuPayload);
      if (stuRes.ok) {
        this.removeOutbox('ELEVE', student.id);
        const inscRes = await SupabaseSyncService.syncInscriptionAnnuelleToSupabase(inscPayload);
        if (inscRes.ok) this.removeOutbox('INSCRIPTION', student.id);
      } else {
        this.enqueueOutbox('ELEVE', student.id, stuPayload, stuRes.error);
      }

      const admRes = await SupabaseSyncService.syncDemandeAdmissionToSupabase(admPayload);
      if (admRes.ok) {
        this.removeOutbox('DEMANDE', req.id);
      } else {
        this.enqueueOutbox('DEMANDE', req.id, admPayload, admRes.error);
      }
    })();

    this.addAuditLog({
      typeAction: 'VALIDATION_ADMISSION',
      auteur: this.getActiveStaffAuthor(),
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
      const cleanMotif =
        motif && motif.trim().length > 0
          ? motif.trim()
          : 'Bulletin non conforme ou places indisponibles dans cette classe.';
      req.statut = 'refuse';
      req.motifRefus = cleanMotif;
      req.dateTraitement = new Date().toISOString();
      this.saveAdmissions(admissions);

      const admPayload = this.buildAdmissionPayload(req);
      this.enqueueOutbox('DEMANDE', req.id, admPayload);
      void SupabaseSyncService.syncDemandeAdmissionToSupabase(admPayload).then((res) => {
        if (res.ok) {
          this.removeOutbox('DEMANDE', req.id);
        } else {
          this.enqueueOutbox('DEMANDE', req.id, admPayload, res.error);
        }
      });

      this.addAuditLog({
        typeAction: 'REFUS_ADMISSION',
        auteur: this.getActiveStaffAuthor(),
        description: `Refus de la demande d'admission pour ${req.prenomEnfant} ${req.nomEnfant} (${req.classeDemandee}). Motif envoyé au parent : ${req.motifRefus}`,
        details: { requestId: req.id, motif: req.motifRefus },
        niveauGravite: 'AVERTISSEMENT',
      });
    }
  }

  /* ==========================================================================
     JOURNAL D'AUDIT & TRAÇABILITÉ (Transparence totale)
     ========================================================================== */
  static getAuditLogs(): AuditLog[] {
    if (typeof window === 'undefined' || activeStoreScope === 'public') return [];
    try {
      const stored = safeGetItem(scopedKey(STORAGE_KEYS.AUDIT_LOGS));
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [];
  }

  static saveAuditLogs(logs: AuditLog[]) {
    if (typeof window !== 'undefined') {
      if (activeStoreScope !== 'public') {
        safeSetItem(scopedKey(STORAGE_KEYS.AUDIT_LOGS), logs);
      }
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
    void SupabaseSyncService.syncAuditLogToSupabase({
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
      const stored = safeGetItem(STORAGE_KEYS.SCHOOL);
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
    this.saveOutbox([]);
  }

  static subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
}
