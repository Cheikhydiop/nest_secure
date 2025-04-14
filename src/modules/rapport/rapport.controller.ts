import { Controller, Get, Query, Res } from '@nestjs/common';
import { RapportService } from './rapport.service';

import { Response } from 'express';

@Controller('rapport')
export class ReportController {
  constructor(private readonly reportService: RapportService) {}

  @Get('pdf')
  async downloadPdf(
    @Res() response: Response,
    @Query('societeId') societeId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    return this.reportService.generatePdfReport(response, societeId, parsedStartDate, parsedEndDate);
  }
}
