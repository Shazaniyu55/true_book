import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

@Injectable()
export class RandomnessUtil {
  private generateRandomStringWithAlphabet(alphabet: string, length = 4): string {
    return customAlphabet(alphabet, length)();
  }

  generateOtp(length = 6): string {
    return this.generateRandomStringWithAlphabet('1234567890', length);
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

  generateBookingCode(length = 6): string {
    return this.generateRandomStringWithAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', length);
  }

  generateSecureToken(n = 40): string {
    const alphabet = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz123456789';
    return this.generateRandomStringWithAlphabet(alphabet, n);
  }

  generateReference(prefix = 'TRB', length = 16): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return `${prefix}-${this.generateRandomStringWithAlphabet(alphabet, length)}`;
  }
}
