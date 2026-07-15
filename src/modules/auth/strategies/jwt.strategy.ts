import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '@modules/core/entities/user.entity';
import { Admin } from '@modules/core/entities/admin.entity';
import { JwtPayload } from '../../../types/interfaces';
import { UserStatus } from 'src/types/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('common.auth.jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    // Try to find admin first
    let entity: Admin | User | null = await this.adminRepository.findOne({ 
      where: { id: payload.sub as any },
       //relations: ['role'],
    });
    
    // If not admin, try user
    if (!entity) {
      entity = await this.userRepository.findOne({ 
        where: { id: payload.sub as any } 
      });
    }
    
    if (!entity) {
      throw new UnauthorizedException('User not found');
    }
      if ((entity as any).status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }
    
    const role = 'role' in entity ? entity.role : null;
    return { 
      id: entity.id,
      sub: entity.id, 
      email: entity.email, 
      role,
      roleId: (entity as any).roleId ?? null,
      roles: role ? [role] : [], 
    };
  }
}

