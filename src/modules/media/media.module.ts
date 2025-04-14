import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryConfig } from '../../config/cloudinary.config';
import { PrismaModule } from '../../common/prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [MediaController], 
  providers: [MediaService, CloudinaryConfig], 
  exports: [MediaService],
})
export class MediaModule {}
