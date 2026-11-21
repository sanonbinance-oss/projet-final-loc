import React, { useState, useMemo } from 'react';
import {
  Mail,
  XCircle,
  CheckCircle2,
  Search,
  Clock,
  FileText,
  ArrowRight,
  CheckCheck,
  Receipt,
  AlertTriangle,
  Inbox,
  School,
} from 'lucide-react';
import { AdmissionRequest, Payment, Student } from '../../types';

const READ_MESSAGES_STORAGE_KEY = 'edupay_parent_read_messages_v5';

export type ParentMessageCategory =
  | 'ADMISSION_REFUSEE'
  | 'ADMISSION_ACCEPTEE'
  | 'PAIEMENT_REFUSE'
  | 'PAIEMENT_VALIDE';

export interface ParentNotificationMessage {
  id: string;
  category: ParentMessageCategory;
  date: string;
  title: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  classe: string;
  referenceId: string;
  body: string;
  motif?: string;
  documentName?: string;
  matriculeAttribue?: string;
  admission?: AdmissionRequest;
  payment?: Payment;
}

export function getReadMessageIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(READ_MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore storage parse error
  }
  return [];
}

function saveReadMessageIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READ_MESSAGES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage quota error on mobile private browsing
  }
  window.dispatchEvent(new Event('edupay_messages_read_change'));
}

export function markMessageAsRead(msgId: string) {
  const existing = getReadMessageIds();
  if (!existing.includes(msgId)) {
    saveReadMessageIds([...existing, msgId]);
  }
}

export function markAllMessagesAsRead(msgIds: string[]) {
  const existing = new Set(getReadMessageIds());
  msgIds.forEach((id) => existing.add(id));
  saveReadMessageIds(Array.from(existing));
}

