import { Module } from '@nestjs/common';
import { Broker } from '@broker/broker';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { NotificationController } from './controllers/notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { NotificationService } from './services/notification.service';
import { SendPushNotificationUseCase } from './usecases/send-push-notification.usecase';
import { CreateNotificationUseCase } from './usecases/create-notification.usecase';
import { ExpoService } from './services/expo.service';
import { Notification } from '@modules/core/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [
    Broker,
    NotificationRepository,
    NotificationService,
    ExpoService,
    CreateNotificationUseCase,
    SendPushNotificationUseCase,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
