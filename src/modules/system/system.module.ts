// system-setting.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '@modules/core/entities/system-setting.entity';
import { SystemRecord } from '@modules/core/entities/system-record.entity';
import { SystemSettingService } from './service/system.service';
import { SystemSettingController } from './controller/system.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSetting,
      SystemRecord,
    ]),
  ],
  providers: [SystemSettingService],
  controllers: [SystemSettingController],
  exports: [SystemSettingService], 
})
export class SystemSettingModule {}