export function buildParentMessages(
  admissions: AdmissionRequest[],
  payments: Payment[]
): ParentNotificationMessage[] {
  const list: ParentNotificationMessage[] = [];

  for (const adm of admissions) {
    if (adm.statut === 'refuse') {
      list.push({
        id: `MSG_ADM_${adm.id}_refuse`,
        category: 'ADMISSION_REFUSEE',
        date: adm.dateTraitement || adm.dateDemande,
        title: `Demande d'admission non retenue — ${adm.prenomEnfant} ${adm.nomEnfant}`,
        childName: `${adm.prenomEnfant} ${adm.nomEnfant}`,
        parentName: adm.nomParent,
        parentPhone: adm.telephoneParent,
        classe: adm.classeDemandee,
        referenceId: adm.id,
        documentName: adm.bulletinNomFichier || 'Bulletin fourni',
        motif: adm.motifRefus || 'Bulletin non conforme ou places indisponibles dans cette classe.',
        body: `Bonjour ${adm.nomParent}, après vérification du dossier et du bulletin de ${adm.prenomEnfant} ${adm.nomEnfant} pour la classe de ${adm.classeDemandee}, le secrétariat ne peut malheureusement pas valider cette demande pour le motif indiqué ci-dessous.`,
        admission: adm,
      });
    } else if (adm.statut === 'accepte') {
      list.push({
        id: `MSG_ADM_${adm.id}_accepte`,
        category: 'ADMISSION_ACCEPTEE',
        date: adm.dateTraitement || adm.dateDemande,
        title: `Admission validée — ${adm.prenomEnfant} ${adm.nomEnfant}`,
        childName: `${adm.prenomEnfant} ${adm.nomEnfant}`,
        parentName: adm.nomParent,
        parentPhone: adm.telephoneParent,
        classe: adm.classeDemandee,
        referenceId: adm.id,
        documentName: adm.bulletinNomFichier || 'Bulletin officiel',
        matriculeAttribue: adm.matriculeAttribue,
        body: `Félicitations ${adm.nomParent} ! Le bulletin et le dossier de ${adm.prenomEnfant} ${adm.nomEnfant} (${adm.classeDemandee}) ont été approuvés par le secrétariat. Le matricule ${adm.matriculeAttribue || ''} a été attribué : vous pouvez dès maintenant régler la scolarité.`,
        admission: adm,
      });
    }
  }

  for (const pay of payments) {
    if (pay.statut === 'ECHOUE') {
      list.push({
        id: `MSG_PAY_${pay.id}_echoue`,
        category: 'PAIEMENT_REFUSE',
        date: pay.date,
        title: `Paiement Mobile Money non validé (${pay.montant.toLocaleString('fr-FR')} FCFA) — ${pay.studentNom}`,
        childName: pay.studentNom,
        parentName: pay.nomPayeur,
        parentPhone: pay.telephonePayeur || '',
        classe: pay.studentClasse,
        referenceId: pay.reference,
        motif: pay.motifRejetPaiement || 'Fonds non reçus sur le compte Mobile Money de l\'établissement.',
        body: `Votre déclaration de paiement de ${pay.montant.toLocaleString('fr-FR')} FCFA (Code OTP : ${pay.codeOtp || 'N/A'}) n'a pas pu être confirmée par la caisse.`,
        payment: pay,
      });
    } else if (pay.statut === 'SUCCES' && pay.mode !== 'ESPECES_GUICHET') {
      list.push({
        id: `MSG_PAY_${pay.id}_succes`,
        category: 'PAIEMENT_VALIDE',
        date: pay.dateValidationSecretaire || pay.date,
        title: `Paiement confirmé & Reçu disponible (${pay.montant.toLocaleString('fr-FR')} FCFA) — ${pay.studentNom}`,
        childName: pay.studentNom,
        parentName: pay.nomPayeur,
        parentPhone: pay.telephonePayeur || '',
        classe: pay.studentClasse,
        referenceId: pay.reference,
        body: `Le secrétariat a bien vérifié la réception de votre versement de ${pay.montant.toLocaleString('fr-FR')} FCFA pour ${pay.studentNom}. Votre quittance officielle certifiée est disponible.`,
        payment: pay,
      });
    }
  }

  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getUnreadParentMessagesCount(
  admissions: AdmissionRequest[],
  payments: Payment[]
): number {
  const messages = buildParentMessages(admissions, payments);
  const readIds = new Set(getReadMessageIds());
  return messages.filter((m) => !readIds.has(m.id)).length;
}

interface ParentMessagesTabProps {
  admissions: AdmissionRequest[];
  payments: Payment[];
  students: Student[];
  readMessageIds: string[];
  onGoToAdmission: () => void;
  onGoToPaymentWithStudent: (student: Student) => void;
  onOpenReceipt: (payment: Payment) => void;
}

export const ParentMessagesTab: React.FC<ParentMessagesTabProps> = ({
  admissions,
  payments,
  students,
  readMessageIds,
  onGoToAdmission,
  onGoToPaymentWithStudent,
  onOpenReceipt,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'REFUSED' | 'ACCEPTED' | 'PAYMENTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const allMessages = useMemo(
    () => buildParentMessages(admissions, payments),
    [admissions, payments]
  );

  const readSet = useMemo(() => new Set(readMessageIds), [readMessageIds]);

  const counts = useMemo(() => {
    return {
      all: allMessages.length,
      unread: allMessages.filter((m) => !readSet.has(m.id)).length,
      refused: allMessages.filter((m) => m.category === 'ADMISSION_REFUSEE').length,
      accepted: allMessages.filter((m) => m.category === 'ADMISSION_ACCEPTEE').length,
      payments: allMessages.filter(
        (m) => m.category === 'PAIEMENT_REFUSE' || m.category === 'PAIEMENT_VALIDE'
      ).length,
    };
  }, [allMessages, readSet]);

  const filteredMessages = useMemo(() => {
    return allMessages.filter((msg) => {
      if (filter === 'UNREAD' && readSet.has(msg.id)) return false;
      if (filter === 'REFUSED' && msg.category !== 'ADMISSION_REFUSEE') return false;
      if (filter === 'ACCEPTED' && msg.category !== 'ADMISSION_ACCEPTEE') return false;
      if (
        filter === 'PAYMENTS' &&
        msg.category !== 'PAIEMENT_REFUSE' &&
        msg.category !== 'PAIEMENT_VALIDE'
      ) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          msg.childName.toLowerCase().includes(q) ||
          msg.parentName.toLowerCase().includes(q) ||
          msg.parentPhone.toLowerCase().includes(q) ||
          msg.referenceId.toLowerCase().includes(q) ||
          (msg.motif && msg.motif.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allMessages, filter, searchQuery, readSet]);

  const handlePayForAccepted = (msg: ParentNotificationMessage) => {
    markMessageAsRead(msg.id);
    const matchingStudent = students.find(
      (s) =>
        (msg.matriculeAttribue && s.matricule === msg.matriculeAttribue) ||
        `${s.prenom} ${s.nom}`.toLowerCase() === msg.childName.toLowerCase()
    );
    if (matchingStudent) {
      onGoToPaymentWithStudent(matchingStudent);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Messages & Réponses du Secrétariat
                </h2>
                {counts.unread > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                    {counts.unread} non lu{counts.unread > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {counts.unread > 0 && (
            <button
              onClick={() => markAllMessagesAsRead(allMessages.map((m) => m.id))}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <CheckCheck className="w-4 h-4 text-emerald-700" />
              <span>Tout marquer comme lu</span>
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="pt-4 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom de l'élève, nom du parent, numéro de téléphone ou N° de dossier..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tous ({counts.all})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Non lus ({counts.unread})
            </button>
            <button
              onClick={() => setFilter('REFUSED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filter === 'REFUSED'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Dossiers refusés ({counts.refused})
            </button>
            <button
              onClick={() => setFilter('ACCEPTED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filter === 'ACCEPTED'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Admissions validées ({counts.accepted})
            </button>
            <button
              onClick={() => setFilter('PAYMENTS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filter === 'PAYMENTS'
                  ? 'bg-indigo-700 text-white border-indigo-700'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              Paiements ({counts.payments})
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Aucune notification disponible
          </h3>
          <button
            onClick={onGoToAdmission}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
          >
            <span>Déposer une demande d'admission</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const isUnread = !readSet.has(msg.id);
            const formattedDate = new Date(msg.date).toLocaleString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isRefusal = msg.category === 'ADMISSION_REFUSEE';
            const isAccepted = msg.category === 'ADMISSION_ACCEPTEE';
            const isPayRefused = msg.category === 'PAIEMENT_REFUSE';

            return (
              <div
                key={msg.id}
                onClick={() => {
                  if (isUnread) markMessageAsRead(msg.id);
                }}
                className={`rounded-2xl border p-4 sm:p-6 transition-all shadow-sm ${
                  isRefusal
                    ? isUnread
                      ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200'
                      : 'bg-white border-rose-200'
                    : isAccepted
                    ? isUnread
                      ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200'
                      : 'bg-white border-emerald-200'
                    : isPayRefused
                    ? isUnread
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-white border-amber-200'
                    : isUnread
                    ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Top Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isRefusal
                          ? 'bg-rose-100 text-rose-700'
                          : isAccepted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isPayRefused
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isRefusal ? (
                        <XCircle className="w-5 h-5" />
                      ) : isPayRefused ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRefusal
                              ? 'bg-rose-600 text-white'
                              : isAccepted
                              ? 'bg-emerald-700 text-white'
                              : isPayRefused
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isRefusal
                            ? 'Dossier refusé par le secrétariat'
                            : isAccepted
                            ? 'Admission validée'
                            : isPayRefused
                            ? 'Paiement non validé'
                            : 'Paiement confirmé'}
                        </span>

                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                            Nouveau
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-500 break-all">
                          Réf: {msg.referenceId}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 break-words">
                        {msg.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 mt-1">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <School className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          De : Secrétariat
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="break-words">Parent : {msg.parentName} ({msg.parentPhone || 'N/A'})</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Classe : {msg.classe}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 pl-12 sm:pl-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Body Content */}
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  {msg.body}
                </p>

                {/* Explicit Secretary Motif Box for Refusal */}
                {msg.motif && (
                  <div
                    className={`rounded-xl p-4 border mb-4 ${
                      isRefusal
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-80">
                      Motif communiqué par le secrétaire :
                    </span>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed">
                      « {msg.motif} »
                    </p>
                    {msg.documentName && (
                      <p className="text-[11px] mt-2 flex items-center gap-1 opacity-80 font-mono break-all">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>Document examiné : {msg.documentName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markMessageAsRead(msg.id);
                        }}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        Marquer comme lu
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5" /> Lu
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {isRefusal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markMessageAsRead(msg.id);
                          onGoToAdmission();
                        }}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Corriger et soumettre une nouvelle demande</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayForAccepted(msg);
                        }}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Payer la scolarité maintenant</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}

                    {msg.category === 'PAIEMENT_VALIDE' && msg.payment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markMessageAsRead(msg.id);
                          onOpenReceipt(msg.payment!);
                        }}
                        className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Receipt className="w-3.5 h-3.5 shrink-0" />
                        <span>Imprimer le Reçu Officiel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
