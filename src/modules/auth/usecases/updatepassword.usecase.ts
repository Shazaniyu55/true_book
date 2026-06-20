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
    args: { userId: string; dto: UpdatePasswordDto },
  ) {
    await this.authService.updatePassword(args.userId, args.dto, entityManager);
    return { message: 'Password update successful' };
  }
}