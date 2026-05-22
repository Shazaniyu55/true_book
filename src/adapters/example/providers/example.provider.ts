import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IExample, ExampleDto } from '../example.interface';

@Injectable()
export class ExampleProvider implements IExample {
  private logger: Logger;

  constructor(private readonly configService: ConfigService) {
    this.logger = new Logger(ExampleProvider.name);
  }

  async send(exampleDto: ExampleDto): Promise<void> {
    try {
      //implement provider logic
      this.logger.log(exampleDto);
    } catch (error) {
      this.logger.error('❌ Failed to dispatch email, error message: ', error);
    }
  }
}
