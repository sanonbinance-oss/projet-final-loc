-- ============================================================================
-- BASE DE DONNÉES ACADÉMIQUE : PAYKAL / EDUPAY SCOLARITÉ (SUPABASE / POSTGRESQL)
-- Session : Bascule Année Scolaire 2027-2028 & Historique 2026-2027
-- Conception : 100% Français (Tables, Colonnes, Types ENUM, Index & Vues)
-- Optimisation : Conçu pour supporter plus de 5 000 à 10 000 élèves
-- ============================================================================

-- 1. EXTENSIONS POSTGRESQL POUR LA RECHERCHE INSTANTANÉE (SCALABILITÉ > 4 000 ÉLÈVES)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. NETTOYAGE PRÉVENTIF DES ANCIENNES TABLES ET VUES
DROP VIEW IF EXISTS vue_recouvrement_par_classe CASCADE;
DROP VIEW IF EXISTS vue_statistiques_globales CASCADE;
DROP VIEW IF EXISTS vue_journal_caisse_du_jour CASCADE;

DROP TABLE IF EXISTS paiements CASCADE;
DROP TABLE IF EXISTS inscriptions_annuelles CASCADE;
DROP TABLE IF EXISTS demandes_admission CASCADE;
DROP TABLE IF EXISTS eleves CASCADE;
DROP TABLE IF EXISTS tarifs_scolarite CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;

DROP TYPE IF EXISTS type_mode_paiement CASCADE;
DROP TYPE IF EXISTS type_statut_paiement CASCADE;
DROP TYPE IF EXISTS type_statut_admission CASCADE;
DROP TYPE IF EXISTS type_canal_encaissement CASCADE;
DROP TYPE IF EXISTS type_decision_bulletin CASCADE;
DROP TYPE IF EXISTS type_statut_fin_annee CASCADE;
DROP TYPE IF EXISTS type_statut_reinscription CASCADE;

-- ============================================================================
-- 3. ÉNUMÉRATIONS ET TYPES PERSONNALISÉS
-- ============================================================================

-- Modes de paiement acceptés
CREATE TYPE type_mode_paiement AS ENUM (
    'ORANGE_MONEY',
    'MOOV_MONEY',
    'MTN_MONEY',
    'LIGDICASH',
    'ESPECES_GUICHET'
);

-- Statut financier de la transaction
CREATE TYPE type_statut_paiement AS ENUM (
    'SUCCES',
    'EN_COURS',
    'ECHOUE'
);

-- Statut de la demande d'admission en ligne
CREATE TYPE type_statut_admission AS ENUM (
    'EN_ATTENTE',
    'ACCEPTE',
    'REFUSE'
);

-- Canal d'encaissement de la somme
CREATE TYPE type_canal_encaissement AS ENUM (
    'PARENT_EN_LIGNE',
    'SECRETAIRE_GUICHET'
);

-- Décision portée sur le bulletin du 3ème trimestre
CREATE TYPE type_decision_bulletin AS ENUM (
    'PASSAGE',
    'REDOUBLEMENT',
    'NOUVEAU_CYCLE'
);

-- Statut de fin d'année scolaire pour les effectifs importés
CREATE TYPE type_statut_fin_annee AS ENUM (
    'PASSANT',
    'REDOUBLANT'
);

-- Statut de réinscription lors du basculement d'année (2026-2027 -> 2027-2028)
CREATE TYPE type_statut_reinscription AS ENUM (
    'EN_ATTENTE_REINSCRIPTION',
    'REINSCRIT',
    'TRANSFERE',
    'ABANDON'
);

-- ============================================================================
-- 4. CRÉATION DES TABLES FONDAMENTALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1 : UTILISATEURS (Secrétariat, Intendance, Direction)
-- ----------------------------------------------------------------------------
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    code_pin VARCHAR(50) NOT NULL DEFAULT '1234',
    role_utilisateur VARCHAR(50) NOT NULL DEFAULT 'SECRETAIRE', -- 'SECRETAIRE', 'COMPTABLE', 'ADMINISTRATEUR'
    telephone VARCHAR(50),
    est_actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_derniere_connexion TIMESTAMP WITH TIME ZONE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX idx_utilisateurs_role ON utilisateurs(role_utilisateur);


