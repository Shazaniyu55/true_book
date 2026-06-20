import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { UpdatePasswordDto } from '../dtos/updatepassword.dto';

@Injectable()
export class UpdatePasswordUsecase extends Usecase {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    args: UpdatePasswordDto & { userId: string },
  ) {
    const { userId, ...dto } = args;
    await this.authService.updatePassword(userId, dto, entityManager);
    return { message: 'Password update successful' };
  }
}