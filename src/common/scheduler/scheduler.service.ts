import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PresenceService } from '../../modules/presence/presence.service';

@Injectable()
export class SchedulerService {
  constructor(private readonly presenceService: PresenceService) {}

//   @Cron('*/30 * * * * *') // Exécution toutes les 30 secondes
//   async handleCron() {
// console.log('Mise à jour automatique des présences...');

//     try {
//      const testDate = new Date();
//        await this.presenceService.createDailyPresence(testDate); 
//      console.log('Présences mises à jour avec succès.');
//    } catch (error) {
//      console.error('Erreur lors de la mise à jour des présences:', error.message);}
//  }
 }
