import { SetMetadata } from '@nestjs/common';

export const SKIP_CLIENT_AUTH_KEY = 'skipClientAuth';
export const SkipClientAuth = () => SetMetadata(SKIP_CLIENT_AUTH_KEY, true);
