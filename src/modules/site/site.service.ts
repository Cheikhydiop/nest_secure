import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginateOrFindAll as paginate } from '../../common/utils/pagination.helper';
import { NotFoundException } from '@nestjs/common'; 

@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async getAllSites(
    page: number = 1,
    limit: number = 12,
    filters: { batiment?: string; nom_site?: string; nom_region?: string } = {}
  ) {
    const whereClause: any = {};

    if (filters.nom_site) {
      whereClause.nom_site = {
        contains: filters.nom_site,
        mode: 'insensitive',
      };
    }

    if (filters.nom_region) {
      whereClause.region = {
        nom_region: {
          contains: filters.nom_region,
          mode: 'insensitive',
        },
      };
    }

    const findOptions: any = {
      where: whereClause,
      include: {
        region: true,
        rondes: true,
        plannings: {
          include: {
            agent: {
              include: {
                user: true,
                societe_gardinage: true,
              },
            },
          },
        },
        transfers_ancien: true,
        transfers_nouveau: true,
        batiments: filters.batiment
          ? {
              where: {
                nom_batiment: {
                  contains: filters.batiment,
                  mode: 'insensitive',
                },
              },
            }
          : true,
      },
      orderBy: {
        nom_site: 'asc',
      },
    };

    const sitesData = await paginate(this.prisma, 'site', {
      page,
      limit,
      findOptions,
    });

    const sitesEnrichis = await Promise.all(
      sitesData.data.map(async (site) => {
        const societesIds = this.extractSocietesIds(site.plannings);
        const societes = await this.getSocietesGardiennage(site.id, societesIds);
        const chefs = await this.getChefsDePoste(site.id, societesIds);

        return {
          ...site,
          societes_gardiennage: societes,
          chefs_de_poste: chefs,
        };
      })
    );

    return {
      ...sitesData,
      data: sitesEnrichis,
    };
  }

  async getDetailsSite(siteId: number) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        region: true,
        batiments: true,
        plannings: {
          include: {
            agent: {
              include: {
                user: true,
                societe_gardinage: true,
              },
            },
          },
        },
      },
    });

    if (!site) return null;

    const societesIds = this.extractSocietesIds(site.plannings);
    const societes = await this.getSocietesGardiennage(site.id, societesIds);
    const chefs = await this.getChefsDePoste(site.id, societesIds);

    return {
      ...site,
      societes_gardiennage: societes,
      chefs_de_poste: chefs,
    };
  }

  // 🔽 Méthode privée pour extraire les IDs des sociétés
  private extractSocietesIds(plannings: any[]): number[] {
    return Array.from(
      new Set(
        plannings
          .filter((p) => p.agent?.societe_gardinage_id)
          .map((p) => p.agent.societe_gardinage_id)
      )
    ).filter((id): id is number => typeof id === 'number');
  }

  // 🔽 Méthode privée pour récupérer les sociétés de gardiennage avec agents
  private async getSocietesGardiennage(siteId: number, societesIds: number[]) {
    const societes = await this.prisma.societeGardinage.findMany({
      where: {
        id: {
          in: societesIds.length > 0 ? societesIds : [0],
        },
      },
      include: {
        agents: {
          include: {
            user: true,
          },
          where: {
            statut: 'actif',
            plannings: {
              some: {
                site_id: siteId,
              },
            },
          },
        },
      },
    });

    return societes.map((societe) => ({
      id: societe.id,
      nom: societe.nom,
      email: societe.email,
      contact: societe.contact,
      status: societe.status,
      agents: societe.agents.map((agent) => ({
        id: agent.id,
        nom: agent.user.nom,
        prenom: agent.user.prenom,
        phone: agent.user.phone,
        email: agent.email,
        role: agent.role,
        statut: agent.statut,
      })),
    }));
  }

  // 🔽 Méthode privée pour récupérer les chefs de poste d’un site
  private async getChefsDePoste(siteId: number, societesIds: number[]) {
    return this.prisma.agent.findMany({
      where: {
        role: 'chef_post',
        societe_gardinage_id: {
          in: societesIds.length > 0 ? societesIds : [0],
        },
        plannings: {
          some: {
            site_id: siteId,
          },
        },
      },
      include: {
        user: true,
        societe_gardinage: true,
      },
    });
  }



}
