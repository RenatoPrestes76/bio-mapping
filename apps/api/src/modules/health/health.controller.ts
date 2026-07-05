import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version ?? '0.1.0',
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
