import React, { useEffect, useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  User, 
  Phone, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  Upload, 
  FileCheck, 
  HeartHandshake, 
  School,
  RefreshCw,
  Mail
} from 'lucide-react';
import { SchoolStore, CURRENT_SCHOOL_YEAR } from '../../services/store';
import { SyncService } from '../../services/sync';
import { AdmissionRequest, AcademicDecision, TransferReason, ParentAccount } from '../../types';

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const maxDim = 700;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let output = canvas.toDataURL('image/jpeg', 0.55);
        if (output.length > 65000) {
          const smallCanvas = document.createElement('canvas');
          const smallRatio = Math.min(480 / img.width, 480 / img.height, 1);
          smallCanvas.width = Math.round(img.width * smallRatio);
          smallCanvas.height = Math.round(img.height * smallRatio);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
            output = smallCanvas.toDataURL('image/jpeg', 0.45);
          }
        }
        resolve(output);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface AdmissionFormProps {
  parentAccount?: ParentAccount | null;
  onSuccess: (req: AdmissionRequest) => void;
  onGoToMessages?: () => void;
}

export const AdmissionForm: React.FC<AdmissionFormProps> = ({
  parentAccount,
  onSuccess,
  onGoToMessages,
}) => {
  // Identity
  const [nomEnfant, setNomEnfant] = useState('');
  const [prenomEnfant, setPrenomEnfant] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [classeDemandee, setClasseDemandee] = useState('CP1');
  const [nomParent, setNomParent] = useState(parentAccount?.nomComplet || '');
  const [telephoneParent, setTelephoneParent] = useState(parentAccount?.telephone || '');
  const [emailParent, setEmailParent] = useState(parentAccount?.email || '');
  const [adresse, setAdresse] = useState('');

  // Transfer, 3rd Term Report Card & Extrait de naissance
  const [estNouveauTransfert, setEstNouveauTransfert] = useState(true);
  const [etablissementOrigine, setEtablissementOrigine] = useState('');
  const [decisionBulletin, setDecisionBulletin] = useState<AcademicDecision>('PASSAGE');
  const [moyenneAnnuelle, setMoyenneAnnuelle] = useState<string>('12.50');
  const [motifVenue, setMotifVenue] = useState<TransferReason>('DEMENAGEMENT');
  const [descriptionVenue, setDescriptionVenue] = useState('');
  const [bulletinFichier, setBulletinFichier] = useState<string>('bulletin_3eme_trimestre_officiel.pdf');
  const [bulletinUrl, setBulletinUrl] = useState<string>('');
  const [hasUploadedFile, setHasUploadedFile] = useState(false);
  const [extraitFichier, setExtraitFichier] = useState<string>('extrait_naissance_eleve.pdf');
  const [extraitUrl, setExtraitUrl] = useState<string>('');
  const [hasUploadedExtrait, setHasUploadedExtrait] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Donation / Support funds
  const [montantDon, setMontantDon] = useState<number>(5000);
  const [customDon, setCustomDon] = useState<string>('5000');

  const [notes, setNotes] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<AdmissionRequest | null>(null);

  useEffect(() => {
    if (parentAccount) {
      setNomParent((prev) => prev || parentAccount.nomComplet || '');
      setTelephoneParent((prev) => prev || parentAccount.telephone || '');
      setEmailParent((prev) => prev || parentAccount.email || '');
    }
  }, [parentAccount]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    synced: boolean;
    error?: string;
    retrying?: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  const classes = [
    'Maternelle Petite Section',
    'Maternelle Moyenne Section',
    'Maternelle Grande Section',
    'CP1',
    'CP2',
    'CE1',
    'CE2',
    'CM1',
    'CM2',
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    '2nde A',
    '2nde C',
    '1ère A',
    '1ère D',
    'Tle A',
    'Tle D',
    'BEP 1',
    'BEP 2',
    'Bac Pro 1',
    'Bac Pro 2',
    "C'",
    "D'",
  ];

  const processAttachment = async (
    file: File,
    onName: (name: string) => void,
    onUrl: (url: string) => void,
    onFlag: (flag: boolean) => void
  ) => {
    onName(file.name);
    onFlag(true);
    setError('');
    setIsProcessingFile(true);

    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImageToDataUrl(file);
        onUrl(compressed);
      } else if (file.size <= 220 * 1024) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            resolve(typeof uploadEvent.target?.result === 'string' ? uploadEvent.target.result : '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        onUrl(dataUrl);
      } else {
        onUrl('');
      }
    } catch {
      onUrl('');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await processAttachment(
      e.target.files[0],
      setBulletinFichier,
      setBulletinUrl,
      setHasUploadedFile
    );
  };

  const handleExtraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await processAttachment(
      e.target.files[0],
      setExtraitFichier,
      setExtraitUrl,
      setHasUploadedExtrait
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isProcessingFile) return;
    setError('');

    if (!nomEnfant.trim() || !prenomEnfant.trim() || !telephoneParent.trim() || !nomParent.trim()) {
      setError('Veuillez renseigner les champs obligatoires (nom, prénom, parent, téléphone).');
      return;
    }

    if (estNouveauTransfert && !descriptionVenue.trim()) {
      setError("Veuillez préciser la raison de la venue de l'élève dans notre école (déménagement, problème, etc.).");
      return;
    }

    setIsSubmitting(true);
    try {
      const donValue = Math.max(0, Number(customDon) || 0);
      const parsedMoyenne = moyenneAnnuelle.trim() === '' ? undefined : Number(moyenneAnnuelle);

      const submitPromise = SchoolStore.addAdmissionRequestAsync({
        parentCompteId: parentAccount?.id,
        nomEnfant: nomEnfant.trim(),
        prenomEnfant: prenomEnfant.trim(),
        dateNaissance: dateNaissance || '2018-01-01',
        classeDemandee,
        nomParent: nomParent.trim(),
        telephoneParent: telephoneParent.trim(),
        emailParent: emailParent.trim() || undefined,
        adresse: adresse.trim() || 'Ouagadougou',
        notes: notes.trim() || undefined,
        estNouveauTransfert,
        etablissementOrigine: estNouveauTransfert ? etablissementOrigine.trim() || 'Non précisé' : 'Interne',
        decisionBulletin,
        moyenneAnnuelle: parsedMoyenne !== undefined && !Number.isNaN(parsedMoyenne) ? parsedMoyenne : 0,
        motifVenue: estNouveauTransfert ? motifVenue : 'EXCELLENCE',
        descriptionVenue: descriptionVenue.trim() || 'Réinscription interne / Nouveau cycle',
        bulletinNomFichier: bulletinFichier,
        bulletinUrl: bulletinUrl || undefined,
        extraitNaissanceNomFichier: extraitFichier,
        extraitNaissanceUrl: extraitUrl || undefined,
        montantDon: donValue,
      });

      const timeoutGuard = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'La connexion a expiré. Veuillez réessayer.'
              )
            ),
          12000
        );
      });

      const res = await Promise.race([submitPromise, timeoutGuard]);

      setSubmittedRequest(res.request);
      setSyncStatus({ synced: res.synced, error: res.error });
      void SyncService.synchroniserMaintenant();
      onSuccess(res.request);
    } catch (err) {
      console.error('[AdmissionForm] Erreur soumission:', err);
      const localLatest = SchoolStore.getAdmissions()[0];
      const msg =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement de la demande.";
      if (localLatest && localLatest.nomEnfant === nomEnfant.trim() && localLatest.prenomEnfant === prenomEnfant.trim()) {
        setSubmittedRequest(localLatest);
        setSyncStatus({ synced: false, error: msg });
        onSuccess(localLatest);
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySync = async () => {
    if (!submittedRequest) return;
    setSyncStatus((prev) => ({ synced: prev?.synced ?? false, error: prev?.error, retrying: true }));
    const res = await SchoolStore.retrySyncAdmission(submittedRequest.id);
    setSyncStatus({ synced: res.synced, error: res.error, retrying: false });
    if (res.synced) {
      void SyncService.synchroniserMaintenant();
    }
  };

  const handleReset = () => {
    setNomEnfant('');
    setPrenomEnfant('');
    setDateNaissance('');
    setNomParent(parentAccount?.nomComplet || '');
    setTelephoneParent(parentAccount?.telephone || '');
    setEmailParent(parentAccount?.email || '');
    setAdresse('');
    setNotes('');
    setDescriptionVenue('');
    setEtablissementOrigine('');
    setHasUploadedFile(false);
    setBulletinUrl('');
    setHasUploadedExtrait(false);
    setExtraitUrl('');
    setSubmittedRequest(null);
    setSyncStatus(null);
    setError('');
  };

  if (submittedRequest) {
    const isSynced = syncStatus?.synced !== false;
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-5 sm:p-8 shadow-sm text-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
          Demande d'Admission Envoyée
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
          Le dossier de <strong className="text-slate-900">{submittedRequest.prenomEnfant} {submittedRequest.nomEnfant}</strong> pour la classe de <strong className="text-emerald-700">{submittedRequest.classeDemandee}</strong> a bien été enregistré.
        </p>

        {!isSynced && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleRetrySync}
              disabled={syncStatus?.retrying}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus?.retrying ? 'animate-spin' : ''}`} />
              <span>{syncStatus?.retrying ? 'Envoi en cours...' : 'Finaliser la transmission'}</span>
            </button>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left text-xs space-y-2.5">
          <div className="flex flex-wrap justify-between gap-1">
            <span className="text-slate-500">Numéro de dossier :</span>
            <span className="font-mono font-bold text-slate-800 break-all">{submittedRequest.id}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-1">
            <span className="text-slate-500">Décision bulletin 3ème trimestre :</span>
            <span className={`font-semibold ${
              submittedRequest.decisionBulletin === 'PASSAGE' 
                ? 'text-emerald-700' 
                : submittedRequest.decisionBulletin === 'REDOUBLEMENT'
                ? 'text-amber-700'
                : 'text-blue-700'
            }`}>
              {submittedRequest.decisionBulletin === 'PASSAGE' 
                ? 'Passage en classe supérieure' 
                : submittedRequest.decisionBulletin === 'REDOUBLEMENT'
                ? 'Redoublement de classe'
                : 'Nouveau cycle'}
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-1">
            <span className="text-slate-500">Bulletin joint :</span>
            <span className="font-mono text-slate-800 truncate max-w-[210px]">{submittedRequest.bulletinNomFichier}</span>
          </div>
          {submittedRequest.extraitNaissanceNomFichier && (
            <div className="flex flex-wrap justify-between gap-1">
              <span className="text-slate-500">Extrait de naissance :</span>
              <span className="font-mono text-slate-800 truncate max-w-[210px]">
                {submittedRequest.extraitNaissanceNomFichier}
              </span>
            </div>
          )}
          {submittedRequest.montantDon > 0 && (
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Don / Soutien prévu :</span>
              <span className="font-mono font-bold text-emerald-800">
                {submittedRequest.montantDon.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {onGoToMessages && (
            <button
              type="button"
              onClick={onGoToMessages}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Consulter mes Messages & Suivi</span>
            </button>
          )}
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
          >
            Inscrire un autre enfant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm max-w-3xl mx-auto">
      <div className="mb-6">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
          Inscription · {CURRENT_SCHOOL_YEAR}
        </span>
        <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
          Demande d'Admission
        </h2>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Identité Enfant */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-emerald-700" />
            1. Identité de l'Élève & Classe Demandée
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de famille *
              </label>
              <input
                type="text"
                required
                value={nomEnfant}
                onChange={(e) => setNomEnfant(e.target.value)}
                placeholder="Ex: OUÉDRAOGO"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prénom(s) de l'enfant *
              </label>
              <input
                type="text"
                required
                value={prenomEnfant}
                onChange={(e) => setPrenomEnfant(e.target.value)}
                placeholder="Ex: Abdoul Kader"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date de naissance
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Classe souhaitée dans notre école *
              </label>
              <select
                value={classeDemandee}
                onChange={(e) => setClasseDemandee(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Bulletin du 3ème Trimestre & Établissement d'Origine */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>2. Bulletin & Situation Scolaire</span>
            </h3>
          </div>

          {/* Transfer toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              L'élève provient-il d'un autre établissement ?
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transfert"
                  checked={estNouveauTransfert}
                  onChange={() => setEstNouveauTransfert(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-800">Oui, transfert d'une autre école</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transfert"
                  checked={!estNouveauTransfert}
                  onChange={() => setEstNouveauTransfert(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-800">Non, réinscription interne / Nouveau cycle</span>
              </label>
            </div>
          </div>

          {estNouveauTransfert && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" />
                Nom de l'école ou établissement d'origine *
              </label>
              <input
                type="text"
                required={estNouveauTransfert}
                value={etablissementOrigine}
                onChange={(e) => setEtablissementOrigine(e.target.value)}
                placeholder="Ex: Complexe Scolaire Saint-Joseph de Koudougou"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          )}

          {/* Decision du bulletin: Passage vs Redoublement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Décision indiquée sur le bulletin du 3ème trimestre *
              </label>
              <select
                value={decisionBulletin}
                onChange={(e) => setDecisionBulletin(e.target.value as AcademicDecision)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
              >
                <option value="PASSAGE">Admis (Passage en classe supérieure)</option>
                <option value="REDOUBLEMENT">Non admis (Redoublement de la classe)</option>
                <option value="NOUVEAU_CYCLE">Nouveau cycle (Maternelle ou CP1)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Moyenne annuelle du 3ème trimestre (sur 20)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                value={moyenneAnnuelle}
                onChange={(e) => setMoyenneAnnuelle(e.target.value)}
                placeholder="Ex: 14.50"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
              />
            </div>
          </div>

          {/* Raison de la venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motif principal de la venue dans notre école *
              </label>
              <select
                value={motifVenue}
                onChange={(e) => setMotifVenue(e.target.value as TransferReason)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="DEMENAGEMENT">Déménagement familial / Mutation</option>
                <option value="RAPPROCHEMENT">Rapprochement géographique du domicile</option>
                <option value="EXCLUSION_PROBLEME">Envoyé / Problème dans l'ancien établissement</option>
                <option value="EXCELLENCE">Recherche d'un meilleur niveau scolaire & discipline</option>
                <option value="AUTRE">Autre convenance personnelle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                Bulletin du 3ème trimestre *
              </label>
              <label className="flex items-center justify-between gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 cursor-pointer">
                <span className="text-[11px] text-slate-600 truncate min-w-0 flex-1">
                  {isProcessingFile
                    ? 'Optimisation...'
                    : hasUploadedFile
                    ? bulletinFichier
                    : 'Téléverser le bulletin (PDF / Photo)'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                  {isProcessingFile ? '...' : hasUploadedFile ? 'Prêt' : 'Parcourir'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                Extrait d'acte de naissance de l'élève *
              </label>
              <label className="flex items-center justify-between gap-2 px-3 py-2 border border-dashed border-emerald-300 rounded-xl bg-white hover:bg-emerald-50/40 cursor-pointer">
                <span className="text-[11px] text-slate-600 truncate min-w-0 flex-1">
                  {isProcessingFile
                    ? 'Optimisation...'
                    : hasUploadedExtrait
                    ? extraitFichier
                    : "Téléverser l'extrait de naissance (Photo ou PDF)"}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                  {isProcessingFile ? '...' : hasUploadedExtrait ? 'Extrait prêt' : 'Joindre Extrait'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleExtraitUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Description personnalisée de la raison */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description de la raison de venue dans notre école *
            </label>
            <textarea
              rows={2}
              required={estNouveauTransfert}
              value={descriptionVenue}
              onChange={(e) => setDescriptionVenue(e.target.value)}
              placeholder="Précisez ici les circonstances : déménagement du secteur X, ou élève envoyé pour encadrement spécifique..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            ></textarea>
          </div>
        </div>

        {/* SECTION 3: Don & Contribution de soutien */}
        <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-purple-700 shrink-0" />
              <span>3. Don / Contribution (Optionnel)</span>
            </h3>
          </div>

          <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
              {[0, 2000, 5000, 10000, 20000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setMontantDon(val);
                    setCustomDon(val.toString());
                  }}
                  className={`px-2.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                    customDon === val.toString()
                      ? 'bg-purple-800 text-white border-purple-800'
                      : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                  }`}
                >
                  {val === 0 ? 'Sans don' : `${val.toLocaleString('fr-FR')} F`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-[140px] sm:ml-auto">
              <input
                type="number"
                step="500"
                min="0"
                value={customDon}
                onChange={(e) => {
                  setCustomDon(e.target.value);
                  setMontantDon(Number(e.target.value) || 0);
                }}
                placeholder="Montant libre"
                className="w-full px-2.5 py-2 sm:py-1.5 text-xs font-mono font-bold rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Informations Parent */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Phone className="w-4 h-4 text-emerald-700" />
            4. Informations du Parent / Responsable Légal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom & Prénom du Parent *
              </label>
              <input
                type="text"
                required
                value={nomParent}
                onChange={(e) => setNomParent(e.target.value)}
                placeholder="Ex: Moussa Ouédraogo"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de Téléphone (WhatsApp / Appel) *
              </label>
              <input
                type="tel"
                required
                value={telephoneParent}
                onChange={(e) => setTelephoneParent(e.target.value)}
                placeholder="Ex: 70 12 34 56"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quartier de résidence *
              </label>
              <input
                type="text"
                required
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Ex: Gounghin, Secteur 28"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Email (facultatif)
              </label>
              <input
                type="email"
                value={emailParent}
                onChange={(e) => setEmailParent(e.target.value)}
                placeholder="parent@gmail.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isProcessingFile}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-500 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Envoi en cours...</span>
            </>
          ) : isProcessingFile ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Préparation du document...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 shrink-0" />
              <span>Envoyer la Demande d'Admission</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
