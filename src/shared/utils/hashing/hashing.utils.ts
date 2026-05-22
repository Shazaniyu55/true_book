import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingUtil {
  abstract hash(value: string | Buffer): Promise<string>;
  abstract compare(value: string, encrypted: string): Promise<boolean>;
}
