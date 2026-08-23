// src/modules/notification/services/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { ExpoService } from './expo.service';
import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationType, UserStatus, UserRole } from '../../../types/enums';
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
      admins.map(async (admin) => {
        // Persist against adminId (NOT userId) so the users FK stays null.
        let notification;
        try {
          notification = await this.notificationRepository.createNotification({
            adminId: admin.id,
            userId: null,
            title: base.title,
            body: base.body,
            type: base.type,
            data: base.data ?? null,
            isRead: false,
          });
        } catch (err) {
          this.logger.error(
            `Failed to persist admin notification for ${admin.id}`,
            err?.message,
          );
          return null;
        }
 
        const payload = {
          id: notification.id,
          title: base.title,
          body: base.body,
          type: base.type,
          data: base.data ?? null,
          isRead: false,
          createdAt: notification.createdAt,
        };
 
        // Realtime (best-effort).
        try {
          this.gateway.emitToUser(admin.id, payload);
        } catch (err) {
          this.logger.warn(`WS emit failed for admin ${admin.id}: ${err?.message}`);
        }
 
        // Push (best-effort) — admins carry an fcmToken rather than expoToken.
        try {
          if (admin.fcmToken) {
            await this.expoService.sendPushNotification(
              admin.fcmToken,
              base.title,
              base.body,
              { type: base.type, ...(base.data ?? {}) },
            );
          }
        } catch (err) {
          this.logger.warn(`Push failed for admin ${admin.id}: ${err?.message}`);
        }
 
        return notification;
      }),
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

  // Build the recipient filter. Only narrow by role when a specific
  // audience (driver/passenger) was chosen — anything else (undefined,
  // 'all', 'both', etc.) falls back to every active user.
  const where: Record<string, any> = { status: UserStatus.ACTIVE };
  const target = dto.target?.toLowerCase();
  if (target === UserRole.DRIVER || target === UserRole.PASSENGER) {
    where.role = target;
  }

  const users = await this.userRepo.find({ where });

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

