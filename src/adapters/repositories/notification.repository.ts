// src/adapters/repositories/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from '@modules/core/entities/notification.entity';
import { User } from '@modules/core/entities/user.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly entityManager: EntityManager,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(notificationRepository.target, notificationRepository.manager, notificationRepository.queryRunner);
  }

  // Clean, explicit create used by the notifier
  async createNotification(data: Partial<Notification>, entityManager?: EntityManager): Promise<Notification> {
    const manager = entityManager || this.entityManager;
    const notification = manager.create(Notification, data);
    return manager.save(Notification, notification);
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return this.find({ where: { userId, isRead: false }, order: { createdAt: 'DESC' } });
  }

  async markAllReadByUserId(userId: string, entityManager?: EntityManager): Promise<void> {
    const manager = entityManager || this.entityManager;
    await manager.update(Notification, { userId, isRead: false }, { isRead: true });
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    
    return this.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async deleteNotificationByUserId(notificationId: string): Promise<void> {
    await this.delete({ id: notificationId });
  }
}

// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { EntityManager, Repository } from 'typeorm';
// import { Notification } from '@modules/core/entities/notification.entity';
// import { User } from '@modules/core/entities/user.entity';
// import { CreateNotificationDto } from '@modules/notification/dtos/create-notification.dto';

// @Injectable()
// export class NotificationRepository extends Repository<Notification> {
//   constructor(
//     @InjectRepository(Notification)
//     private readonly notificationRepository: Repository<Notification>,
//     private readonly entityManager: EntityManager,
    
//     @InjectRepository(User)
//     private readonly userRepo: Repository<User>,
//   ) {
//     super(notificationRepository.target, notificationRepository.manager, notificationRepository.queryRunner);
//   }

//   async createNotification(
//     userId: string,
//     dto: CreateNotificationDto,
//     entityManager?: EntityManager
//   ): Promise<Notification> {
//     const manager = entityManager || this.entityManager;
//     const notification = manager.create(Notification, {
//       ...dto,
//       userId, // Ensure userId is always set
//     });
//     return manager.save(Notification, notification);
//   }

//   async findUnreadByUserId(id: string): Promise<Notification[]> {
//     return this.find({
//       where: { id, isRead: false },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async markAllReadByUserId(userId: string, entityManager?: EntityManager): Promise<void> {
//     const manager = entityManager || this.entityManager;
//     await manager.update(Notification, { userId, isRead: false }, { isRead: true });
//   }

//   async getNotificationsByUserId(id: string): Promise<Notification[]> {
//     return this.find({
//       where: { id },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async deleteNotificationByUserId( notificationId: string): Promise<void> {
//     await this.delete({ id: notificationId  });
//   }
// }