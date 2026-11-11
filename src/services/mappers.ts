import { Student, AdmissionRequest, Payment, TuitionTariff, AuditLog } from '../types';

/**
 * Mappers bidirectionnels entre le schéma Supabase (snake_case)
 * et les modèles TypeScript de l'application (camelCase).
 */

export const Mappers = {
  // --- ÉLÈVES ---
  eleveFromSupabase(row: any): Student {
    return {
      id: row.id,
      matricule: row.matricule,
      nom: row.nom,
      prenom: row.prenom,
      dateNaissance: row.date_naissance || '',
      classe: row.classe,
      anneeScolaire: row.annee_scolaire || '2027-2028',
      scolariteTotale: Number(row.scolarite_totale) || 0,
      montantPaye: Number(row.montant_paye) || 0,
      nomParent: row.nom_parent || '',
      telephoneParent: row.telephone_parent || '',
      emailParent: row.email_parent || undefined,
      adresse: row.adresse_domicile || undefined,
      dateInscription: row.date_inscription || new Date().toISOString().split('T')[0],
      statut: row.statut_inscription === 'radie' ? 'radie' : 'inscrit',
      etablissementOrigine: row.etablissement_origine || undefined,
      decisionBulletin: row.decision_bulletin || undefined,
      moyenneAnnuelle: row.moyenne_annuelle !== null ? Number(row.moyenne_annuelle) : undefined,
      motifVenue: row.motif_venue || undefined,
      descriptionVenue: row.description_motif || undefined,
      bulletinNomFichier: row.bulletin_nom_fichier || undefined,
      montantDonTotal: Number(row.montant_don_total) || 0,
      anneeOrigine: row.annee_origine || undefined,
      classePrecedente: row.classe_precedente || undefined,
      statutFinAnnee: row.statut_fin_annee || undefined,
      statutReinscription: row.statut_reinscription || 'REINSCRIT',
    };
  },

  eleveToSupabase(s: Student): Record<string, unknown> {
    return {
      id: s.id,
      matricule: s.matricule,
      nom: s.nom,
      prenom: s.prenom,
      date_naissance: s.dateNaissance || null,
      classe: s.classe,
      annee_scolaire: s.anneeScolaire || '2027-2028',
      scolarite_totale: s.scolariteTotale,
      montant_paye: s.montantPaye || 0,
      montant_don_total: s.montantDonTotal || 0,
      nom_parent: s.nomParent,
      telephone_parent: s.telephoneParent,
      email_parent: s.emailParent || null,
      adresse_domicile: s.adresse || null,
      annee_origine: s.anneeOrigine || null,
      classe_precedente: s.classePrecedente || null,
      statut_fin_annee: s.statutFinAnnee || null,
      statut_reinscription: s.statutReinscription || 'REINSCRIT',
      decision_bulletin: s.decisionBulletin || 'PASSAGE',
      moyenne_annuelle: s.moyenneAnnuelle !== undefined ? s.moyenneAnnuelle : null,
      etablissement_origine: s.etablissementOrigine || null,
      motif_venue: s.motifVenue || null,
      description_motif: s.descriptionVenue || null,
      bulletin_nom_fichier: s.bulletinNomFichier || null,
      statut_inscription: s.statut || 'inscrit',
      date_inscription: s.dateInscription || new Date().toISOString().split('T')[0],
      date_modification: new Date().toISOString(),
    };
  },

  // --- DEMANDES D'ADMISSION ---
  demandeFromSupabase(row: any): AdmissionRequest {
    return {
      id: row.id,
      dateDemande: row.date_demande || new Date().toISOString(),
      anneeScolaire: row.annee_scolaire || '2027-2028',
      nomEnfant: row.nom_enfant,
      prenomEnfant: row.prenom_enfant,
      dateNaissance: row.date_naissance || '',
      classeDemandee: row.classe_demandee,
      nomParent: row.nom_parent,
      telephoneParent: row.telephone_parent,
      emailParent: row.email_parent || undefined,
      adresse: row.adresse_domicile || '',
      statut: row.statut_admission === 'ACCEPTE' 
        ? 'accepte' 
        : row.statut_admission === 'REFUSE' 
        ? 'refuse' 
        : 'en_attente',
      matriculeAttribue: row.matricule_attribue || undefined,
      motifRefus: row.motif_refus || undefined,
      estNouveauTransfert: row.est_nouvel_eleve ?? true,
      etablissementOrigine: row.etablissement_origine || undefined,
      decisionBulletin: row.decision_bulletin || 'PASSAGE',
      moyenneAnnuelle: row.moyenne_annuelle !== null ? Number(row.moyenne_annuelle) : undefined,
      motifVenue: row.motif_venue || 'DEMENAGEMENT',
      descriptionVenue: row.description_motif || '',
      bulletinNomFichier: row.bulletin_nom_fichier || undefined,
      montantDon: Number(row.montant_don) || 0,
      notes: row.observations_secretaire || undefined,
    };
  },

  demandeToSupabase(d: AdmissionRequest): Record<string, unknown> {
    const statutUpper = d.statut === 'accepte' 
      ? 'ACCEPTE' 
      : d.statut === 'refuse' 
      ? 'REFUSE' 
      : 'EN_ATTENTE';

    return {
      id: d.id,
      date_demande: d.dateDemande || new Date().toISOString(),
      annee_scolaire: d.anneeScolaire || '2027-2028',
      nom_enfant: d.nomEnfant,
      prenom_enfant: d.prenomEnfant,
      date_naissance: d.dateNaissance || null,
      classe_demandee: d.classeDemandee,
      nom_parent: d.nomParent,
      telephone_parent: d.telephoneParent,
      email_parent: d.emailParent || null,
      adresse_domicile: d.adresse || null,
      est_nouvel_eleve: d.estNouveauTransfert ?? true,
      etablissement_origine: d.etablissementOrigine || null,
      decision_bulletin: d.decisionBulletin || 'PASSAGE',
      moyenne_annuelle: d.moyenneAnnuelle !== undefined ? d.moyenneAnnuelle : null,
      motif_venue: d.motifVenue || 'DEMENAGEMENT',
      description_motif: d.descriptionVenue || '',
      bulletin_nom_fichier: d.bulletinNomFichier || null,
      montant_don: d.montantDon || 0,
      statut_admission: statutUpper,
      matricule_attribue: d.matriculeAttribue || null,
      motif_refus: d.motifRefus || null,
      observations_secretaire: d.notes || null,
    };
  },

  // --- PAIEMENTS ---
  paiementFromSupabase(row: any): Payment {
    return {
      id: row.id,
      reference: row.reference_quittance,
      studentId: row.eleve_id,
      studentMatricule: row.eleve_matricule,
      studentNom: row.nom_eleve,
      studentClasse: row.classe_eleve,
      anneeScolaire: row.annee_scolaire || '2027-2028',
      montant: Number(row.montant_total) || 0,
      montantScolarite: Number(row.montant_scolarite) || 0,
      montantDon: Number(row.montant_don) || 0,
      mode: row.mode_paiement,
      encaissePar: row.encaisse_par,
      statut: row.statut_paiement || 'SUCCES',
      nomPayeur: row.nom_payeur,
      telephonePayeur: row.telephone_payeur || undefined,
      agentNom: row.nom_agent || undefined,
      date: row.date_paiement || new Date().toISOString(),
      notes: row.observations || undefined,
    };
  },

  paiementToSupabase(p: Payment): Record<string, unknown> {
    return {
      id: p.id,
      reference_quittance: p.reference,
      annee_scolaire: p.anneeScolaire || '2027-2028',
      eleve_id: p.studentId,
      eleve_matricule: p.studentMatricule,
      nom_eleve: p.studentNom,
      classe_eleve: p.studentClasse,
      montant_total: p.montant,
      montant_scolarite: p.montantScolarite,
      montant_don: p.montantDon || 0,
      mode_paiement: p.mode,
      encaisse_par: p.encaissePar,
      statut_paiement: p.statut || 'SUCCES',
      nom_payeur: p.nomPayeur,
      telephone_payeur: p.telephonePayeur || null,
      nom_agent: p.agentNom || null,
      observations: p.notes || null,
      date_paiement: p.date || new Date().toISOString(),
    };
  },

  // --- TARIFS ---
  tarifFromSupabase(row: any): TuitionTariff {
    const montant = Number(row.montant_scolarite) || 0;
    const fraisInsc = Number(row.frais_inscription) || 0;
    const fraisAnnexes = Number(row.frais_annexes) || 0;
    return {
      id: 'TARIF_' + row.niveau.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
      anneeScolaire: row.annee_scolaire,
      niveau: row.niveau,
      montantScolarite: montant,
      fraisInscription: fraisInsc,
      fraisAnnexes: fraisAnnexes,
      totalExigible: Number(row.total_exigible) || (montant + fraisInsc + fraisAnnexes),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  },

  // --- JOURNAL D'AUDIT / ACTIVITÉS ---
  auditLogFromSupabase(row: any): AuditLog {
    return {
      id: String(row.id),
      dateAction: row.date_action || new Date().toISOString(),
      typeAction: row.type_action,
      auteur: row.auteur || 'Secrétaire Principale',
      description: row.description,
      details: row.details || undefined,
      niveauGravite: row.niveau_gravite || 'INFO',
    };
  },

  auditLogToSupabase(log: AuditLog): Record<string, unknown> {
    return {
      id: log.id,
      date_action: log.dateAction,
      type_action: log.typeAction,
      auteur: log.auteur,
      description: log.description,
      details: log.details || {},
      niveau_gravite: log.niveauGravite || 'INFO',
    };
  },
};
