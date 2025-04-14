import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PrismaModule } from '../../common/prisma/prisma.module'; 
import { PresenceController} from './presence.controller';


@Module({
  imports: [PrismaModule],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
