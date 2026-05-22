import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { User } from '@modules/core/entities/user.entity';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dtos/register.dto';

@Injectable()
export class RegisterUsecase extends Usecase<{ user: User }> {
  constructor(private readonly authService: AuthService) { super(); }

  async execute(entityManager: EntityManager, args: RegisterDto): Promise<{ user: User }> {
    const user = await this.authService.register(args, entityManager);
    return { user };
  }
}
