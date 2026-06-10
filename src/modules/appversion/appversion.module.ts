import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersionHistory } from '@modules/core/entities/appversion.entity';
import { AppVersionService } from './service/app-version.service';
import { PassengerAppVersionController } from './controller/passenger-app-version.controller';
import { DriverAppVersionController } from './controller/driver-app-version.controller';
import { AdminAppVersionController } from './controller/admin-app-version.controller';


@Module({
  imports: [TypeOrmModule.forFeature([AppVersionHistory])],
  controllers: [PassengerAppVersionController, DriverAppVersionController, AdminAppVersionController ],
  providers: [AppVersionService],
})
export class AppVersionModule {}