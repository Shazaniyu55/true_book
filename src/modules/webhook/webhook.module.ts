import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  imports: [],
  controllers: [WebhookController],
  providers: [],
  exports: [],
})
export class WebhookModule {}
