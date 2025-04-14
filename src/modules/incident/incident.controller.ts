// incident.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { IncidentDto } from '../../common/dto/ronde.dto';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post('ronde/:rondeId')
  createIncident(
    @Param('rondeId', ParseIntPipe) rondeId: number,
    @Body() incidentDto: IncidentDto,
  ) {
    return this.incidentService.createIncident(rondeId, incidentDto);
  }

  @Get(':id')
  getIncidentById(@Param('id', ParseIntPipe) id: number) {
    return this.incidentService.getIncidentById(id);
  }

//   @Get('ronde/:rondeId')
//   getIncidentsByRondeId(@Param('rondeId', ParseIntPipe) rondeId: number) {
//     return this.incidentService.getIncidentsByRondeId(rondeId);
//   }
}