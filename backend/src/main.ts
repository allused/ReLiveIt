import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertProductionConfig } from './common/runtime-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  assertProductionConfig();
  const config = app.get(ConfigService);
  const frontend = config.get('FRONTEND_URL', 'http://localhost:5173');

  if (config.get('NODE_ENV') === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true }));
  app.enableCors({
    origin: frontend,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port);
  console.log(`ReLiveIt API listening on ${port}`);
}

bootstrap();
