import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from '@modules/core/entities/notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly entityManager: EntityManager,
  ) {
    super(notificationRepository.target, notificationRepository.manager, notificationRepository.queryRunner);
  }

  async createNotification(data: Partial<Notification>, entityManager?: EntityManager): Promise<Notification> {
    const manager = entityManager || this.entityManager;
    const notification = manager.create(Notification, data);
    return manager.save(Notification, notification);
  }

  async findUnreadByUserId(userId: number): Promise<Notification[]> {
    return this.find({ where: { userId, isRead: false }, order: { createdAt: 'DESC' } });
  }

  async markAllReadByUserId(userId: number, entityManager?: EntityManager): Promise<void> {
    const manager = entityManager || this.entityManager;
    await manager.update(Notification, { userId, isRead: false }, { isRead: true });
  }
}
