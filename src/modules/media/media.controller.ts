import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, ParseIntPipe, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { MediaService } from './media.service';

interface Media {
  id: number;
  type: string;
  url: string;
  incident_id: number | null;
}

interface UrlUploadDto {
  url: string;
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // Endpoint pour uploader un fichier
  @Post('upload/:incidentId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Param('incidentId', ParseIntPipe) incidentId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Media> {
    return this.mediaService.uploadAndCreateMedia(incidentId, file);
  }

  // Nouvel endpoint pour uploader via URL
  @Post('upload-url/:incidentId')
  async uploadMediaFromUrl(
    @Param('incidentId', ParseIntPipe) incidentId: number,
    @Body() data: UrlUploadDto,
  ): Promise<Media> {
    return this.mediaService.uploadAndCreateMedia(incidentId, data.url);
  }

  @Get('incident/:incidentId')
  getMediasByIncident(@Param('incidentId', ParseIntPipe) incidentId: number): Promise<Media[]> {
    return this.mediaService.getMediasByIncidentId(incidentId);
  }
}