import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PassengerService } from '../services/passanger.service';
import { DeleteUserDto } from '@modules/auth/dtos/deleteuser.dto';


@Injectable()
export class DeleteUserAccountUsecase extends Usecase {
  constructor(private readonly authService: PassengerService) { super(); }

  async execute(entityManager: EntityManager, args: {id: string, dto: DeleteUserDto}) {
    const user = await this.authService.deleteAccount(args.id, args.dto, entityManager);
    return { user };
  }
}
