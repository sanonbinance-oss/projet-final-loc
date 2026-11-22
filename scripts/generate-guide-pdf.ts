import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const OUTPUT_PATH = path.resolve(process.cwd(), 'public/edupay-scolarite-fiche-complete.pdf');

const FONT_REGULAR = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

const COLORS = {
  navy: '#0F172A',
  emerald: '#047857',
  emeraldLight: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  slate: '#334155',
  muted: '#64748B',
  border: '#CBD5E1',
  bgLight: '#F8FAFC',
  amberBg: '#FFFBEB',
  amberBorder: '#FCD34D',
  white: '#FFFFFF',
};

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function drawPageHeader(doc: PDFKit.PDFDocument, subtitle: string) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 64).fill(COLORS.navy);
  doc.rect(0, 61, doc.page.width, 3).fill(COLORS.emerald);

  doc
    .fillColor(COLORS.white)
    .font('SansBold')
    .fontSize(14)
    .text('EDUPAY SCOLARITÉ', 42, 17, { lineBreak: false });

  doc
    .fillColor('#94A3B8')
    .font('Sans')
    .fontSize(8.8)
    .text(subtitle, 42, 37, { lineBreak: false });

  doc
    .fillColor('#34D399')
    .font('SansBold')
    .fontSize(8.5)
    .text('DOSSIER DE PRÉSENTATION & GUIDE', 310, 25, {
      width: doc.page.width - 352,
      align: 'right',
      lineBreak: false,
    });
  doc.restore();
}

function drawSectionTitle(doc: PDFKit.PDFDocument, num: string, title: string, y: number): number {
  doc.save();
  doc.roundedRect(42, y, 22, 22, 5).fill(COLORS.emerald);
  doc
    .fillColor(COLORS.white)
    .font('SansBold')
    .fontSize(11)
    .text(num, 42, y + 5, { width: 22, align: 'center', lineBreak: false });

  doc
    .fillColor(COLORS.navy)
    .font('SansBold')
    .fontSize(13)
    .text(title, 72, y + 4, { lineBreak: false });

  doc
    .moveTo(42, y + 27)
    .lineTo(doc.page.width - 42, y + 27)
    .lineWidth(1)
    .strokeColor('#E2E8F0')
    .stroke();
  doc.restore();
  return y + 36;
}

function drawCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  title: string,
  items: string[],
  accentColor: string = COLORS.emerald,
  bgColor: string = COLORS.bgLight,
  borderColor: string = '#E2E8F0'
): number {
  const paddingX = 13;
  const paddingTop = 10;
  const innerW = w - paddingX * 2;

  let contentH = paddingTop + 18;
  doc.font('Sans').fontSize(8.8);
  for (const item of items) {
    contentH += doc.heightOfString(`• ${item}`, { width: innerW, lineGap: 2 }) + 4;
  }
  const boxH = contentH + 8;

  doc.save();
  doc.roundedRect(x, y, w, boxH, 7).fillAndStroke(bgColor, borderColor);
  doc.rect(x, y, 4, boxH).fill(accentColor);

  doc
    .fillColor(COLORS.navy)
    .font('SansBold')
    .fontSize(10)
    .text(title, x + paddingX, y + paddingTop, { width: innerW });

  let curY = y + paddingTop + 18;
  doc.fillColor(COLORS.slate).font('Sans').fontSize(8.8);
  for (const item of items) {
    const h = doc.heightOfString(`• ${item}`, { width: innerW, lineGap: 2 });
    doc.text(`• ${item}`, x + paddingX, curY, { width: innerW, lineGap: 2 });
    curY += h + 4;
  }
  doc.restore();

  return y + boxH;
}

function drawBulletList(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  items: Array<{ label: string; desc: string }>
): number {
  let curY = y;
  const textW = w - 14;
  for (const item of items) {
    doc.save();
    doc.circle(x + 4, curY + 5, 2.5).fill(COLORS.emerald);

    doc.font('SansBold').fontSize(9.4).fillColor(COLORS.navy);
    const labelH = doc.heightOfString(item.label, { width: textW });
    doc.text(item.label, x + 13, curY, { width: textW });

    doc.font('Sans').fontSize(8.9).fillColor(COLORS.slate);
    const descY = curY + labelH + 2;
    const descH = doc.heightOfString(item.desc, { width: textW, lineGap: 2 });
    doc.text(item.desc, x + 13, descY, { width: textW, lineGap: 2 });

    curY = descY + descH + 8;
    doc.restore();
  }
  return curY;
}

function drawFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - 30;
    doc.save();
    doc
      .moveTo(42, bottomY - 7)
      .lineTo(doc.page.width - 42, bottomY - 7)
      .lineWidth(0.75)
      .strokeColor('#E2E8F0')
      .stroke();
    doc
      .fillColor(COLORS.muted)
      .font('Sans')
      .fontSize(8)
      .text(
        'EduPay Scolarité — Groupe Scolaire Excellence & Avenir · Ouagadougou · Session 2027-2028',
        42,
        bottomY,
        { lineBreak: false }
      );
    doc
      .fillColor(COLORS.navy)
      .font('SansBold')
      .fontSize(8)
      .text(`Page ${i + 1} / ${range.count}`, doc.page.width - 110, bottomY, {
        width: 68,
        align: 'right',
        lineBreak: false,
      });
    doc.restore();
  }
}

async function generatePdf() {
  ensureDir(OUTPUT_PATH);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 20, bottom: 20, left: 42, right: 42 },
    bufferPages: true,
    info: {
      Title: 'EduPay Scolarité - Fiche Complète, Guide & Mise en Production',
      Author: 'EduPay Scolarité',
      Subject: 'Présentation globale, fonctionnalités, mode d’emploi et étapes de mise en production',
    },
  });

  doc.registerFont('Sans', FONT_REGULAR);
  doc.registerFont('SansBold', FONT_BOLD);

  const stream = fs.createWriteStream(OUTPUT_PATH);
  doc.pipe(stream);

  const pageW = doc.page.width;
  const contentW = pageW - 84;
  const halfW = (contentW - 14) / 2;

  // =========================================================================
  // PAGE 1 : PRÉSENTATION GLOBALE & ARCHITECTURE DES ESPACES
  // =========================================================================
  drawPageHeader(doc, 'Présentation globale, fonctionnalités, guide d’utilisation & feuille de route');

  let y = 78;
  doc.save();
  doc.roundedRect(42, y, contentW, 86, 8).fillAndStroke(COLORS.emeraldLight, COLORS.emeraldBorder);
  doc
    .fillColor(COLORS.emerald)
    .font('SansBold')
    .fontSize(8.8)
    .text('FICHE DE PRÉSENTATION GLOBALE DU PROJET', 56, y + 11);
  doc
    .fillColor(COLORS.navy)
    .font('SansBold')
    .fontSize(14.5)
    .text('Plateforme de Gestion des Admissions & Paiements Scolaires', 56, y + 25);
  doc
    .fillColor(COLORS.slate)
    .font('Sans')
    .fontSize(9.1)
    .text(
      "EduPay Scolarité digitalise de bout en bout le parcours d'inscription, de réinscription et d'encaissement des frais scolaires (Mobile Money à distance et guichet espèces à l'école). Chaque famille dispose d'un espace privé cloisonné, et le Secrétariat pilote les dossiers, la trésorerie et la communication en temps réel sur une base PostgreSQL cloud.",
      56,
      y + 44,
      { width: contentW - 28, lineGap: 2 }
    );
  doc.restore();
  y += 100;

  y = drawSectionTitle(doc, '1', 'Vue d’ensemble & Valeur ajoutée pour l’établissement', y);

  const col1Y = drawCard(
    doc,
    42,
    y,
    halfW,
    'Pour la Direction & le Secrétariat',
    [
      "Centralisation des demandes d'admission avec bulletins et extraits de naissance (PDF et photos HD).",
      'Tableau de bord financier instantané : encaissements du jour, recouvrement et reste à percevoir.',
      'Guichet espèces au comptoir + validation des règlements Mobile Money au même endroit.',
      'Journal d’audit infalsifiable traçant chaque connexion, validation, refus ou encaissement.',
      "Pilotage en direct d'un Assistant IA renseignant les parents sur vos nouveautés.",
    ],
    COLORS.navy
  );

  const col2Y = drawCard(
    doc,
    42 + halfW + 14,
    y,
    halfW,
    'Pour les Parents d’Élèves',
    [
      'Espace parent individuel protégé : zéro visibilité sur les dossiers ou messages des autres familles.',
      'Dépôt de demande de place et suivi des décisions du secrétariat sans déplacement inutile.',
      'Paiement par Orange Money, Moov Money, MTN MoMo ou LigdiCash avec reçu officiel imprimable.',
      'Quittance officielle dotée d’un QR code et d’une signature cryptographique anti-fraude.',
      'Assistant IA disponible 24h/24 pour expliquer le site, les tarifs et les consignes de l’école.',
    ],
    COLORS.emerald
  );

  y = Math.max(col1Y, col2Y) + 16;

  y = drawSectionTitle(doc, '2', 'Architecture des 2 Portails & Contrôle d’Accès', y);

  y = drawBulletList(doc, 42, y, contentW, [
    {
      label: 'Portail Parents (Accès public / familles)',
      desc: "Accessible depuis le lien principal sur téléphone ou ordinateur. Chaque parent crée son compte avec son nom, son numéro de téléphone et son mot de passe. Un jeton de session vérifié côté serveur garantit l'isolation stricte des données par famille.",
    },
    {
      label: 'Espace Secrétariat & Direction (Accès restreint ?espace=secretaire)',
      desc: "Protégé par code PIN avec trois niveaux d'habilitation en base de données : Directeur (tous droits, création d'agents, réinitialisation base), Secrétaire (admissions, élèves, tarifs, assistant IA, validation Mobile Money) et Caissier / Intendant (guichet espèces, journal de caisse, suivi élèves).",
    },
    {
      label: 'Base de données & Stockage unifié (PostgreSQL Cloud)',
      desc: "Toutes les données (comptes parents, demandes d'admission, fichiers PDF/images en stockage binaire sécurisé, élèves, inscriptions annuelles, paiements, tarifs, consignes IA et journal d'audit) sont enregistrées en base relationnelle PostgreSQL.",
    },
  ]);

  y += 2;
  doc.save();
  doc.roundedRect(42, y, contentW, 56, 7).fillAndStroke('#F1F5F9', '#CBD5E1');
  doc
    .fillColor(COLORS.navy)
    .font('SansBold')
    .fontSize(9.2)
    .text('Niveaux scolaires configurés par défaut (Session 2027-2028) :', 54, y + 10);
  doc
    .fillColor(COLORS.slate)
    .font('Sans')
    .fontSize(8.6)
    .text(
      "• Collège : 6ème, 5ème, 4ème, 3ème    • Lycée Général : 2nde A, 2nde C, 1ère A, 1ère D, Tle A, Tle D\n• Enseignement Technique & Professionnel : BEP 1, BEP 2, Bac Pro 1, Bac Pro 2, C', D' (modifiable dans Tarifs)",
      54,
      y + 25,
      { width: contentW - 24, lineGap: 3 }
    );
  doc.restore();

  // =========================================================================
  // PAGE 2 : TOUTES LES FONCTIONNALITÉS DÉTAILLÉES
  // =========================================================================
  doc.addPage();
  drawPageHeader(doc, 'Inventaire complet des fonctionnalités (Portail Parents & Espace Secrétariat)');

  y = 78;
  y = drawSectionTitle(doc, '3', 'Fonctionnalités du Portail Parents', y);

  y = drawBulletList(doc, 42, y, contentW, [
    {
      label: 'Espace Privé & Récupération de Mot de Passe',
      desc: 'Inscription, connexion par téléphone et récupération autonome par code temporaire à 6 chiffres (valable 15 minutes, généré par le secrétariat ou envoyé par e-mail si Resend est configuré).',
    },
    {
      label: 'Demande de Place (Admission & Transfert)',
      desc: "Saisie complète du dossier élève, choix de la classe, origine scolaire, décision du conseil et moyenne annuelle. Téléversement direct du Bulletin du 3ème trimestre et de l'Extrait d'acte de naissance (PDF jusqu'à 3,5 Mo ou Photo HD).",
    },
    {
      label: 'Messagerie en Direct & Tunnel de Paiement',
      desc: "Notification immédiate dès que le Secrétariat accepte ou refuse la demande. En cas d'acceptation, le matricule officiel apparaît avec un bouton direct « Payer maintenant » qui ouvre la fiche de paiement de l'enfant.",
    },
    {
      label: 'Paiement Scolarité & Réinscription',
      desc: 'Rattachement d’un élève déjà inscrit via son matricule + téléphone, règlement par tranche ou solde complet via Orange Money (*144*4*6#), Moov Money (*555#), MTN MoMo (*133#) ou LigdiCash, avec option de don solidaire.',
    },
    {
      label: 'Mes Reçus & Vérificateur Anti-Fraude QR',
      desc: 'Téléchargement et impression des quittances officielles comportant la signature numérique et le QR code vérifiable publiquement depuis le bouton « Vérifier un Reçu ».',
    },
    {
      label: 'Aide & Assistant IA Permanent',
      desc: 'Bulle interactive guidant les parents pas à pas sur les onglets du site, les pièces à joindre, les tarifs 2027-2028 et les annonces publiées en direct par le Secrétariat.',
    },
  ]);

  y += 2;
  y = drawSectionTitle(doc, '4', 'Fonctionnalités de l’Espace Secrétariat & Direction', y);

  const adm1 = drawCard(
    doc,
    42,
    y,
    halfW,
    'Gestion Académique & Admissions',
    [
      'Visualiseur sécurisé : affichage intégré des PDF (lecteur natif) et zoom HD sur les images.',
      'Validation d’admission en 1 clic : attribution automatique du matricule et création de l’élève.',
      'Refus motivé : choix de motifs prédéfinis ou message personnalisé envoyé au parent.',
      'Gestion des élèves : recherche, encours financier, ajout manuel et import groupé.',
      'Tarifs & Scolarités : modification des montants (scolarité, inscription, annexes) en direct.',
    ],
    COLORS.emerald
  );

  const adm2 = drawCard(
    doc,
    42 + halfW + 14,
    y,
    halfW,
    'Trésorerie, Sécurité & IA',
    [
      'Guichet Espèces : encaissement au comptoir avec édition immédiate de quittance officielle.',
      'Journal de Caisse : vérification et confirmation/rejet des paiements Mobile Money reçus.',
      'Journal d’Audit : historique complet des opérations sensibles et auteurs.',
      'Équipe & Accès : gestion des agents, codes temporaires parents et nettoyage base (Directeur).',
      'Assistant IA : ajout/modification/pause de notes, nouveaux tarifs ou programmes en direct.',
    ],
    COLORS.navy
  );

  y = Math.max(adm1, adm2) + 12;

  drawCard(
    doc,
    42,
    y,
    contentW,
    'Garanties de Sécurité & Lutte contre la Fraude Intégrées',
    [
      'Cloisonnement strict par propriétaire : chaque requête API vérifie le jeton de session et filtre les dossiers sur le parent connecté (zéro fuite inter-utilisateurs).',
      'Validation des fichiers téléversés : contrôle du format réel (%PDF, JPEG, PNG, WEBP), limite à 3,5 Mo et lecture authentifiée.',
      'Anti-fraude quittances : signature cryptographique côté serveur vérifiable instantanément par QR code ou référence.',
      'Protection des mots de passe & codes temporaires : hachage sécurisé, expiration à 15 min et blocage après 5 essais incorrects.',
    ],
    '#B91C1C',
    '#FEF2F2',
    '#FECACA'
  );

  // =========================================================================
  // PAGE 3 : MODE D'EMPLOI PRATIQUE & SCÉNARIO DE DÉMONSTRATION
  // =========================================================================
  doc.addPage();
  drawPageHeader(doc, 'Mode d’emploi étape par étape (Parents, Secrétariat & Démonstration Proviseur)');

  y = 78;
  y = drawSectionTitle(doc, '5', 'Scénario de Démonstration Live (Téléphone + PC)', y);

  const prepEndY = drawCard(
    doc,
    42,
    y,
    contentW,
    'Préparation avant d’entrer dans le bureau du Proviseur (1 minute)',
    [
      'Connectez-vous sur votre PC à l’Espace Secrétariat (?espace=secretaire) avec le code PIN Directeur.',
      'Allez dans « Équipe & Accès » → bloc rouge « Nettoyage & Données Réelles ».',
      'Cochez « Supprimer aussi les comptes parents créés pendant les tests » puis cliquez sur « Oui, réinitialiser maintenant ».',
      'Votre base est vierge de tout dossier de test tout en gardant les tarifs officiels, les agents et vos notes IA.',
    ],
    '#D97706',
    COLORS.amberBg,
    COLORS.amberBorder
  );
  y = prepEndY + 12;

  y = drawBulletList(doc, 42, y, contentW, [
    {
      label: 'Étape 1 — Téléphone du Proviseur (Portail Parents)',
      desc: "Ouvrez le lien public. Cliquez sur « Créer un compte parent », saisissez nom, téléphone et mot de passe. Allez dans « Demande de Place », remplissez le dossier d'un élève et joignez une photo ou un PDF de bulletin + extrait de naissance.",
    },
    {
      label: 'Étape 2 — PC (Espace Secrétariat)',
      desc: "Ouvrez l'onglet « Demandes d'Admission ». Le dossier apparaît aussitôt. Cliquez sur « Examiner / Pièces » pour afficher le bulletin et l'extrait de naissance à l'écran, puis validez le dossier pour attribuer le matricule.",
    },
    {
      label: 'Étape 3 — Téléphone du Proviseur (Messages & Paiement)',
      desc: "Ouvrez l'onglet « Messages ». La décision positive et le matricule s'affichent. Cliquez sur « Payer maintenant », choisissez Orange Money ou Moov Money, saisissez un montant et validez avec le code OTP.",
    },
    {
      label: 'Étape 4 — PC (Journal de Caisse) → Téléphone (Reçu QR)',
      desc: "Sur le PC, ouvrez « Journal de Caisse » et confirmez l'encaissement Mobile Money. Sur le téléphone, allez dans « Mes Reçus » : le reçu officiel imprimable et son QR code vérifiable sont disponibles.",
    },
    {
      label: 'Étape 5 — Bonus en direct (Assistant IA)',
      desc: "Sur le PC, ouvrez « Assistant IA » et publiez une note (ex : « Nouveau tarif cantine : 15 000 FCFA/mois »). Posez aussitôt la question dans « Aide & Assistant IA » sur le téléphone : l'IA répond immédiatement avec la nouvelle info !",
    },
  ]);

  y += 2;
  y = drawSectionTitle(doc, '6', 'Opérations Courantes du Secrétariat au Quotidien', y);

  drawBulletList(doc, 42, y, contentW, [
    {
      label: 'Parent ayant oublié son mot de passe',
      desc: "Dans « Équipe & Accès » → « Assistance Parents », sélectionnez le parent (ou tapez son numéro), cliquez sur « Générer un code temporaire (15 min) » et transmettez-lui les 6 chiffres. Le parent utilise « Mot de passe oublié ? ».",
    },
    {
      label: 'Encaissement au guichet de l’école',
      desc: "Dans « Guichet Espèces », recherchez l'élève par nom ou matricule, saisissez la somme remise en main propre et validez : la quittance officielle sort immédiatement et le solde du parent est mis à jour.",
    },
    {
      label: 'Mise à jour des frais ou annonces',
      desc: "Modifiez n'importe quel tarif dans « Tarifs & Scolarités » et publiez les consignes ponctuelles dans « Assistant IA » : l'information est aussitôt visible sur le Portail Parents.",
    },
  ]);

  // =========================================================================
  // PAGE 4 : FEUILLE DE ROUTE POUR L'OUVERTURE AU GRAND PUBLIC
  // =========================================================================
  doc.addPage();
  drawPageHeader(doc, 'Feuille de route finale : passer de la démonstration au grand public');

  y = 78;
  y = drawSectionTitle(doc, '7', 'Ce qui est déjà 100 % prêt aujourd’hui', y);

  const readyEndY = drawCard(
    doc,
    42,
    y,
    contentW,
    'Socle applicatif complet & opérationnel',
    [
      'Architecture Full-Stack React + API serveur connectée à PostgreSQL cloud avec synchronisation temps réel.',
      'Isolation stricte des espaces parents, validation des jetons côté serveur et journal d’audit complet.',
      'Stockage réel des documents (PDF et images HD) en base de données PostgreSQL et visualiseur intégré.',
      'Récupération de mot de passe parent sécurisée par code temporaire à 6 chiffres (et support e-mail prêt).',
      'Assistant IA parents relié en temps réel aux tarifs officiels et aux pré-instructions publiées par le secrétariat.',
      'Fonction de nettoyage complet en 1 clic pour effacer les données de test avant l’ouverture officielle.',
    ],
    COLORS.emerald,
    COLORS.emeraldLight,
    COLORS.emeraldBorder
  );

  y = readyEndY + 14;
  y = drawSectionTitle(doc, '8', 'Les 5 étapes qu’il reste à accomplir pour le grand public', y);

  y = drawBulletList(doc, 42, y, contentW, [
    {
      label: '1. Souscrire un agrément marchand Mobile Money réel (Indispensable)',
      desc: "Actuellement, les paiements Mobile Money fonctionnent avec validation manuelle par le secrétariat. Pour encaisser automatiquement l'argent réel des parents, ouvrez un compte marchand auprès d'un agrégateur agréé (LigdiCash, PayDunya, CinetPay) ou Orange/Moov Money Business, puis branchez les clés API et le webhook serveur.",
    },
    {
      label: '2. Déployer en production sur un nom de domaine officiel HTTPS',
      desc: "Déployez le projet (Vercel ou serveur Node.js) avec le domaine officiel de l'école (ex : scolarite.votre-ecole.bf) et renseignez les variables d'environnement de production : DATABASE_URL, AUTH_SECRET, ADMIN_PIN personnalisé et GEMINI_API_KEY.",
    },
    {
      label: '3. Activer l’envoi automatique d’e-mails ou SMS (Recommandé)',
      desc: "Ajoutez RESEND_API_KEY et RESEND_FROM_EMAIL (domaine vérifié) pour envoyer automatiquement les codes de réinitialisation de mot de passe par e-mail aux parents sans intervention du secrétariat.",
    },
    {
      label: '4. Configurer les comptes réels, tarifs et l’identité de l’école',
      desc: "En tant que Directeur, créez les comptes nominatifs de chaque secrétaire et caissier (avec leurs codes PIN), vérifiez la grille dans « Tarifs & Scolarités » et rédigez les annonces de rentrée dans « Assistant IA ».",
    },
    {
      label: '5. Nettoyage final, sauvegardes et pilote avec 2-3 familles',
      desc: "Exécutez « Nettoyage & Données Réelles » (en cochant la suppression des comptes parents de test), vérifiez les sauvegardes automatiques PostgreSQL et testez un parcours complet avec quelques familles pilotes avant le lancement officiel.",
    },
  ]);

  y += 2;
  doc.save();
  doc.roundedRect(42, y, contentW, 56, 7).fillAndStroke(COLORS.navy, COLORS.navy);
  doc
    .fillColor('#34D399')
    .font('SansBold')
    .fontSize(9.2)
    .text('RAPPEL DES LIENS D’ACCÈS DE VOTRE ENVIRONNEMENT ACTUEL', 54, y + 9);
  doc
    .fillColor(COLORS.white)
    .font('Sans')
    .fontSize(8.3)
    .text(
      '• Portail Parents : https://ais-dev-xfehrw2tc73dpqtujpue33-935794893430.europe-west2.run.app\n• Espace Secrétariat : https://ais-dev-xfehrw2tc73dpqtujpue33-935794893430.europe-west2.run.app/?espace=secretaire',
      54,
      y + 24,
      { width: contentW - 24, lineGap: 3 }
    );
  doc.restore();

  drawFooters(doc);
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  console.log('PDF_GENERATED:', OUTPUT_PATH, fs.statSync(OUTPUT_PATH).size, 'bytes');
}

void generatePdf();
