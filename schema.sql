-- ============================================================================
-- BASE DE DONNÉES DE PAIEMENT DE SCOLARITÉ & GUICHET SCOLAIRE (EDUPAY)
-- Compatible PostgreSQL / Vercel Postgres / Neon / Supabase
-- Inclut : Bulletin 3ème trimestre (Passage/Redoublement), Raison de venue, Dons
-- ============================================================================

-- 1. Nettoyage préventif
DROP VIEW IF EXISTS v_paiements_du_jour CASCADE;
DROP VIEW IF EXISTS v_recouvrement_par_classe CASCADE;
DROP VIEW IF EXISTS v_statistiques_globales CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS admission_requests CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS school_settings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS api_configurations CASCADE;

-- 2. Types personnalisés (ENUMs)
DO $$ BEGIN
    CREATE TYPE mode_paiement_type AS ENUM (
        'ORANGE_MONEY', 
        'MOOV_MONEY', 
        'MTN_MONEY', 
        'LIGDICASH', 
        'ESPECES_GUICHET'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_paiement_type AS ENUM ('SUCCES', 'EN_COURS', 'ECHOUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_admission_type AS ENUM ('en_attente', 'accepte', 'refuse');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE canal_encaissement_type AS ENUM ('PARENT_EN_LIGNE', 'SECRETAIRE_GUICHET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE decision_bulletin_type AS ENUM ('PASSAGE', 'REDOUBLEMENT', 'NOUVEAU_CYCLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Table des Paramètres de l'Établissement Scolaire
CREATE TABLE school_settings (
    id SERIAL PRIMARY KEY,
    nom_ecole VARCHAR(255) NOT NULL,
    devise VARCHAR(255) DEFAULT 'Discipline - Travail - Réussite',
    slogan VARCHAR(255) DEFAULT 'L excellence au service de la nation',
    annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2025 - 2026',
    telephone VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    adresse TEXT NOT NULL,
    ville VARCHAR(100) DEFAULT 'Ouagadougou',
    pays VARCHAR(100) DEFAULT 'Burkina Faso',
    agrement_ministeriel VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des Utilisateurs Administrateurs (Secrétaires, Direction)
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    code_pin VARCHAR(50) NOT NULL DEFAULT '1234',
    role VARCHAR(50) NOT NULL DEFAULT 'SECRETAIRE',
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des Élèves (avec bulletin du 3ème trimestre, décision & motif de venue)
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE,
    classe VARCHAR(50) NOT NULL,
    scolarite_totale NUMERIC(12, 2) NOT NULL DEFAULT 150000.00,
    montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    montant_don_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    nom_parent VARCHAR(150) NOT NULL,
    telephone_parent VARCHAR(50) NOT NULL,
    email_parent VARCHAR(150),
    adresse TEXT,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'inscrit',
    -- Nouveaux paramètres académiques & transfert
    etablissement_origine VARCHAR(255),
    decision_bulletin decision_bulletin_type DEFAULT 'PASSAGE',
    moyenne_annuelle NUMERIC(4, 2),
    motif_venue VARCHAR(100), -- 'DEMENAGEMENT', 'EXCLUSION_PROBLEME', 'RAPPROCHEMENT', 'EXCELLENCE', 'AUTRE'
    description_venue TEXT,
    bulletin_nom_fichier VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_matricule ON students(matricule);
CREATE INDEX idx_students_classe ON students(classe);
CREATE INDEX idx_students_telephone ON students(telephone_parent);

-- 6. Table des Demandes d'Admission / Inscription en Ligne
CREATE TABLE admission_requests (
    id VARCHAR(50) PRIMARY KEY,
    date_demande TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nom_enfant VARCHAR(100) NOT NULL,
    prenom_enfant VARCHAR(100) NOT NULL,
    date_naissance DATE,
    classe_demandee VARCHAR(50) NOT NULL,
    nom_parent VARCHAR(150) NOT NULL,
    telephone_parent VARCHAR(50) NOT NULL,
    email_parent VARCHAR(150),
    adresse TEXT,
    statut statut_admission_type NOT NULL DEFAULT 'en_attente',
    matricule_attribue VARCHAR(50) REFERENCES students(matricule) ON DELETE SET NULL,
    -- Paramètres Bulletin & Transfert
    est_nouveau_transfert BOOLEAN DEFAULT TRUE,
    etablissement_origine VARCHAR(255),
    decision_bulletin decision_bulletin_type NOT NULL DEFAULT 'PASSAGE',
    moyenne_annuelle NUMERIC(4, 2),
    motif_venue VARCHAR(100),
    description_venue TEXT,
    bulletin_nom_fichier VARCHAR(255),
    montant_don NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    motif_refus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admissions_statut ON admission_requests(statut);

-- 7. Table des Paiements et Encaissements (Scolarité + Don)
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_matricule VARCHAR(50) NOT NULL,
    student_nom VARCHAR(200) NOT NULL,
    student_classe VARCHAR(50) NOT NULL,
    montant NUMERIC(12, 2) NOT NULL CHECK (montant > 0), -- Total versé
    montant_scolarite NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    montant_don NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Don / Contribution
    mode mode_paiement_type NOT NULL,
    telephone_payeur VARCHAR(50),
    nom_payeur VARCHAR(150) NOT NULL,
    statut statut_paiement_type NOT NULL DEFAULT 'SUCCES',
    encaisse_par canal_encaissement_type NOT NULL,
    agent_nom VARCHAR(150),
    notes TEXT,
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_date ON payments(date_paiement);
CREATE INDEX idx_payments_mode ON payments(mode);

-- 8. Table de configuration des clés API
CREATE TABLE api_configurations (
    id SERIAL PRIMARY KEY,
    operateur VARCHAR(50) UNIQUE NOT NULL,
    mode_sandbox BOOLEAN DEFAULT TRUE,
    api_key TEXT,
    api_secret TEXT,
    merchant_id VARCHAR(100),
    service_url TEXT,
    actif BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INSERTION DES DONNÉES DE TEST INITIALES
-- ============================================================================

INSERT INTO school_settings (
    nom_ecole, devise, annee_scolaire, telephone, email, adresse, ville, agrement_ministeriel
) VALUES (
    'Groupe Scolaire Excellence & Avenir',
    'Discipline - Travail - Réussite',
    '2025 - 2026',
    '+226 25 36 78 90 / +226 70 00 11 22',
    'contact@excellence-avenir.bf',
    'Secteur 28, Boulevard Charles de Gaulle',
    'Ouagadougou',
    'Arrêté N° 2023-0482/MENAPLN/SG/DREPS'
);

INSERT INTO admin_users (nom_complet, email, code_pin, role)
VALUES ('Mme Sanfo Mariam', 'secretaire@excellence-avenir.bf', '1234', 'SECRETAIRE');

-- Registre des élèves avec informations académiques et dons
INSERT INTO students (
    id, matricule, nom, prenom, date_naissance, classe, scolarite_totale, montant_paye, montant_don_total,
    nom_parent, telephone_parent, email_parent, adresse, date_inscription,
    etablissement_origine, decision_bulletin, moyenne_annuelle, motif_venue, description_venue, bulletin_nom_fichier
) VALUES
('STU_001', 'EDU-25-001', 'OUÉDRAOGO', 'Aminata', '2018-04-12', 'CP1', 150000.00, 100000.00, 10000.00, 'Moussa Ouédraogo', '70213456', 'moussa.oued@gmail.com', 'Gounghin, Ouagadougou', '2025-09-02', 'Maternelle Les Anges', 'NOUVEAU_CYCLE', 15.20, 'EXCELLENCE', 'Inscription au CP1 après une excellente maternelle.', 'bulletin_maternelle_aminata.pdf'),
('STU_002', 'EDU-25-002', 'KABORÉ', 'Ibrahim', '2016-11-20', 'CE2', 175000.00, 175000.00, 15000.00, 'Aïssata Kaboré', '76889900', 'aissata.k@yahoo.fr', 'Dassasgho, Ouagadougou', '2025-09-05', 'Complexe Scolaire Wend-Kuni', 'PASSAGE', 14.10, 'DEMENAGEMENT', 'Déménagement de Koudougou pour s installer à Dassasgho.', 'bulletin_t3_ce1_ibrahim.pdf'),
('STU_003', 'EDU-25-003', 'SAWADOGO', 'Fatimata', '2013-02-15', '6ème', 210000.00, 90000.00, 5000.00, 'Ousmane Sawadogo', '65443322', 'sawadogo.ous@hotmail.com', 'Wemtenga, Ouagadougou', '2025-09-10', 'École Primaire Privée Sainte Famille', 'PASSAGE', 16.05, 'EXCELLENCE', 'Admise au CEP, recherche d un collège d excellence.', 'releve_cep_fatimata.pdf'),
('STU_004', 'EDU-25-004', 'COMPAORÉ', 'Cheick Aziz', '2010-08-30', '3ème', 230000.00, 50000.00, 0.00, 'Madame Compaoré Mariam', '78112233', 'm.compaore@fasonet.bf', 'Karpala, Ouagadougou', '2025-09-12', 'Lycée Privé Le Progrès', 'REDOUBLEMENT', 9.40, 'EXCLUSION_PROBLEME', 'Non admis en classe supérieure, envoyé ici pour encadrement et redoublement.', 'bulletin_3eme_trimestre_cheick.pdf'),
('STU_005', 'EDU-25-005', 'TRAORÉ', 'Mariam', '2014-06-18', 'CM2', 185000.00, 135000.00, 10000.00, 'Bakary Traoré', '71556677', NULL, 'Somgandé, Ouagadougou', '2025-09-15', 'École Publique Somgandé B', 'PASSAGE', 13.80, 'RAPPROCHEMENT', 'Rapprochement du domicile familial.', 'bulletin_cm1_t3_traore.pdf'),
('STU_006', 'EDU-25-006', 'SANON', 'Abdoulaye', '2017-09-04', 'CP2', 160000.00, 60000.00, 0.00, 'Yacouba Sanon', '74123498', NULL, 'Tanghin, Ouagadougou', '2025-09-18', 'Groupe Scolaire Excellence & Avenir', 'PASSAGE', 14.50, 'EXCELLENCE', 'Élève régulier passant du CP1 au CP2.', 'bulletin_cp1_sanon.pdf');

-- Demandes d'admission avec bulletin et motif
INSERT INTO admission_requests (
    id, date_demande, nom_enfant, prenom_enfant, date_naissance, classe_demandee,
    nom_parent, telephone_parent, email_parent, adresse, statut, notes,
    est_nouveau_transfert, etablissement_origine, decision_bulletin, moyenne_annuelle, motif_venue, description_venue, bulletin_nom_fichier, montant_don
) VALUES
('ADM_001', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'KABORÉ', 'Oumar', '2019-03-25', 'CP1', 'Salif Kaboré', '70123456', 'salif.kabore@gmail.com', 'Patte d’Oie, Ouagadougou', 'en_attente', 'Dossier complet avec bulletin.', TRUE, 'Maternelle Les Papillons', 'NOUVEAU_CYCLE', 16.20, 'RAPPROCHEMENT', 'Déménagement récent à Patte d Oie.', 'bulletin_3eme_trimestre_oumar.pdf', 5000.00),
('ADM_002', CURRENT_TIMESTAMP - INTERVAL '5 hours', 'ZONGO', 'Aïcha', '2013-10-14', '6ème', 'Alimatou Zongo', '76998877', 'zongo.alima@yahoo.com', 'Tampouy, Ouagadougou', 'en_attente', 'Admise au CEP session 2025.', TRUE, 'École Primaire Privée Bangr-Nooma', 'PASSAGE', 15.75, 'EXCELLENCE', 'Recherche d un meilleur encadrement pour le collège.', 'bulletin_cm2_t3_aicha_passage.pdf', 10000.00),
('ADM_003', CURRENT_TIMESTAMP - INTERVAL '2 days', 'BATIONO', 'Noufou', '2017-01-10', 'CE1', 'Issa Bationo', '65432100', NULL, 'Pissy, Ouagadougou', 'accepte', 'Dossier validé et scolarité initiale enregistrée.', TRUE, 'École Saint Joseph de Bobo-Dioulasso', 'REDOUBLEMENT', 9.80, 'DEMENAGEMENT', 'Mutation professionnelle du père à Ouagadougou.', 'bulletin_t3_redoublement_bationo.pdf', 5000.00);

-- Historique des paiements avec scolarité et dons
INSERT INTO payments (
    id, reference, student_id, student_matricule, student_nom, student_classe,
    montant, montant_scolarite, montant_don, mode, telephone_payeur, nom_payeur, statut, encaisse_par, agent_nom, notes, date_paiement
) VALUES
('PAY_INIT_1', 'REC-2025-OM-BF-819201', 'STU_001', 'EDU-25-001', 'Aminata OUÉDRAOGO', 'CP1', 110000.00, 100000.00, 10000.00, 'ORANGE_MONEY', '70213456', 'Moussa Ouédraogo', 'SUCCES', 'PARENT_EN_LIGNE', NULL, 'Tranches 1 & 2 (100.000 F) + Don soutien école (10.000 F)', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('PAY_INIT_2', 'REC-2025-ESP-44912', 'STU_002', 'EDU-25-002', 'Ibrahim KABORÉ', 'CE2', 190000.00, 175000.00, 15000.00, 'ESPECES_GUICHET', '76889900', 'Aïssata Kaboré', 'SUCCES', 'SECRETAIRE_GUICHET', 'Mme Sanfo (Secrétaire)', 'Scolarité soldée en espèces (175.000 F) + Don bibliothèque (15.000 F)', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('PAY_INIT_3', 'REC-2025-MV-BF-629104', 'STU_003', 'EDU-25-003', 'Fatimata SAWADOGO', '6ème', 95000.00, 90000.00, 5000.00, 'MOOV_MONEY', '65443322', 'Ousmane Sawadogo', 'SUCCES', 'PARENT_EN_LIGNE', NULL, '1ère tranche scolarité (90.000 F) + Don œuvres (5.000 F)', CURRENT_TIMESTAMP - INTERVAL '18 hours'),
('PAY_INIT_4', 'REC-2025-ESP-90812', 'STU_005', 'EDU-25-005', 'Mariam TRAORÉ', 'CM2', 145000.00, 135000.00, 10000.00, 'ESPECES_GUICHET', '71556677', 'Bakary Traoré', 'SUCCES', 'SECRETAIRE_GUICHET', 'Mme Sanfo (Secrétaire)', 'Avance scolarité (135.000 F) + Don cantine (10.000 F)', CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- Vues utiles
CREATE OR REPLACE VIEW v_statistiques_globales AS
SELECT 
    COUNT(s.id) AS effectif_total,
    COALESCE(SUM(s.scolarite_totale), 0) AS total_scolarite_exigible,
    COALESCE(SUM(s.montant_paye), 0) AS total_scolarite_encaissee,
    COALESCE(SUM(s.montant_don_total), 0) AS total_dons_recoltes,
    COALESCE(SUM(s.scolarite_totale - s.montant_paye), 0) AS reste_a_recouvrer,
    CASE 
        WHEN SUM(s.scolarite_totale) > 0 
        THEN ROUND((SUM(s.montant_paye) / SUM(s.scolarite_totale)) * 100, 2)
        ELSE 0 
    END AS taux_recouvrement_pct
FROM students s
WHERE s.statut = 'inscrit';
