import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { SiteService } from './site.service';

@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get()
  async getSitesWithRelations(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('nom_site') nom_site: string,
    @Query('nom_region') nom_region: string,
    @Query('batiment') batiment: string,
  ) {
    // Construire l'objet de filtres
    const filters: any = {};
    
    if (batiment) filters.batiment = batiment;
    if (nom_site) filters.nom_site = nom_site;
    if (nom_region) filters.nom_region = nom_region;
    
    return this.siteService.getAllSites(
      Number(page) || 1,
      Number(limit) || 10,
      filters,
    );
  }

 
  @Get(':id/details')
  async getDetailsSite(@Param('id') id: string) {
    const site = await this.siteService.getDetailsSite(Number(id));
    
    if (!site) {
      throw new NotFoundException(`Site avec l'ID ${id} non trouvé`);
    }
    
    return site;
  }


}