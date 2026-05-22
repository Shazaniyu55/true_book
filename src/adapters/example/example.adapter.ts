import { Injectable, Logger } from '@nestjs/common';
import { IExample, ExampleDto } from './example.interface';
import { ConfigService } from '@nestjs/config';
import { ExampleProvider } from './providers/example.provider';

enum ExampleProviderEnum {
  EXAMPLE = 'EXAMPLE',
}

@Injectable()
export class ExampleAdapter implements IExample {
  private readonly Logger = new Logger(ExampleAdapter.name);
  private ExampleProvider: IExample;

  constructor(
    private readonly configService: ConfigService,
    private readonly exampleProvider: ExampleProvider,
  ) {}

  public async send(sendEmailDto: ExampleDto): Promise<void> {
    await this.initializeProvider('provider');
    this.ExampleProvider.send(sendEmailDto);
  }

  private async initializeProvider(emailProvider) {
    switch (emailProvider) {
      case ExampleProviderEnum.EXAMPLE:
        this.ExampleProvider = this.exampleProvider;
        break;
      default:
        throw new Error('❌ The selected email provider is not supported.');
    }
  }
}
