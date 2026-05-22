import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

@Injectable()
export class RandomnessUtil {
  private generateRandomStringWithAlphabet(alphabet: string, length = 4): string {
    return customAlphabet(alphabet, length)();
  }

  generateRandomNumberString(length = 6): string {
    return this.generateRandomStringWithAlphabet('1234567890', length);
  }

  generateRandomString(length = 6): string {
    return this.generateRandomStringWithAlphabet('abcdefghjkmnpqrstwxyz', length);
  }

  generateRandomStringWithNumbers(length = 6): string {
    return this.generateRandomStringWithAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', length);
  }

  generateSecureToken(n = 40): string {
    const alphabet = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz123456789';
    return this.generateRandomStringWithAlphabet(alphabet, n);
  }

  generateSecureString(n = 8): string {
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=<>?/[]{}|';
    return this.generateRandomStringWithAlphabet(alphabet, n);
  }
}
