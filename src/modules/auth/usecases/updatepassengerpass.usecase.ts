import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AuthService } from '../services/auth.service';
import { UpdatePasswordDto } from '../dtos/updatepassword.dto';

@Injectable()
export class UpdatePassengerPasswordUsecase extends Usecase {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    args: { userId: string; dto: UpdatePasswordDto },
  ) {
    await this.authService.updatePassengerPassword(args.userId, args.dto, entityManager);
    return { message: 'Password update successful' };
  }
}