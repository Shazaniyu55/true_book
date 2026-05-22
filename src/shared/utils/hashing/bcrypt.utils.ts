import { Injectable } from '@nestjs/common';
import { HashingUtil } from './hashing.utils';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptHashingUtil implements HashingUtil {
  async hash(value: string | Buffer): Promise<string> {
    return bcrypt.hash(value as string, SALT_ROUNDS);
  }

  async compare(value: string | Buffer, encrypted: string): Promise<boolean> {
    return bcrypt.compare(value as string, encrypted);
  }
}
