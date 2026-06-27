import { Injectable } from '@nestjs/common';
import { HashingUtil } from './hashing.utils';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptHashingUtil implements HashingUtil {
  async hash(value: string | Buffer): Promise<string> {
    return bcrypt.hash(value as string, SALT_ROUNDS);
  }

  // async compare(value: string | Buffer, encrypted: string): Promise<boolean> {
  //   return bcrypt.compare(value as string, encrypted);
  // }

  async compare(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;                  // guard against null/undefined
  const normalized = hash.replace(/^\$2y\$/, '$2b$'); // Laravel $2y$ → Node $2b$
  return bcrypt.compare(plain, normalized);
}
}
