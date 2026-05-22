import { nanoid } from 'nanoid';

export function generateRequestId(prefix: string, size?: number): string {
  return `${prefix}${nanoid(size)}`;
}
