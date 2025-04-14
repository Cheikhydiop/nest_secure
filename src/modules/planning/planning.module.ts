import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PrismaModule } from '../../common/prisma/prisma.module'; 
@Module({
  imports: [PrismaModule], 
  controllers: [PlanningController],
  providers: [PlanningService]
})
export class PlanningModule {}