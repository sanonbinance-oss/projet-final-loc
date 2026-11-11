import { Payment, PaymentMethod } from '../types';

export interface PaymentSimulationOptions {
  studentId: string;
  studentMatricule: string;
  studentNom: string;
  studentClasse: string;
  montantScolarite: number;
  montantDon?: number;
  operateur: PaymentMethod;
  telephone: string;
  nomPayeur: string;
  codeOtp?: string;
  notes?: string;
}

export interface CashDeskPaymentOptions {
  studentId: string;
  studentMatricule: string;
  studentNom: string;
  studentClasse: string;
  montantScolarite: number;
  montantDon?: number;
  nomPayeur: string;
  telephonePayeur?: string;
  agentNom: string;
  notes?: string;
}

export class PaymentService {
  static MODE: 'SIMULATION' | 'PRODUCTION' = 'SIMULATION';

  static CONFIG = {
    ORANGE_MONEY_BF: {
      apiKey: '',
      merchantId: '',
      serviceUrl: 'https://api.orange.com/orange-money-webpay/dev/v1',
      actif: false,
    },
    MOOV_AFRICA_BF: {
      apiKey: '',
      merchantSecret: '',
      serviceUrl: 'https://api.moov-africa.bf/v2/payment',
      actif: false,
    },
    MTN_MONEY: {
      apiKey: '',
      subscriptionKey: '',
      serviceUrl: 'https://sandbox.momodeveloper.mtn.com',
      actif: false,
    },
    LIGDICASH: {
      apiKey: '',
      apiToken: '',
      serviceUrl: 'https://app.ligdicash.com/pay/v01/redirect',
      actif: false,
    },
  };

  static async traiterPaiementMobileMoney(
    options: PaymentSimulationOptions,
    onProgress?: (step: string) => void
  ): Promise<Payment> {
    if (this.MODE === 'SIMULATION') {
      if (onProgress) onProgress('Initialisation de la session sécurisée...');
      await new Promise((r) => setTimeout(r, 600));

      if (onProgress) onProgress(`Demande d'autorisation envoyée au ${options.telephone}...`);
      await new Promise((r) => setTimeout(r, 1000));

      if (onProgress) onProgress('Validation du débit Mobile Money en cours...');
      await new Promise((r) => setTimeout(r, 800));

      const prefix = options.operateur === 'ORANGE_MONEY' 
        ? 'OM-BF' 
        : options.operateur === 'MOOV_MONEY' 
        ? 'MV-BF' 
        : options.operateur === 'MTN_MONEY'
        ? 'MTN-BF'
        : 'LGD';

      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const reference = `REC-2025-${prefix}-${randomDigits}`;

      const don = options.montantDon || 0;
      const totalMontant = options.montantScolarite + don;

      const payment: Payment = {
        id: 'PAY_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        reference,
        studentId: options.studentId,
        studentMatricule: options.studentMatricule,
        studentNom: options.studentNom,
        studentClasse: options.studentClasse,
        montant: totalMontant,
        montantScolarite: options.montantScolarite,
        montantDon: don,
        mode: options.operateur,
        telephonePayeur: options.telephone,
        nomPayeur: options.nomPayeur,
        statut: 'EN_ATTENTE_VERIFICATION',
        codeOtp: options.codeOtp,
        encaissePar: 'PARENT_EN_LIGNE',
        date: new Date().toISOString(),
        notes: options.notes || (don > 0 ? `Scolarité (${options.montantScolarite} F) + Don (${don} F)` : 'Règlement scolarité'),
      };

      return payment;
    } else {
      throw new Error("Mode PRODUCTION non configuré. Veuillez entrer les clés d'API.");
    }
  }

  static encaisserEspecesAuGuichet(options: CashDeskPaymentOptions): Payment {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const reference = `REC-2025-ESP-${randomDigits}`;

    const don = options.montantDon || 0;
    const totalMontant = options.montantScolarite + don;

    const payment: Payment = {
      id: 'PAY_ESP_' + Date.now(),
      reference,
      studentId: options.studentId,
      studentMatricule: options.studentMatricule,
      studentNom: options.studentNom,
      studentClasse: options.studentClasse,
      montant: totalMontant,
      montantScolarite: options.montantScolarite,
      montantDon: don,
      mode: 'ESPECES_GUICHET',
      telephonePayeur: options.telephonePayeur,
      nomPayeur: options.nomPayeur,
      statut: 'SUCCES',
      encaissePar: 'SECRETAIRE_GUICHET',
      agentNom: options.agentNom || 'Secrétariat Général',
      date: new Date().toISOString(),
      notes: options.notes || (don > 0 ? `Scolarité (${options.montantScolarite} F) + Don soutien (${don} F)` : 'Paiement espèces guichet'),
    };

    return payment;
  }

  static getPaymentMethodLabel(method: PaymentMethod): string {
    switch (method) {
      case 'ORANGE_MONEY':
        return 'Orange Money Burkina';
      case 'MOOV_MONEY':
        return 'Moov Africa Burkina';
      case 'MTN_MONEY':
        return 'MTN Mobile Money';
      case 'LIGDICASH':
        return 'LigdiCash / Cartes';
      case 'ESPECES_GUICHET':
        return 'Espèces (Guichet Scolaire)';
      default:
        return method;
    }
  }
}
