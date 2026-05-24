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
import { UserRepository } from '@adapters/repositories/user.repository';
import { User } from '@modules/core/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationController],
  providers: [
    Broker,
    NotificationRepository,
    UserRepository,
    NotificationService,
    ExpoService,
    CreateNotificationUseCase,
    SendPushNotificationUseCase,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
