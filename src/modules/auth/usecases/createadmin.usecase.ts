import { Injectable } from '@nestjs/common';
import {  EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { Admin } from '../../core/entities/admin.entity';
import { AuthService } from '../services/auth.service';
import { CreateAdminDto } from '@modules/admin/dtos/create-admin.dto';

@Injectable()
export class RegisterAdminUsecase extends Usecase<{ user: Admin }> {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: CreateAdminDto): Promise<{ user: Admin }> {
    const user = await this.authService.createAdmin(args, entityManager);
    
    return {user};


  }
}
