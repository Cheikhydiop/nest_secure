
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class IncidentService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async createIncident(rondeId: number, data: {
    description?: string;
    type: string; 
    medias?: { type:string; url: string }[];
  }) {
    // Vérifier si la ronde existe
    const ronde = await this.prisma.ronde.findUnique({ where: { id: rondeId } });
    if (!ronde) {
      throw new NotFoundException(`Ronde avec l'ID ${rondeId} non trouvée`);
    }

    // Créer l'incident
    const incident = await this.prisma.incident.create({
      data: {
        description: data.description,
        type: data.type,
        date: new Date(),
        ronde: { connect: { id: rondeId } },
      },
    });

    // Ajouter les médias si fournis
    if (data.medias && data.medias.length > 0) {
      await this.mediaService.createManyMedias(incident.id, data.medias);
    }

    // Retourner l'incident avec ses médias
    return this.getIncidentById(incident.id);
  }

  async getIncidentById(id: number) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: { medias: true },
    });

    if (!incident) {
      throw new NotFoundException(`Incident avec l'ID ${id} non trouvé`);
    }

    return incident;
  }

//   async getIncidentsByRondeId(rondeId: number) {
//     return this.prisma.incident.findMany({
//       where: { rondeId },
//       include: { medias: true },
//     });
//   }
}