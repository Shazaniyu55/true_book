import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  [key: string]: any;
}

export interface JwtSignOptions {
  expiresIn?: string | number;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly defaultExpiresIn: string | number;
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('common.auth.jwt.secret');
    this.defaultExpiresIn = Number(this.configService.get<string>('common.auth.jwt.expiry')) * 60;
  }

  /**
   * Sign a JWT token with payload
   */
  sign(payload: JwtPayload, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: options?.expiresIn || this.defaultExpiresIn,
    });
  }

  /**
   * Verify and decode a JWT token
   */
  verify<T extends object = JwtPayload>(token: string): T {
    try {
      return this.jwtService.verify<T>(token, {
        secret: this.secret,
      });
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Decode a token without verifying (use cautiously)
   */
  decode<T extends object = JwtPayload>(token: string): T | null {
    return this.jwtService.decode<T>(token);
  }
}
