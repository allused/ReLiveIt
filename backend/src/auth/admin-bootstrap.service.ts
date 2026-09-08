import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly admins: Repository<Admin>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if ((await this.admins.count()) > 0) return;

    const username = this.config.get<string>('ADMIN_USERNAME')?.trim();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!username || !password) {
      this.logger.warn(
        'No admin account exists. Set ADMIN_USERNAME and ADMIN_PASSWORD on first boot, then restart.',
      );
      return;
    }
    if (password === 'ChangeMe123!' || password.length < 12) {
      throw new Error('ADMIN_PASSWORD is too weak for first-boot admin creation.');
    }

    await this.admins.save(
      this.admins.create({
        username,
        passwordHash: await bcrypt.hash(password, 12),
      }),
    );
    this.logger.log(`Created initial admin "${username}"`);
  }
}
