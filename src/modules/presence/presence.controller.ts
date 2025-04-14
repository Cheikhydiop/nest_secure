import { Controller, Post, Body, Param, ParseIntPipe, Get, Query } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { ResponseUtil } from 'src/common/utils/response.util';
import { Presence_Status } from '@prisma/client';
import { Patch } from '@nestjs/common';
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('pointage')
  async handlePointage(@Body('empreinte') empreinte: string) {
    try {
      if (!empreinte) {
        throw new Error('L\'empreinte est obligatoire.');
      }

      const result = await this.presenceService.handlePointage(empreinte);
      return ResponseUtil.success('Pointage effectué avec succès.', result);
    } catch (error) {
      console.error('Erreur de pointage:', error);

      const errorMessage = error.message || 'Une erreur s\'est produite lors du pointage.';
      
      return ResponseUtil.error(errorMessage, error);
    }
  }
  
  @Post('depointage')
  async handleDepointage(@Body('empreinte') empreinte: string) {
    try {
      if (!empreinte) {
        throw new Error('L\'empreinte est obligatoire.');
      }

      const result = await this.presenceService.handleDepointage(empreinte);
      return ResponseUtil.success('Dépointage effectué avec succès.', result);
    } catch (error) {
      console.error('Erreur de dépointage:', error);
      const errorMessage = error.message || 'Une erreur s\'est produite lors du dépointage.';
      return ResponseUtil.error(errorMessage, error);
    }
  }

  @Post('create-daily')
  async createDailyPresence(@Body('date') date: string) {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Date invalide');
      }
      const result = await this.presenceService.createWeeklyPresence(parsedDate);
      return ResponseUtil.success('Présences créées avec succès.', { count: result });
    } catch (error) {
      console.error('Erreur lors de la création des présences:', error);
      const errorMessage = error.message || 'Une erreur s\'est produite lors de la création des présences.';
      return ResponseUtil.error(errorMessage, error);
    }
  }
  
  @Get('statistics')
  async getStatistics(
    @Query('societeId', ParseIntPipe) societeId: number,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,


  ) {
    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Dates invalides');
      }
      
      const statistics = await this.presenceService.generateStatistics(societeId, startDate, endDate);
      return ResponseUtil.success('Statistiques générées avec succès.', statistics);
    } catch (error) {
      console.error('Erreur lors de la génération des statistiques:', error);
      const errorMessage = error.message || 'Une erreur s\'est produite lors de la génération des statistiques.';
      return ResponseUtil.error(errorMessage, error);
    }
  }
  @Get('list')
async listPresences(
  @Query('agentId') agentId?: string,
  @Query('societeId') societeId?: string,
  @Query('siteId') siteId?: string,
  @Query('date') dateStr?: string,
  @Query('dateDebut') dateDebutStr?: string,
  @Query('dateFin') dateFinStr?: string,
  @Query('status') status?: Presence_Status,
  @Query('page') page: number = 1,   // Valeur par défaut : 1
  @Query('limit') limit: number = 10  // Valeur par défaut : 10
) {
  try {
    const options: any = {};

    // Si l'agentId est fourni, on le parse et l'ajoute aux options
    if (agentId) options.agentId = parseInt(agentId);

    // Si le societeId est fourni, on le parse et l'ajoute aux options
    if (societeId) options.societeId = parseInt(societeId);

    // Si le siteId est fourni, on le parse et l'ajoute aux options
    if (siteId) options.siteId = parseInt(siteId);

    // Si une date unique est fournie, on la transforme en dateDebut et dateFin
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        options.dateDebut = parsedDate;
        options.dateFin = parsedDate;
      }
    }

    // Si dateDebut est fournie, on la transforme en objet Date
    if (dateDebutStr) {
      const dateDebut = new Date(dateDebutStr);
      if (!isNaN(dateDebut.getTime())) {
        options.dateDebut = dateDebut;
      }
    }

    // Si dateFin est fournie, on la transforme en objet Date
    if (dateFinStr) {
      const dateFin = new Date(dateFinStr);
      if (!isNaN(dateFin.getTime())) {
        options.dateFin = dateFin;
      }
    }

    // Si un status est fourni, on l'ajoute aux options
    if (status) {
      options.status = status;
    }

    // Ajout de la pagination aux options
    options.page = page;
    options.limit = limit;

    // Appel au service pour récupérer les présences avec les options filtrées
    const presences = await this.presenceService.listerPresences(options);

    // Retourner les présences sous format de succès
    return ResponseUtil.success('Présences récupérées avec succès.', presences);
  } catch (error) {
    console.error('Erreur lors de la récupération des présences:', error);
    
    // Gestion de l'erreur
    const errorMessage = error.message || 'Une erreur s\'est produite lors de la récupération des présences.';
    return ResponseUtil.error(errorMessage, error);
  }
}


@Get(':id/details')
async getDetailPresence(@Param('id', ParseIntPipe) id: number) {
  try {
    const details = await this.presenceService.getDetailPresence(id);
    return ResponseUtil.success('Détails de présence récupérés avec succès.', details);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de présence:', error);
    const errorMessage = error.message || 'Une erreur s\'est produite lors de la récupération des détails de présence.';
    return ResponseUtil.error(errorMessage, error);
  }
}

  @Patch(':id/marquer-absent')
  async marquerCommeAbsent(
    @Param('id') id: string,
    @Body() data: { raison_justification?: string }
  ) {
    return this.presenceService.marquerCommeAbsent(
      +id,
      data.raison_justification
    );
  }

  
}






