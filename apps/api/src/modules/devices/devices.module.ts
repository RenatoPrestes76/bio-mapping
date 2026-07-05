import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../common/audit/audit-log.module';

// Events + BLE
import { DeviceEventBusService } from './events/device-event-bus.service';
import { BleManagerService } from './ble/ble-manager.service';

// Sync
import { SyncQueueService } from './sync/sync-queue.service';

// Discovery
import { DiscoveryService } from './discovery/services/discovery.service';
import { DiscoveryController } from './discovery/controllers/discovery.controller';

// Pairing
import { PairingService } from './pairing/services/pairing.service';
import { PairingController } from './pairing/controllers/pairing.controller';

// Sessions
import { SessionsService } from './sessions/services/sessions.service';

// Registry
import { RegistryService } from './registry/services/registry.service';
import { RegistryController } from './registry/controllers/registry.controller';

// Sprint 7 — ORACLE
import { MeasurementNormalizerService } from './normalizers/measurement-normalizer.service';
import { MeasurementValidationService } from './validation/measurement-validation.service';
import { ClinicalMapperService } from './mappers/clinical-mapper.service';
import { CalibrationService } from './calibration/calibration.service';
import { IngestionPipelineService } from './ingestion/ingestion-pipeline.service';
import { MockDeviceService } from './drivers/mock/mock-device.service';
import { MockDeviceController } from './drivers/mock/mock-device.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';

@Module({
  imports: [DatabaseModule, AuditLogModule],
  providers: [
    // Sprint 6
    DeviceEventBusService,
    BleManagerService,
    SyncQueueService,
    DiscoveryService,
    PairingService,
    SessionsService,
    RegistryService,
    // Sprint 7
    MeasurementNormalizerService,
    MeasurementValidationService,
    ClinicalMapperService,
    CalibrationService,
    IngestionPipelineService,
    MockDeviceService,
    DashboardService,
  ],
  controllers: [
    DiscoveryController,
    PairingController,
    RegistryController,
    MockDeviceController,
    DashboardController,
  ],
  exports: [
    DeviceEventBusService,
    BleManagerService,
    SyncQueueService,
    RegistryService,
    SessionsService,
    IngestionPipelineService,
    MeasurementNormalizerService,
    MeasurementValidationService,
    CalibrationService,
    MockDeviceService,
  ],
})
export class DevicesModule {}
