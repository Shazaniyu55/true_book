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

  async createNotification(
    userId: number,
    data: Partial<Notification>,
    entityManager?: EntityManager
  ): Promise<Notification> {
    const manager = entityManager || this.entityManager;
    const notification = manager.create(Notification, {
      ...data,
      userId, // Ensure userId is always set
    });
    return manager.save(Notification, notification);
  }

  async findUnreadByUserId(userId: number): Promise<Notification[]> {
    return this.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async markAllReadByUserId(userId: number, entityManager?: EntityManager): Promise<void> {
    const manager = entityManager || this.entityManager;
    await manager.update(Notification, { userId, isRead: false }, { isRead: true });
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteNotificationByUserId(userId: number, notificationId: number): Promise<void> {
    await this.delete({ id: notificationId, userId });
  }
}