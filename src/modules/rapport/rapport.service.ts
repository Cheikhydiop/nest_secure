import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RapportService {
  constructor(private prisma: PrismaService) {}

  async generateStatistics(societeId: number, startDate: Date, endDate: Date) {
    console.log('Fetching statistics for:', { societeId, startDate, endDate });

    const agents = await this.prisma.agent.findMany({
      where: { societe_gardinage_id: societeId },
      include: {
        user: true,
        presences: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        societe_gardinage: true,
      },
    });

    console.log('Agents fetched:', agents.length);

    return agents.map(agent => {
      console.log(`Processing agent: ${agent.user.nom} ${agent.user.prenom}`);
      
      const totalJours = agent.presences.length;
      const totalHeures = agent.presences.reduce((sum, p) => {
        if (!p.heure_sorti) return sum;
        return sum + (p.heure_sorti.getTime() - p.heure_entre.getTime()) / 3600000;
      }, 0);

      const stats = {
        nom: `${agent.user.nom} ${agent.user.prenom}`,
        phone: agent.user.phone,
        societe: agent.societe_gardinage?.nom || "Non assigné",
        joursTravailles: totalJours,
        totalHeures: totalHeures.toFixed(2),
        retards: agent.presences.filter(p => p.status === 'retard').length,
        absences: agent.presences.filter(p => p.status === 'absent').length,
      };

      console.log('Agent statistics:', stats);
      return stats;
    });
  }

  async generatePdfReport(response: Response, societeId: number, startDate: Date, endDate: Date) {
    console.log('Generating PDF report...');
    const data = await this.generateStatistics(societeId, startDate, endDate);
    console.log('Data to be included in PDF:', data);

    const doc = new PDFDocument();
    response.setHeader('Content-Disposition', 'attachment; filename=rapport.pdf');
    response.setHeader('Content-Type', 'application/pdf');

    doc.pipe(response);

    doc.fontSize(20).text("Rapport de Statistiques", { align: "center" });
    doc.moveDown();

    data.forEach((item, index) => {
      console.log(`Adding agent ${index + 1} to PDF:`, item);
      doc.fontSize(12).text(`${index + 1}. ${item.nom} - ${item.phone}`);
      doc.text(`Société: ${item.societe}`);
      doc.text(`Jours travaillés: ${item.joursTravailles}`);
      doc.text(`Heures totales: ${item.totalHeures}`);
      doc.text(`Retards: ${item.retards} | Absences: ${item.absences}`);
      doc.moveDown();
    });

    console.log('Finishing PDF generation.');
    doc.end();
  }
}
