import { IngestionPipelineService } from '../pipeline/ingestion-pipeline.service';
import { DataNormalizerService } from '../normalizers/data-normalizer.service';
import { DataValidatorService } from '../validators/data-validator.service';
import { EncryptionService } from '../services/encryption.service';
import { SimulatorDriver } from '../drivers/simulator.driver';
import { HealthPlatform, HealthSourceStatus } from '@bio/database';

function makeSource(overrides: Partial<{
  id: string;
  patientId: string;
  platform: HealthPlatform;
  accessToken: string | null;
  status: HealthSourceStatus;
}> = {}) {
  const enc = new EncryptionService();
  process.env.ORACLE_ENCRYPTION_KEY = 'test-key-padded-for-aes-256-gcm-enc';
  return {
    id: 'source-1',
    patientId: 'patient-1',
    platform: HealthPlatform.SIMULATOR,
    status: HealthSourceStatus.CONNECTED,
    accessToken: enc.encrypt('simulator-static-token'),
    refreshToken: null,
    tokenExpiresAt: null,
    scopes: ['all'],
    externalUserId: null,
    lastSyncAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePipeline() {
  process.env.ORACLE_ENCRYPTION_KEY = 'test-key-padded-for-aes-256-gcm-enc';
  const normalizer = new DataNormalizerService();
  const validator = new DataValidatorService();
  const encryption = new EncryptionService();

  const rawRepo = {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const normalizedRepo = {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findExistingKeys: jest.fn().mockResolvedValue([]),
  };
  const syncJobRepo = {
    create: jest.fn().mockResolvedValue({ id: 'job-1' }),
    start: jest.fn().mockResolvedValue({}),
    complete: jest.fn().mockResolvedValue({}),
    fail: jest.fn().mockResolvedValue({}),
  };
  const syncLogRepo = {
    log: jest.fn().mockResolvedValue({}),
  };

  const pipeline = new IngestionPipelineService(
    normalizer,
    validator,
    rawRepo as any,
    normalizedRepo as any,
    syncJobRepo as any,
    syncLogRepo as any,
    encryption,
  );

  return { pipeline, rawRepo, normalizedRepo, syncJobRepo, syncLogRepo };
}

describe('IngestionPipelineService', () => {
  it('returns COMPLETED status for simulator with valid data', async () => {
    const { pipeline } = makePipeline();
    const driver = new SimulatorDriver();
    const source = makeSource();
    const since = new Date('2025-03-01');
    const until = new Date('2025-03-03');

    const result = await pipeline.run(source as any, driver, since, until);
    expect(result.status).toBe('COMPLETED');
    expect(result.rawCount).toBe(18); // 3 days × 6 metrics
    expect(result.normalizedCount).toBeGreaterThan(0);
    expect(result.jobId).toBe('job-1');
  });

  it('calls syncJobRepo.complete on success', async () => {
    const { pipeline, syncJobRepo } = makePipeline();
    const driver = new SimulatorDriver();
    const source = makeSource();

    await pipeline.run(source as any, driver, new Date('2025-03-01'), new Date('2025-03-01'));
    expect(syncJobRepo.complete).toHaveBeenCalledWith('job-1', expect.objectContaining({
      rawRecordsCount: 6,
      normalizedCount: expect.any(Number),
    }));
  });

  it('returns FAILED when access token is missing', async () => {
    const { pipeline } = makePipeline();
    const driver = new SimulatorDriver();
    const source = makeSource({ accessToken: null });

    const result = await pipeline.run(source as any, driver, new Date(), new Date());
    expect(result.status).toBe('FAILED');
    expect(result.errorCount).toBe(1);
  });

  it('calls syncJobRepo.fail on error', async () => {
    const { pipeline, syncJobRepo } = makePipeline();
    const driver = new SimulatorDriver();
    const source = makeSource({ accessToken: null });

    await pipeline.run(source as any, driver, new Date(), new Date());
    expect(syncJobRepo.fail).toHaveBeenCalledWith('job-1', expect.any(String), false);
  });

  it('stores raw and normalized records', async () => {
    const { pipeline, rawRepo, normalizedRepo } = makePipeline();
    const driver = new SimulatorDriver();
    const source = makeSource();

    await pipeline.run(source as any, driver, new Date('2025-03-01'), new Date('2025-03-01'));
    expect(rawRepo.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sourceId: 'source-1' })]),
    );
    expect(normalizedRepo.createMany).toHaveBeenCalled();
  });
});
