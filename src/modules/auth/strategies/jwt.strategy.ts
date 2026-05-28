import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '@modules/core/entities/user.entity';
import { Admin } from '@modules/core/entities/admin.entity';
import { JwtPayload } from '../../../types/interfaces';

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
       relations: ['role'],
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
    
    return { 
      id: entity.id, 
      email: entity.email, 
      role: 'role' in entity ? entity.role : null, 
    };
  }
}

// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PassportStrategy } from '@nestjs/passport';
// import { InjectRepository } from '@nestjs/typeorm';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { Repository } from 'typeorm';
// import { User } from '@modules/core/entities/user.entity';
// import { JwtPayload } from '../../../types/interfaces';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(
//     private readonly configService: ConfigService,
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//   ) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       secretOrKey: configService.get<string>('common.auth.jwt.accessSecret'),
//     });
//   }

//   async validate(payload: JwtPayload) {
//     const user = await this.userRepository.findOne({ where: { id: payload.sub as any } });
//     if (!user) throw new UnauthorizedException('User not found');
//     return { id: user.id, email: user.email, role: user.role };
//   }
// }
