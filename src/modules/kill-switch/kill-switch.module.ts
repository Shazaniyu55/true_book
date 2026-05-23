import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KillSwitch } from '../core/entities/kill-switch.entity';
import { KillSwitchService } from './kill-switch.service';
import { KillSwitchGuard } from './kill-switch.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([KillSwitch])],
  providers: [KillSwitchService, KillSwitchGuard],
  exports: [KillSwitchService, KillSwitchGuard],
})
export class KillSwitchModule {}
