import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';

@Module({
  providers: [TwilioService],
  exports: [TwilioService], // <= indispensable pour qu’un autre module puisse l’utiliser
})
export class TwilioModule {}
