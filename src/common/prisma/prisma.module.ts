import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],  // ✅ Déclare PrismaService
  exports: [PrismaService],    // ✅ Exporte PrismaService pour les autres modules
})
export class PrismaModule {}
