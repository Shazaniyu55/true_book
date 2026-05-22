import { Body, Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@shared/decorators/isPublic.decorator';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhookController {
  @Public()
  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook handler' })
  handlePaystack(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    // TODO: Verify signature and process event
    return { received: true };
  }

  @Public()
  @Post('paystack-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack simple webhook' })
  handlePaystackSimple(@Body() body: any) {
    return { received: true };
  }

  @Public()
  @Post('dojah')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dojah KYC webhook handler' })
  handleDojah(@Body() body: any) {
    // TODO: Process KYC verification result
    return { received: true };
  }
}
