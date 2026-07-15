import {
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Passenger } from '@modules/core/entities/passenger.entity';
import { UpdatePassengerProfileDto } from '../dtos/passanger.dto';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { DeleteUserDto } from '@modules/auth/dtos/deleteuser.dto';

@Injectable()
export class PassengerService {
  constructor(

    private readonly passangerRepository: PassengerRepository,
    
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  async getProfile(id: string) {
    return await this.passangerRepository.getProfile(id);
  }

 async updateProfile(
    id: string,
    dto: UpdatePassengerProfileDto,
    entityManager?: EntityManager,
  ) {
  
    return this.passangerRepository.updatePassenger(id, dto, entityManager);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard(id: string) {
    return await this.passangerRepository.getDashboard(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALLED BY AUTH — ensure passenger profile exists after registration
  // ══════════════════════════════════════════════════════════════════════════

async ensureProfile(id: string): Promise<Passenger> {
  return await this.passangerRepository.ensureProfile(id);
}
async deleteAccount(userId: string, dto: DeleteUserDto, entityManager?: EntityManager){
    const del = await this.passangerRepository.deleteUser(userId, dto, entityManager)
    return del;
  }

}