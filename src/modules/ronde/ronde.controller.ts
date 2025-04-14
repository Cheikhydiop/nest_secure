import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { RondeService } from './ronde.service';
import { Ronde_Status } from '@prisma/client';
import {
  CreateRondeDto,
  IncidentDto,
} from '../../common/dto/ronde.dto';

@Controller('rondes')
export class RondeController {
  constructor(private readonly rondeService: RondeService) {}

  // Créer une nouvelle ronde
  @Post()
  createRonde(@Body() createRondeDto: CreateRondeDto) {
    return this.rondeService.createRonde(createRondeDto);
  }

  // Récupérer toutes les rondes (filtrées et paginées)
  @Get()
  getAllRondes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('siteId', new ParseIntPipe({ optional: true })) siteId?: number,
    @Query('agentId', new ParseIntPipe({ optional: true })) agentId?: number,
    @Query('status') status?: Ronde_Status,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    return this.rondeService.getAllRondes({
      page,
      limit,
      siteId,
      agentId,
      status,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      orderBy: orderBy ? JSON.parse(orderBy) : undefined,
    });
  }

  // Récupérer une ronde par ID
  @Get(':id')
  getRondeById(@Param('id', ParseIntPipe) id: number) {
    return this.rondeService.getRondeById(id);
  }

  // Ajouter un incident à une ronde
  @Post(':id/incidents')
  addIncidentToRonde(
    @Param('id', ParseIntPipe) id: number,
    @Body() incidentDto: IncidentDto,
  ) {
    return this.rondeService.addIncidentToRonde(id, incidentDto);
  }

  // Modifier le statut d'une ronde
  @Patch(':id/status')
  updateRondeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: Ronde_Status,
  ) {
    return this.rondeService.updateRondeStatus(id, status);
  }

  // Rechercher des sites avec filtres et pagination
  @Get('/sites/search')
  searchSites(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('orderBy') orderBy?: string,
    @Query('region') region?: string,
    @Query('ville') ville?: string,
    @Query('actif') actif?: string, // string car ça arrive souvent en tant que "true"/"false"
  ) {
    return this.rondeService.searchSites({
      search,
      page,
      limit,
      orderBy: orderBy ? JSON.parse(orderBy) : undefined,
      region,
      ville,
      actif: actif !== undefined ? actif === 'true' : undefined,
    });
  }

  // Récupérer les rondes d'un site avec pagination et filtres
  @Get('/sites/:siteId/rondes')
  getRondesBySite(
    @Param('siteId', ParseIntPipe) siteId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('status') status?: Ronde_Status,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    return this.rondeService.getRondesBySite(siteId, {
      page,
      limit,
      status,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      orderBy: orderBy ? JSON.parse(orderBy) : undefined,
    });
  }

  // Récupérer les stats d'un site
  @Get('/sites/:siteId/stats')
  getSiteRondesStats(@Param('siteId', ParseIntPipe) siteId: number) {
    return this.rondeService.getSiteRondesStats(siteId);
  }
  @Patch(':id/favorite')
  async toggleFavorite(@Param('id') id: number) {
    return this.rondeService.toggleFavorite(id);
  }


}