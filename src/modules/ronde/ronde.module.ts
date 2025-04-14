import { Module } from '@nestjs/common';
import { RondeController } from './ronde.controller';
import { RondeService } from './ronde.service';
import { PrismaModule } from '../../common/prisma/prisma.module'; // ✅ Vérifie le bon chemin

import { IncidentModule } from '../incident/incident.module';  // ✅ Ajout de IncidentModule

@Module({
  imports: [PrismaModule, IncidentModule], // ✅ Importation correcte
  providers: [RondeService],
  controllers: [RondeController],
  exports: [RondeService],
})
export class RondeModule {}
