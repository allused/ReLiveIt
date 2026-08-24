import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async health() {
    await this.dataSource.query('SELECT 1');
    return { ok: true, service: 'reliveit-api' };
  }
}
