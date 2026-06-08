import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GetPassengerByIdUsecase extends Usecase {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async execute(_entityManager: EntityManager, arg:{id: any}) {
    return this.adminService.getPassengerById(arg.id);
  }
}