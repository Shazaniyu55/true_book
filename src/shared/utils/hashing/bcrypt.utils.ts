import { Injectable } from '@nestjs/common';
import { HashingUtil } from './hashing.utils';
import { compare, hash, hashpw } from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BcryptHashingUtil implements HashingUtil {
  constructor(private readonly configService: ConfigService) {}

  async hash(value: string | Buffer): Promise<string> {
    return await hash(value, Number(this.configService.get<number>('common.bcryptSaltRounds')));
  }

  async compare(value: string | Buffer, encrypted: string): Promise<boolean> {
    return await compare(value, encrypted);
  }

  async hashpw(value: string | Buffer): Promise<string> {
    return await hashpw(value, Number(this.configService.get<number>('common.bcryptSaltRounds')));
  }
}
