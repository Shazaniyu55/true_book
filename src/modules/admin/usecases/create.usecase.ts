import { Injectable } from '@nestjs/common';
import {  EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateAdminDto } from '../dtos/create-admin.dto';
import { AdminService } from '../services/admin.service';
import { Admin } from '../../core/entities/admin.entity';

@Injectable()
export class RegisterAdminUsecase extends Usecase<{ user: Admin }> {
  constructor(private readonly adminService: AdminService) { super(); }

  async execute(entityManager: EntityManager, args: CreateAdminDto): Promise<{ user: Admin }> {
    const user = await this.adminService.createAdmin(args, entityManager);
    
    return {user};


  }
}
