import { Module } from '@nestjs/common';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { PrismaModule } from '../../common/prisma/prisma.module'; 
import { MediaModule } from '../media/media.module';  

@Module({
  imports: [PrismaModule, MediaModule], 
  providers: [IncidentService], 
  controllers: [IncidentController], 
  exports: [IncidentService], 
})
export class IncidentModule {}
