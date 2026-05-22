import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import uniqueString from 'unique-string';
import cryptoRandomString from 'crypto-random-string';

@Injectable()
export class TokenGeneratorUtil {
  constructor(private readonly configService: ConfigService) {}

  generateReference(refType: string, length = 16): string {
    return `${refType}${cryptoRandomString({ length, characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' })}`;
  }

  getUniqueString(prefix: string): string {
    return `${prefix}${uniqueString()}`;
  }
}
