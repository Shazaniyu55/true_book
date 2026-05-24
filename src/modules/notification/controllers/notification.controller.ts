import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateNotificationUseCase } from '../usecases/create-notification.usecase';
import { SendPushNotificationUseCase } from '../usecases/send-push-notification.usecase';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';

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
  async create(@Body() dto: CreateNotificationDto, @AuthUser() user: any) {
    return this.createNotificationUseCase.execute(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'send push notification' })
  @Post('push')
  async sendPush(@Body() body: any, @AuthUser() user: any) {
    return this.sendPushNotificationUseCase.execute(user.id);
  }
}
