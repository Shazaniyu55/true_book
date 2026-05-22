import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import uniqueString from 'unique-string';
import cryptoRandomString from 'crypto-random-string';

@Injectable()
export class TokenGeneratorUtil {
  constructor(private readonly configService: ConfigService) {}

  generateReference(
    refType: string,
    length = this.configService.get<number>('common.auth.defaultRandomStringLength'),
  ): string {
    /**
     * Returns a 32 character unique string. Matches the length of MD5, which is unique enough for non-crypto purposes.
     */
    return `${refType}${cryptoRandomString({
      length,
      characters: this.configService.get<string>('common.auth.defaultRandomStringCharacters'),
    })}`;
  }

  getUniqueString(prefix: string): string {
    /**
     * Returns a 32 character unique string. Matches the length of MD5, which is unique enough for non-crypto purposes.
     */
    return `${prefix}${uniqueString()}`;
  }
}
