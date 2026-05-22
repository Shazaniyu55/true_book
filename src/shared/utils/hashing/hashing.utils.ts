import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingUtil {
  abstract hash(value: string | Buffer): Promise<string>;
  abstract compare(value: string | Buffer, encrypted: string): Promise<boolean>;
}
