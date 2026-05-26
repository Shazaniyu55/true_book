import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateNotificationUseCase } from '../usecases/create-notification.usecase';
import { SendPushNotificationUseCase } from '../usecases/send-push-notification.usecase';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ServiceName } from '@shared/decorators/servicename.decorators';

@ServiceName('notification') // For kill switch targeting
@ApiTags('Notifications')
@Controller('v1/notifications')
export class NotificationController {
  constructor(
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
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
  })
  async create(@Body() dto: CreateNotificationDto, @AuthUser() user: any) {
    return this.createNotificationUseCase.execute(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'send push notification' })
  @ApiResponse({
    status: 200,
    description: 'Push notification sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
  })
  @Post('push')
  async sendPush(@Body() body: any, @AuthUser() user: any) {
    return this.sendPushNotificationUseCase.execute(user.id);
  }
}
