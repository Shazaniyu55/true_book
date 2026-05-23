import { SetMetadata } from "@nestjs/common";

export const SERVICE_KEY = 'serviceName';
export const ServiceName = (name: string) =>
  SetMetadata(SERVICE_KEY, name);