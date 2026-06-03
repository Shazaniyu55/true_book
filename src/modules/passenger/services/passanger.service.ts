import {
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Passenger } from '@modules/core/entities/passenger.entity';
import { UpdatePassengerProfileDto } from '../dtos/passanger.dto';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { DeleteUserDto } from '@modules/auth/dtos/deleteuser.dto';

@Injectable()
export class PassengerService {
  constructor(

    private readonly passangerRepository: PassengerRepository,
    private readonly cloudinaryService: CloudinaryService,
    
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
    file?: Express.Multer.File,
    entityManager?: EntityManager,
  ) {
    if (file) {
      const uploaded = await this.cloudinaryService.upload(file, {
        folder: `passengers/${id}/profile`,
        resource_type: 'image',
      });
      dto.profileImage = uploaded.secure_url; // repository maps this onto User.profilePhoto
    }
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