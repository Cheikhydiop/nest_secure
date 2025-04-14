import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client;
  private readonly logger = new Logger(TwilioService.name);

  constructor() {
    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      throw new Error('Twilio SID ou Auth Token manquant dans les variables d\'environnement.');
    }

    if (!phoneNumber) {
      throw new Error('Numéro de téléphone Twilio manquant dans les variables d\'environnement.');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Envoie un SMS via Twilio
   * @param to Numéro de téléphone du destinataire (format international)
   * @param body Contenu du message
   * @returns Informations sur le message envoyé
   */

async sendSms(to: string, body: string) {
  try {
    // Formatage du numéro si nécessaire (assumant des numéros sénégalais)
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      if (to.startsWith('221')) {
        formattedNumber = `+${to}`;
      } else {
        formattedNumber = `+221${to}`;
      }
      this.logger.log(`Numéro formaté: ${to} -> ${formattedNumber}`);
    }

    const message = await this.client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber,
    });
    
    this.logger.log(`SMS envoyé avec succès: ${message.sid}`);
    return message;
  } catch (error) {
    this.logger.error(`Erreur lors de l'envoi du SMS: ${error.message}`, error.stack);
    throw new Error(`Impossible d'envoyer le SMS: ${error.message}`);
  }
}
  /**
   * Vérifie un code de vérification envoyé à un numéro
   * @param to Numéro de téléphone
   * @param code Code de vérification
   * @returns Résultat de la vérification
   */
  async verifyCode(to: string, code: string) {
    try {
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!serviceSid) {
        throw new Error('Service SID de vérification manquant dans les variables d\'environnement');
      }

      const verification = await this.client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to, code });
      
      return verification;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du code: ${error.message}`, error.stack);
      throw new Error(`Échec de la vérification: ${error.message}`);
    }
  }
}