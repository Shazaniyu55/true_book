import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateNotificationUseCase } from '../usecases/create-notification.usecase';
import { SendPushNotificationUseCase } from '../usecases/send-push-notification.usecase';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';

@ServiceName('notification') // For kill switch targeting
@ApiTags('Notifications')
@Controller('v1/notifications')
export class NotificationController {
  constructor(
    private readonly broker: Broker,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly sendPushNotificationUseCase: SendPushNotificationUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @ApiOperation({ summary: 'create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })

  async create(@AuthUser() user: any, @Body() dto: CreateNotificationDto) {
    return this.broker.runUsecases([this.createNotificationUseCase], {id: user.sub, dto: dto})
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'send push notification' })
  @ApiResponse({
    status: 200,
    description: 'Push notification sent successfully',
  })

  @Post('push')
  async sendPush( @AuthUser() user: any) {
    return this.broker.runUsecases([this.sendPushNotificationUseCase], user.sub)
    
  }
}
