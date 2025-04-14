import { Module } from '@nestjs/common';
import { RapportService } from './rapport.service';
import { ReportController } from './rapport.controller';
import { PrismaModule } from '../../common/prisma/prisma.module'; // ✅ Vérifie le bon chemin


@Module({
  providers: [RapportService],
  controllers: [ReportController],
  imports: [PrismaModule],

})
export class RapportModule {




}
