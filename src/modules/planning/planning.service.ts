import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Horaire } from '@prisma/client';

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {} // Injection de Prisma

  async createPlannings(dto: { 
    date: string; 
    plannings: { 
      phone: string; 
      nom_site: string; 
      heure_entre: string; 
      heure_sorti: string; 
      horaire: Horaire 
    }[] 
  }) {
    const dateObj = new Date(dto.date);

    let datePlanning = await this.prisma.datePlanning.findFirst({
      where: { date: dateObj },
    });

    if (!datePlanning) {
      datePlanning = await this.prisma.datePlanning.create({
        data: { date: dateObj },
      });
    }

    const planningPromises = dto.plannings.map(async (planning) => {
      const agent = await this.prisma.agent.findFirst({
        where: { user: { phone: planning.phone } },
      });
      if (!agent) throw new Error(`Agent introuvable pour le téléphone ${planning.phone}`);

      const site = await this.prisma.site.findFirst({
        where: { nom_site: planning.nom_site },
      });
      if (!site) throw new Error(`Site introuvable pour le site ${planning.nom_site}`);

      return this.prisma.planning.create({
        data: {
          agent_id: agent.id,
          site_id: site.id,
          date_id: datePlanning.id,
          heure_entre: new Date(`${dto.date}T${planning.heure_entre}:00`),
          heure_sorti: new Date(`${dto.date}T${planning.heure_sorti}:00`),
          horaire: planning.horaire,
        },
      });
    });

    return await Promise.all(planningPromises);
  }
}
