import { Injectable, NotFoundException } from '@nestjs/common';
import { Ronde_Status } from '@prisma/client';
import { IncidentService } from '../incident/incident.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginateOrFindAll } from '../../common/utils/pagination.helper';
import { CreateRondeDto } from '../../common/dto/ronde.dto';
import { InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class RondeService {
  constructor(
    private prisma: PrismaService,
    private incidentService: IncidentService,
  ) {}

  async createRonde(data: CreateRondeDto) {
    console.log('Data reçue:', data);
  
    if (!data.site_id) {
      throw new NotFoundException("Le site_id est requis et doit être valide");
    }
  
    const siteExist = await this.prisma.site.findUnique({
      where: { id: data.site_id },
    });
  
    if (!siteExist) {
      throw new NotFoundException(`Site avec l'ID ${data.site_id} non trouvé`);
    }
  
    try {
      const ronde = await this.prisma.ronde.create({
        data: {
          qrcode: data.qrcode,
          emplacement: data.emplacement,
          agent: data.agent_id ? { connect: { id: data.agent_id } } : undefined,
          site: { connect: { id: data.site_id } },
          status: Ronde_Status.non_approuve,
        },
        include: {
          agent: true,
          site: true,
        },
      });
  
      console.log('Ronde créée:', ronde);
  
      if (data.incident) {
        await this.incidentService.createIncident(ronde.id, data.incident);
      }
  
      return this.getRondeById(ronde.id);
    } catch (error) {
      console.error('Erreur lors de la création de la ronde:', error);
      throw new InternalServerErrorException('Une erreur est survenue lors de la création de la ronde');
    }
  }
  
  async getAllRondes(options?: {
    page?: number;
    limit?: number;
    siteId?: number;
    agentId?: number;
    status?: Ronde_Status;
    dateDebut?: Date;
    dateFin?: Date;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }) {
    const { page, limit, siteId, agentId, status, dateDebut, dateFin, orderBy } = options || {};
    
    // Construction des filtres
    const where: any = {};
    
    if (siteId) {
      where.site_id = siteId;
    }
    
    if (agentId) {
      where.agent_id = agentId;
    }
    
    if (status) {
      where.status = status;
    }
    
    // Filtre de date - essayer plusieurs noms de champs possibles
    if (dateDebut || dateFin) {
      const dateFilter: any = {};
      
      if (dateDebut) {
        dateFilter.gte = dateDebut;
      }
      
      if (dateFin) {
        dateFilter.lte = dateFin;
      }
      
      where.date = dateFilter;
    }

    return paginateOrFindAll(this.prisma, 'ronde', {
      page,
      limit,
      findOptions: {
        where,
        include: {
          agent: true,
          site: true,
          incidents: {
            include: {
              medias: true,
            },
          },
        },
        orderBy: orderBy || { date: 'desc' },
      },
    });
  }

  async getRondeById(id: number) {
    // Utilisation de paginateOrFindAll sans pagination pour une requête unique
    const result = await paginateOrFindAll(this.prisma, 'ronde', {
      findOptions: {
        where: { id },
        include: {
          agent: true,
          site: true,
          incidents: {
            include: {
              medias: true,
            },
          },
        },
      },
    });
    
    if (result.data.length === 0) {
      throw new NotFoundException(`Ronde avec l'ID ${id} non trouvée`);
    }

    return result.data[0];
  }

  async updateRondeStatus(id: number, status: Ronde_Status) {
    const ronde = await this.prisma.ronde.findUnique({ where: { id } });
    
    if (!ronde) {
      throw new NotFoundException(`Ronde avec l'ID ${id} non trouvée`);
    }

    return this.prisma.ronde.update({
      where: { id },
      data: { status },
      include: {
        agent: true,
        site: true,
      },
    });
  }

  async addIncidentToRonde(rondeId: number, incidentData: {
    description?: string;
    type: string;
    medias?: {
      type: string;
      url: string;
    }[];
  }) {
    return this.incidentService.createIncident(rondeId, incidentData);
  }

  async searchSites(options?: {
    search?: string;
    page?: number;
    limit?: number;
    orderBy?: { [key: string]: 'asc' | 'desc' };
    region?: string;
    ville?: string;
    actif?: boolean;
  }) {
    const { search, page, limit, orderBy, region, ville, actif } = options || {};
    
    // Construction des filtres
    const whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push({
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { adresse: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    
    if (region) {
      whereConditions.push({ region: { contains: region, mode: 'insensitive' } });
    }
    
    if (ville) {
      whereConditions.push({ ville: { contains: ville, mode: 'insensitive' } });
    }
    
    if (actif !== undefined) {
      whereConditions.push({ actif });
    }
    
    // Combiner les conditions avec AND
    const where = whereConditions.length > 0 
      ? { AND: whereConditions } 
      : undefined;

    return paginateOrFindAll(this.prisma, 'site', {
      page,
      limit,
      findOptions: {
        where,
        orderBy: orderBy || { nom: 'asc' },
      },
    });
  }

  async getRondesBySite(siteId: number, options?: {
    page?: number;
    limit?: number;
    status?: Ronde_Status;
    dateDebut?: Date;
    dateFin?: Date;
    orderBy?: { [key: string]: 'asc' | 'desc' };
  }) {
    const { page, limit, status, dateDebut, dateFin, orderBy } = options || {};
    
    // Vérification de l'existence du site en utilisant paginateOrFindAll
    const siteResult = await paginateOrFindAll(this.prisma, 'site', {
      findOptions: {
        where: { id: siteId },
      },
    });

    if (siteResult.data.length === 0) {
      throw new NotFoundException(`Site avec l'ID ${siteId} non trouvé`);
    }
    
    // Construction des filtres
    const where: any = { site_id: siteId };
    
    if (status) {
      where.status = status;
    }
    
    // Filtre de date
    if (dateDebut || dateFin) {
      const dateFilter: any = {};
      
      if (dateDebut) {
        dateFilter.gte = dateDebut;
      }
      
      if (dateFin) {
        dateFilter.lte = dateFin;
      }
      
      where.date = dateFilter;
    }

    return paginateOrFindAll(this.prisma, 'ronde', {
      page,
      limit,
      findOptions: {
        where,
        include: {
          agent: true,
          site: true,
          incidents: {
            include: {
              medias: true,
            },
          },
        },
        orderBy: orderBy || { date: 'desc' },
      },
    });
  }
  
  async getSiteRondesStats(siteId: number) {
    // Vérification de l'existence du site en utilisant paginateOrFindAll
    const siteResult = await paginateOrFindAll(this.prisma, 'site', {
      findOptions: {
        where: { id: siteId },
      },
    });

    if (siteResult.data.length === 0) {
      throw new NotFoundException(`Site avec l'ID ${siteId} non trouvé`);
    }
    
    const site = siteResult.data[0];
    
    // Pour les comptages, nous continuons à utiliser les méthodes natives de Prisma
    // car paginateOrFindAll est optimisé pour la récupération de données avec pagination
    const totalRondes = await this.prisma.ronde.count({
      where: { site_id: siteId }
    });
    
    const rondesParStatus = await this.prisma.ronde.groupBy({
      by: ['status'],
      where: { site_id: siteId },
      _count: {
        id: true
      }
    });
    
    const nombreIncidents = await this.prisma.incident.count({
      where: {
        ronde: {
          site_id: siteId
        }
      }
    });
    
    const dateDebutSemaine = new Date();
    dateDebutSemaine.setDate(dateDebutSemaine.getDate() - 7);
    
    const rondesRecentes = await this.prisma.ronde.count({
      where: {
        site_id: siteId,
        date: {
          gte: dateDebutSemaine
        }
      }
    });
    
    return {
      total: totalRondes,
      parStatus: rondesParStatus,
      incidents: nombreIncidents,
      recentes: rondesRecentes,
      site: site
    };
  }
  async toggleFavorite(id: number) {
    const ronde = await this.prisma.ronde.findUnique({ where: { id } });
  
    if (!ronde) {
      throw new NotFoundException(`Ronde avec l'ID ${id} non trouvée`);
    }
  
    // Inverser la valeur de "favori"
    const updatedRonde = await this.prisma.ronde.update({
      where: { id },
      data: {
        favori: !ronde.favori,
      },
    });
  
    return updatedRonde;
  }
  
}