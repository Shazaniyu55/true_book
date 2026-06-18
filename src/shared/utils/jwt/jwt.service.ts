import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload { [key: string]: any; }

@Injectable()
export class JwtUtilService {
  private readonly logger = new Logger(JwtUtilService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  sign(payload: JwtPayload, options?: { expiresIn?: string | number }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('common.auth.jwt.accessSecret'),
      expiresIn: options?.expiresIn || this.configService.get<string>('common.auth.jwt.accessExpiresIn') || '7d',
    });
  }

  verify<T extends object = JwtPayload>(token: string): T {
    try {
      return this.jwtService.verify<T>(token, {
        secret: this.configService.get<string>('common.auth.jwt.accessSecret'),
      });
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  decode<T extends object = JwtPayload>(token: string): T | null {
    return this.jwtService.decode<T>(token);
  }
}