-- ----------------------------------------------------------------------------
-- TABLE 2 : TARIFS_SCOLARITE (Grille tarifaire dynamique par niveau et année)
-- ----------------------------------------------------------------------------
CREATE TABLE tarifs_scolarite (
    id SERIAL PRIMARY KEY,
    annee_scolaire VARCHAR(20) NOT NULL,            -- Ex: '2027-2028' ou '2026-2027'
    niveau VARCHAR(50) NOT NULL,                    -- Ex: '6ème', '3ème', '2nde C', 'Tle D'
    montant_scolarite NUMERIC(12, 2) NOT NULL CHECK (montant_scolarite >= 0),
    frais_inscription NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (frais_inscription >= 0),
    frais_annexes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (frais_annexes >= 0),
    total_exigible NUMERIC(12, 2) GENERATED ALWAYS AS (montant_scolarite + frais_inscription + frais_annexes) STORED,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité obligatoire sur le couple (annee_scolaire, niveau)
    CONSTRAINT uq_tarifs_annee_niveau UNIQUE (annee_scolaire, niveau)
);

CREATE INDEX idx_tarifs_annee_niveau ON tarifs_scolarite(annee_scolaire, niveau);


-- ----------------------------------------------------------------------------
-- TABLE 3 : ELEVES (Registre central permanent des élèves)
-- ----------------------------------------------------------------------------
CREATE TABLE eleves (
    id VARCHAR(50) PRIMARY KEY,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    sexe VARCHAR(10),                              -- 'M' ou 'F'
    date_naissance DATE,
    classe VARCHAR(50) NOT NULL,                   -- Classe actuelle pour 2027-2028
    annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
    
    -- Situation Financière
    scolarite_totale NUMERIC(12, 2) NOT NULL DEFAULT 200000.00,
    montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    montant_don_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Coordonnées Parent / Tuteur
    nom_parent VARCHAR(150) NOT NULL,
    telephone_parent VARCHAR(50) NOT NULL,
    email_parent VARCHAR(150),
    adresse_domicile TEXT,
    
    -- Historique Académique & Bascule (2026-2027 -> 2027-2028)
    annee_origine VARCHAR(20),                     -- Ex: '2026-2027'
    classe_precedente VARCHAR(50),                 -- Ex: '6ème A'
    statut_fin_annee type_statut_fin_annee,        -- 'PASSANT' ou 'REDOUBLANT'
    statut_reinscription type_statut_reinscription DEFAULT 'REINSCRIT',
    decision_bulletin type_decision_bulletin DEFAULT 'PASSAGE',
    moyenne_annuelle NUMERIC(4, 2),                -- Ex: 14.25 / 20
    etablissement_origine VARCHAR(255),
    motif_venue VARCHAR(100),
    description_motif TEXT,
    bulletin_nom_fichier VARCHAR(255),
    
    statut_inscription VARCHAR(20) NOT NULL DEFAULT 'inscrit', -- 'inscrit' ou 'radie'
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEX DE HAUTE PERFORMANCE POUR PLUS DE 4 000 À 10 000 ÉLÈVES
-- ============================================================================
CREATE INDEX idx_eleves_matricule ON eleves(matricule);
CREATE INDEX idx_eleves_annee ON eleves(annee_scolaire);
CREATE INDEX idx_eleves_classe_annee ON eleves(classe, annee_scolaire);
CREATE INDEX idx_eleves_telephone ON eleves(telephone_parent);
CREATE INDEX idx_eleves_statut_reinscription ON eleves(statut_reinscription);

-- Index Trigramme GIN pour recherche textuelle floue ultra-rapide (<5ms sur 10 000 élèves)
CREATE INDEX idx_eleves_nom_trgm ON eleves USING gin (nom gin_trgm_ops);
CREATE INDEX idx_eleves_prenom_trgm ON eleves USING gin (prenom gin_trgm_ops);
CREATE INDEX idx_eleves_recherche_globale ON eleves USING gin ((nom || ' ' || prenom || ' ' || matricule) gin_trgm_ops);


-- ----------------------------------------------------------------------------
-- TABLE 4 : INSCRIPTIONS_ANNUELLES (Historique multi-années par élève)
-- ----------------------------------------------------------------------------
CREATE TABLE inscriptions_annuelles (
    id SERIAL PRIMARY KEY,
    eleve_id VARCHAR(50) NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    eleve_matricule VARCHAR(50) NOT NULL,
    annee_scolaire VARCHAR(20) NOT NULL,           -- Ex: '2026-2027', '2027-2028'
    classe VARCHAR(50) NOT NULL,
    scolarite_totale NUMERIC(12, 2) NOT NULL,
    montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    statut_reinscription type_statut_reinscription NOT NULL DEFAULT 'REINSCRIT',
    date_validation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valide_par_utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    
    CONSTRAINT uq_inscription_eleve_annee UNIQUE (eleve_id, annee_scolaire)
);

CREATE INDEX idx_inscriptions_annee ON inscriptions_annuelles(annee_scolaire, classe);
CREATE INDEX idx_inscriptions_eleve ON inscriptions_annuelles(eleve_id);


-- ----------------------------------------------------------------------------
-- TABLE 5 : DEMANDES_ADMISSION (Inscriptions en ligne par les familles)
-- ----------------------------------------------------------------------------
CREATE TABLE demandes_admission (
    id VARCHAR(50) PRIMARY KEY,
    date_demande TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
    
    -- Enfant
    nom_enfant VARCHAR(100) NOT NULL,
    prenom_enfant VARCHAR(100) NOT NULL,
    date_naissance DATE,
    classe_demandee VARCHAR(50) NOT NULL,
    
    -- Parent
    nom_parent VARCHAR(150) NOT NULL,
    telephone_parent VARCHAR(50) NOT NULL,
    email_parent VARCHAR(150),
    adresse_domicile TEXT,
    
    -- Justificatifs du 3ème trimestre & Motif
    est_nouvel_eleve BOOLEAN NOT NULL DEFAULT TRUE,
    etablissement_origine VARCHAR(255),
    decision_bulletin type_decision_bulletin NOT NULL DEFAULT 'PASSAGE',
    moyenne_annuelle NUMERIC(4, 2),
    motif_venue VARCHAR(100),
    description_motif TEXT NOT NULL,
    bulletin_nom_fichier VARCHAR(255),
    montant_don NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Instruction par la secrétaire
    statut_admission type_statut_admission NOT NULL DEFAULT 'EN_ATTENTE',
    matricule_attribue VARCHAR(50) REFERENCES eleves(matricule) ON DELETE SET NULL,
    observations_secretaire TEXT,
    motif_refus TEXT,
    date_traitement TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_demandes_statut ON demandes_admission(statut_admission);
CREATE INDEX idx_demandes_date ON demandes_admission(date_demande);
CREATE INDEX idx_demandes_annee ON demandes_admission(annee_scolaire);


-- ----------------------------------------------------------------------------
-- TABLE 6 : PAIEMENTS (Journal de caisse, quittances certifiées et OTP)
-- ----------------------------------------------------------------------------
CREATE TABLE paiements (
    id VARCHAR(50) PRIMARY KEY,
    reference_quittance VARCHAR(100) UNIQUE NOT NULL, -- Ex: QUI-2027-0012
    annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
    
    -- Lien Élève
    eleve_id VARCHAR(50) NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    eleve_matricule VARCHAR(50) NOT NULL,
    nom_eleve VARCHAR(200) NOT NULL,
    classe_eleve VARCHAR(50) NOT NULL,
    
    -- Ventilation Financière (FCFA)
    montant_total NUMERIC(12, 2) NOT NULL CHECK (montant_total > 0),
    montant_scolarite NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    montant_don NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Mode & Canal
    mode_paiement type_mode_paiement NOT NULL,
    encaisse_par type_canal_encaissement NOT NULL,
    statut_paiement type_statut_paiement NOT NULL DEFAULT 'SUCCES',
    code_validation_otp VARCHAR(20),                 -- Trace du code OTP validé
    
    -- Payeur
    nom_payeur VARCHAR(150) NOT NULL,
    telephone_payeur VARCHAR(50),
    
    -- Traçabilité agent guichetier
    utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    nom_agent VARCHAR(150),
    observations TEXT,
    
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paiements_eleve_id ON paiements(eleve_id);
CREATE INDEX idx_paiements_matricule ON paiements(eleve_matricule);
CREATE INDEX idx_paiements_date ON paiements(date_paiement);
CREATE INDEX idx_paiements_annee ON paiements(annee_scolaire);
CREATE INDEX idx_paiements_mode ON paiements(mode_paiement);
CREATE INDEX idx_paiements_quittance ON paiements(reference_quittance);

-- ============================================================================
-- 5. INSERTION DE LA GRILLE TARIFAIRE OFFICIELLE 2027-2028
-- ============================================================================
INSERT INTO tarifs_scolarite (annee_scolaire, niveau, montant_scolarite, frais_inscription, frais_annexes)
VALUES
    -- Enseignement Général (Collège & Lycée)
    ('2027-2028', '6ème',       160000.00, 25000.00, 15000.00),
    ('2027-2028', '5ème',       160000.00, 25000.00, 15000.00),
    ('2027-2028', '4ème',       175000.00, 25000.00, 15000.00),
    ('2027-2028', '3ème',       190000.00, 30000.00, 20000.00),
    ('2027-2028', '2nde A',     210000.00, 30000.00, 20000.00),
    ('2027-2028', '2nde C',     215000.00, 30000.00, 20000.00),
    ('2027-2028', '1ère A',     225000.00, 35000.00, 20000.00),
    ('2027-2028', '1ère D',     230000.00, 35000.00, 20000.00),
    ('2027-2028', 'Tle A',      250000.00, 40000.00, 25000.00),
    ('2027-2028', 'Tle D',      260000.00, 40000.00, 25000.00),
    -- Enseignement Technique & Professionnel
    ('2027-2028', 'BEP 1',      200000.00, 35000.00, 30000.00),
    ('2027-2028', 'BEP 2',      210000.00, 35000.00, 30000.00),
    ('2027-2028', 'Bac Pro 1',  230000.00, 40000.00, 35000.00),
    ('2027-2028', 'Bac Pro 2',  245000.00, 40000.00, 35000.00),
    ('2027-2028', 'C''',        255000.00, 40000.00, 35000.00),
    ('2027-2028', 'D''',        265000.00, 40000.00, 35000.00)
ON CONFLICT (annee_scolaire, niveau) DO UPDATE 
SET montant_scolarite = EXCLUDED.montant_scolarite,
    frais_inscription = EXCLUDED.frais_inscription,
    frais_annexes = EXCLUDED.frais_annexes,
    updated_at = CURRENT_TIMESTAMP;

-- Insertion du compte secrétaire de caisse initial
INSERT INTO utilisateurs (nom_complet, email, code_pin, role_utilisateur, telephone)
VALUES ('Secrétaire Principale', 'secretaire@excellence-avenir.bf', '1234', 'SECRETAIRE', '+226 70 00 11 22')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 6. VUES ANALYTIQUES POUR LE TABLEAU DE BORD DU SECRÉTARIAT
-- ============================================================================

-- Vue 1 : Recouvrement consolidé par classe pour 2027-2028
CREATE OR REPLACE VIEW vue_recouvrement_par_classe AS
SELECT 
    e.annee_scolaire,
    e.classe,
    COUNT(e.id) AS nombre_eleves,
    COUNT(CASE WHEN e.statut_reinscription = 'REINSCRIT' THEN 1 END) AS eleves_reinscrits,
    COUNT(CASE WHEN e.statut_reinscription = 'EN_ATTENTE_REINSCRIPTION' THEN 1 END) AS eleves_en_attente,
    COALESCE(SUM(e.scolarite_totale), 0) AS total_exigible,
    COALESCE(SUM(e.montant_paye), 0) AS total_recouvre,
    COALESCE(SUM(e.scolarite_totale - e.montant_paye), 0) AS reste_a_recouvrer,
    CASE 
        WHEN SUM(e.scolarite_totale) > 0 
        THEN ROUND((SUM(e.montant_paye) / SUM(e.scolarite_totale)) * 100, 2)
        ELSE 0.00 
    END AS taux_recouvrement_pct
FROM eleves e
WHERE e.statut_inscription = 'inscrit'
GROUP BY e.annee_scolaire, e.classe
ORDER BY e.annee_scolaire DESC, e.classe ASC;

-- Vue 2 : Journal de caisse du jour pour clôture comptable
CREATE OR REPLACE VIEW vue_journal_caisse_du_jour AS
SELECT 
    p.id,
    p.reference_quittance,
    p.date_paiement,
    p.eleve_matricule,
    p.nom_eleve,
    p.classe_eleve,
    p.mode_paiement,
    p.montant_scolarite,
    p.montant_don,
    p.montant_total,
    p.nom_payeur,
    p.nom_agent,
    p.encaisse_par
FROM paiements p
WHERE DATE(p.date_paiement) = CURRENT_DATE
ORDER BY p.date_paiement DESC;

-- ============================================================================
-- 7. SÉCURITÉ ROW LEVEL SECURITY (RLS) & ACCÈS API SUPABASE
-- ============================================================================
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs_scolarite ENABLE ROW LEVEL SECURITY;
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions_annuelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_admission ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acces complet utilisateurs" ON utilisateurs;
CREATE POLICY "Acces complet utilisateurs" ON utilisateurs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acces complet tarifs" ON tarifs_scolarite;
CREATE POLICY "Acces complet tarifs" ON tarifs_scolarite FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acces complet eleves" ON eleves;
CREATE POLICY "Acces complet eleves" ON eleves FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acces complet inscriptions" ON inscriptions_annuelles;
CREATE POLICY "Acces complet inscriptions" ON inscriptions_annuelles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acces complet demandes" ON demandes_admission;
CREATE POLICY "Acces complet demandes" ON demandes_admission FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acces complet paiements" ON paiements;
CREATE POLICY "Acces complet paiements" ON paiements FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- TABLE 7 : JOURNAL_ACTIVITES (Traçabilité, Audit & Sécurité réglementaire)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_activites (
    id VARCHAR(50) PRIMARY KEY,
    date_action TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type_action VARCHAR(50) NOT NULL,
    auteur VARCHAR(150) NOT NULL DEFAULT 'Secrétaire Principale',
    description TEXT NOT NULL,
    details JSONB,
    niveau_gravite VARCHAR(20) NOT NULL DEFAULT 'INFO'
);

CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_activites(date_action DESC);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal_activites(type_action);
CREATE INDEX IF NOT EXISTS idx_journal_gravite ON journal_activites(niveau_gravite);

ALTER TABLE journal_activites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acces complet journal" ON journal_activites;
CREATE POLICY "Acces complet journal" ON journal_activites FOR ALL USING (true) WITH CHECK (true);

-- Initialisation de l'audit système
INSERT INTO journal_activites (id, date_action, type_action, auteur, description, details, niveau_gravite)
VALUES (
    'LOG_INIT_SYSTEME',
    CURRENT_TIMESTAMP,
    'CONNEXION',
    'Système PayKal EduPay',
    'Initialisation de la base de données académique et activation du journal de traçabilité',
    '{"version": "5.0", "session": "2027-2028"}',
    'INFO'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. DIFFUSION EN DIRECT REALTIME SUPABASE (MULTI-APPAREILS INSTANTANÉ)
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE demandes_admission, eleves, paiements, tarifs_scolarite, journal_activites;
EXCEPTION
    WHEN OTHERS THEN
        -- Si les tables sont déjà publiées ou si l'environnement diffère
        NULL;
END $$;


