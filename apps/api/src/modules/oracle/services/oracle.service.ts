import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HealthPlatform, HealthSourceStatus, OracleMetricType } from '@bio/database';
import { HealthSourceRepository } from '../repositories/health-source.repository.js';
import { NormalizedHealthDataRepository } from '../repositories/normalized-health-data.repository.js';
import { SyncJobRepository } from '../repositories/sync-job.repository.js';
import { IngestionPipelineService } from '../pipeline/ingestion-pipeline.service.js';
import { DriverRegistryService } from './driver-registry.service.js';
import { EncryptionService } from './encryption.service.js';
import { ConnectSourceDto } from '../dto/connect-source.dto.js';
import { TimelineQueryDto } from '../dto/timeline-query.dto.js';

@Injectable()
export class OracleService {
  constructor(
    private readonly sourceRepo: HealthSourceRepository,
    private readonly normalizedRepo: NormalizedHealthDataRepository,
    private readonly syncJobRepo: SyncJobRepository,
    private readonly pipeline: IngestionPipelineService,
    private readonly drivers: DriverRegistryService,
    private readonly encryption: EncryptionService,
  ) {}

  getAuthUrl(patientId: string, platform: HealthPlatform, redirectUri: string): string {
    const driver = this.drivers.get(platform);
    return driver.getAuthUrl(patientId, redirectUri);
  }

  async connect(patientId: string, dto: ConnectSourceDto) {
    const driver = this.drivers.get(dto.platform);
    const tokens = await driver.exchangeCode(dto.code, dto.redirectUri);

    const source = await this.sourceRepo.upsert(patientId, dto.platform, {
      accessToken: this.encryption.encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? this.encryption.encrypt(tokens.refreshToken) : undefined,
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      externalUserId: tokens.externalUserId,
      status: HealthSourceStatus.CONNECTED,
    });

    return source;
  }

  async disconnect(patientId: string, platform: HealthPlatform) {
    const source = await this.sourceRepo.findByPatientAndPlatform(patientId, platform);
    if (!source) throw new NotFoundException('Source not found');

    const driver = this.drivers.get(platform);
    const accessToken = this.encryption.safeDecrypt(source.accessToken);
    if (accessToken) {
      try {
        await driver.revokeAccess(accessToken);
      } catch {
        // Best-effort revocation; still disconnect locally
      }
    }

    await this.sourceRepo.updateStatus(source.id, HealthSourceStatus.DISCONNECTED);
  }

  async sync(patientId: string, platform: HealthPlatform, daysSince = 7) {
    const source = await this.sourceRepo.findByPatientAndPlatform(patientId, platform);
    if (!source) throw new NotFoundException('Source not found');
    if (source.status !== HealthSourceStatus.CONNECTED) {
      throw new BadRequestException(`Source is not connected (status: ${source.status})`);
    }

    const driver = this.drivers.get(platform);

    // Refresh token if expired
    if (source.tokenExpiresAt && source.tokenExpiresAt < new Date()) {
      const refreshToken = this.encryption.safeDecrypt(source.refreshToken);
      if (refreshToken) {
        try {
          const newTokens = await driver.refreshTokens(refreshToken);
          await this.sourceRepo.updateTokens(source.id, {
            accessToken: this.encryption.encrypt(newTokens.accessToken),
            refreshToken: newTokens.refreshToken ? this.encryption.encrypt(newTokens.refreshToken) : undefined,
            tokenExpiresAt: newTokens.expiresAt,
          });
          // Reload source with fresh tokens
          const refreshed = await this.sourceRepo.findById(source.id);
          if (refreshed) Object.assign(source, refreshed);
        } catch {
          await this.sourceRepo.updateStatus(source.id, HealthSourceStatus.ERROR);
          throw new BadRequestException('Token refresh failed — please reconnect');
        }
      }
    }

    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - daysSince);

    const result = await this.pipeline.run(source, driver, since, until);
    await this.sourceRepo.updateLastSync(source.id);
    return result;
  }

  async getSources(patientId: string) {
    return this.sourceRepo.findByPatient(patientId);
  }

  async getSyncHistory(patientId: string, limit = 20) {
    return this.syncJobRepo.findByPatient(patientId, limit);
  }

  async getTimeline(patientId: string, query: TimelineQueryDto) {
    const metricTypes = (query.metrics ?? Object.values(OracleMetricType)) as OracleMetricType[];
    const since = query.since ? new Date(query.since) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const until = query.until ? new Date(query.until) : new Date();

    const data = await this.normalizedRepo.findTimeline(patientId, metricTypes, since, until);
    return data;
  }
}
