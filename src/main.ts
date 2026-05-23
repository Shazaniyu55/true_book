import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ResponseInterceptor } from '@shared/interceptors/response.interceptor';
import { CustomFieldValidationPipe } from '@shared/validations/custom.validation';

import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';
import { KillSwitchGuard } from './modules/kill-switch/kill-switch.guard';
import { loadSecretsFromVault } from './shared/vault/vaultSecrets';

async function bootstrap() {
  dotenv.config();
   //Load secrets from Vault (or env in local mode) — BEFORE app creation
  await loadSecretsFromVault();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const { port, swaggerApiRoot } = configService.get('common');

  const PRODUCT_NAME = 'Tru_Booker Backend Service';
  const PRODUCT_TAG = 'Tru_Booker Backend Service';
  const PRODUCT_VERSION = '2.0.0';

  // Determine the allowed origins
  const whitelist = configService
    .get<string>('CORS_WHITELIST')
    .split(',')
    .map((pattern) => new RegExp(pattern));

  // Enable localhost on dev/staging servers only
  if ([undefined, 'development', 'localhost'].includes(process.env.NODE_ENV)) {
    // whitelist.push(/http(s)?:\/\/localhost:3000/);
    whitelist.push(/http(s)?:\/\/localhost:/);
  }

  Logger.log(`Approved domains: ${whitelist.join(',')}`);

  // Set cors options
  const options = {
    origin: whitelist,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-control',
    ],
    credentials: true,
  };

  app.enableCors(options);
  app.use(cookieParser());
  app.useGlobalInterceptors(new ResponseInterceptor());
  // Enable global validation pipe
  app.useGlobalPipes(CustomFieldValidationPipe);

  //Register Kill Switch as a global guard
  const killSwitchGuard = app.get(KillSwitchGuard);
  app.useGlobalGuards(killSwitchGuard);

  const swaggerOptions = new DocumentBuilder()
    .setTitle(`${PRODUCT_NAME} API Documentation`)
    .setDescription(`List of all the APIs for ${PRODUCT_NAME}.`)
    .setVersion(PRODUCT_VERSION)
    .addTag(PRODUCT_TAG)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup(swaggerApiRoot, app, document);

  await app.listen(process.env.PORT || port);
  Logger.log(
    `${PRODUCT_NAME} core service running on port ${port}: visit http://localhost:${port}/${swaggerApiRoot}`,
  );
}

bootstrap();
