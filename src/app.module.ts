import { Module } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { SiteModule } from './modules/site/site.module';
import { MediaModule } from './modules/media/media.module';
import { PlanningModule } from './modules/planning/planning.module';
import { PresenceModule } from './modules/presence/presence.module';
import { RondeModule } from './modules/ronde/ronde.module';
import { IncidentModule } from './modules/incident/incident.module';
import { TransfertModule } from './modules/transfert/transfert.module';
import { SocieteModule } from './modules/societe/societe.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { ScheduleModule } from '@nestjs/schedule'; 
import { SchedulerService } from './common/scheduler/scheduler.service'; 
import { RapportModule } from './modules/rapport/rapport.module';
import { CloudinaryConfig } from './config/cloudinary.config'; 
import { TwilioService } from './common/twilio/twilio.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      isGlobal: true,
      envFilePath: '.env', 
    }),
    ScheduleModule.forRoot(), // ✅ Ajout de ScheduleModule pour activer les tâches planifi
    UserModule,
    AuthModule,
    SiteModule,
    MediaModule,
    PlanningModule,
    PresenceModule,
    RondeModule,
    IncidentModule,
    TransfertModule,
    SocieteModule,
    RapportModule,
  ],
  controllers: [],
  providers: [PrismaService,SchedulerService,CloudinaryConfig, TwilioService],
})
export class AppModule {}
