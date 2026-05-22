import { Module } from '@nestjs/common';
import { Broker } from '@broker/broker';

@Module({
  imports: [],
  controllers: [],
  providers: [Broker],
  exports: [],
})
export class ContactSupportModule {}
