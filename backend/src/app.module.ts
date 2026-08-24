import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { PhotosModule } from './photos/photos.module';
import { ReviewerModule } from './reviewer/reviewer.module';
import { StorageModule } from './storage/storage.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),
    StorageModule,
    AuthModule,
    AdminModule,
    PhotosModule,
    VotesModule,
    ReviewerModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
