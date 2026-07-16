import { Module } from '@nestjs/common';
import { OracleController } from './controllers/oracle.controller.js';
import { OracleService } from './services/oracle.service.js';
import { DriverRegistryService } from './services/driver-registry.service.js';
import { EncryptionService } from './services/encryption.service.js';
import { DataNormalizerService } from './normalizers/data-normalizer.service.js';
import { DataValidatorService } from './validators/data-validator.service.js';
import { IngestionPipelineService } from './pipeline/ingestion-pipeline.service.js';
import { HealthSourceRepository } from './repositories/health-source.repository.js';
import { RawHealthDataRepository } from './repositories/raw-health-data.repository.js';
import { NormalizedHealthDataRepository } from './repositories/normalized-health-data.repository.js';
import { SyncJobRepository } from './repositories/sync-job.repository.js';
import { SyncLogRepository } from './repositories/sync-log.repository.js';
import { AppleHealthDriver } from './drivers/apple-health.driver.js';
import { GoogleFitDriver } from './drivers/google-fit.driver.js';
import { GoogleHealthConnectDriver } from './drivers/google-health-connect.driver.js';
import { GarminDriver } from './drivers/garmin.driver.js';
import { PolarDriver } from './drivers/polar.driver.js';
import { FitbitDriver } from './drivers/fitbit.driver.js';
import { AmazfitDriver } from './drivers/amazfit.driver.js';
import { SamsungHealthDriver } from './drivers/samsung-health.driver.js';
import { SimulatorDriver } from './drivers/simulator.driver.js';

@Module({
  controllers: [OracleController],
  providers: [
    // Services
    OracleService,
    DriverRegistryService,
    EncryptionService,
    // Normalizer & Validator
    DataNormalizerService,
    DataValidatorService,
    // Pipeline
    IngestionPipelineService,
    // Repositories
    HealthSourceRepository,
    RawHealthDataRepository,
    NormalizedHealthDataRepository,
    SyncJobRepository,
    SyncLogRepository,
    // Drivers
    AppleHealthDriver,
    GoogleFitDriver,
    GoogleHealthConnectDriver,
    GarminDriver,
    PolarDriver,
    FitbitDriver,
    AmazfitDriver,
    SamsungHealthDriver,
    SimulatorDriver,
  ],
  exports: [OracleService, DataNormalizerService, DataValidatorService],
})
export class OracleModule {}
