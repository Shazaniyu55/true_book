import { Global, Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

// @Global() — same pattern as RedisCacheModule, so GeocodingService can be
// injected anywhere (driver, trip, agent modules) without repeated imports.
@Global()
@Module({
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}