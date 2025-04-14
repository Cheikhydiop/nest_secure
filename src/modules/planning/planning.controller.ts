import { Controller, Post, Body } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { Horaire } from '@prisma/client';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('create')
  async createPlannings(
    @Body() dto: { 
      date: string; 
      plannings: { 
        phone: string; 
        nom_site: string; 
        heure_entre: string; 
        heure_sorti: string; 
        horaire: Horaire 
      }[] 
    }
  ) {
    return this.planningService.createPlannings(dto);
  }
}
