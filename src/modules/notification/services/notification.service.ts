// src/modules/notification/services/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { ExpoService } from './expo.service';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationType, UserStatus } from '../../../types/enums';
import { User } from '@modules/core/entities/user.entity';
import { Admin } from '@modules/core/entities/admin.entity';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { CreateAnnouncementDto } from '../dtos/announcement.dto';

export interface NotifyParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly expoService: ExpoService,
    private readonly gateway: NotificationGateway,
    private readonly cloudinaryservice: CloudinaryService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>
  ) {} 

  /** Persist + realtime + push. Never throws. */
  async notify(params: NotifyParams) {
    let notification;
    try {
      notification = await this.notificationRepository.createNotification({
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        data: params.data ?? null,
        isRead: false,
      });
    } catch (err) {
      this.logger.error(`Failed to persist notification for ${params.userId}`, err?.message);
      return null;
    }

    const payload = {
      id: notification.id,
      title: params.title,
      body: params.body,
      type: params.type,
      data: params.data ?? null,
      isRead: false,
      createdAt: notification.createdAt,
    };

    try {
      this.gateway.emitToUser(params.userId, payload);
    } catch (err) {
      this.logger.warn(`WS emit failed for ${params.userId}: ${err?.message}`);
    }

    try {
      const user = await this.userRepo.findOne({ where: { id: params.userId } });
      if (user?.expoToken) {
        await this.expoService.sendPushNotification(
          user.expoToken, params.title, params.body,
          { type: params.type, ...(params.data ?? {}) },
        );
      }
    } catch (err) {
      this.logger.warn(`Push failed for ${params.userId}: ${err?.message}`);
    }

    return notification;
  }

  async notifyAdmins(base: Omit<NotifyParams, 'userId'>) {
  let admins;
  try {
    admins = await this.adminRepo.find({
      where: { status: UserStatus.ACTIVE },
    });
  } catch (err) {
    this.logger.error('Failed to load admins for notification', err?.message);
    return [];
  }
  return Promise.all(
    admins.map((a) => this.notify({ ...base, userId: a.id })),
  );
}

  /** Fan-out to several users (e.g. all passengers on a cancelled trip). */
  async notifyMany(userIds: string[], base: Omit<NotifyParams, 'userId'>) {
    return Promise.all(userIds.map((userId) => this.notify({ ...base, userId })));
  }

  // ── existing read/query methods (now backed by the fixed repo) ──
  async getUnreadNotifications(userId: string) {
    return await this.notificationRepository.findUnreadByUserId(userId);
  }
  async getAllNotifications(userId: string) {
    return await this.notificationRepository.getNotificationsByUserId(userId);
  }
  async markAllAsRead(userId: string) {
    return await this.notificationRepository.markAllReadByUserId(userId);
  }

  async markOneAsRead(notificationId:string, userId: string) {
    return await this.notificationRepository.markOneAsRead(notificationId,userId);
  }
  async deleteNotification(notificationId: string) {
    return await this.notificationRepository.deleteNotificationByUserId(notificationId)
  
  }

    async deleteOneNotify(notificationId:string, userId: string) {
    return await this.notificationRepository.deleteOneNotification(notificationId,userId);
  }

async createAnnouncement(
  dto: CreateAnnouncementDto,
  file?: Express.Multer.File,
  user?: any,
) {
  try{
  const uploadResult = file
    ? await this.cloudinaryservice.upload(file, { resource_type: 'auto' })
    : null;

  const users = await this.userRepo.find({ where: { status: UserStatus.ACTIVE } });

  return this.notifyMany(
    users.map((u) => u.id),
    {
      title: dto.title,
      body: dto.body,
      type: NotificationType.ANNOUNCEMENT,
      data: {
         fileUrl: uploadResult?.secure_url ?? null,
        filePublicId: uploadResult?.public_id ?? null,
        duration: dto.duration,
        target: dto.target,
        createdBy: user?.sub,
      },
    },
  );
}
  catch(error){
      console.log(error)
  }

}

async getAllAnnouncements() {
  return this.notificationRepository.getAnnouncements();
}

}