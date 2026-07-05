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

@Module({
  imports: [DatabaseModule, AuditLogModule],
  providers: [
    DeviceEventBusService,
    BleManagerService,
    SyncQueueService,
    DiscoveryService,
    PairingService,
    SessionsService,
    RegistryService,
  ],
  controllers: [DiscoveryController, PairingController, RegistryController],
  exports: [
    DeviceEventBusService,
    BleManagerService,
    SyncQueueService,
    RegistryService,
    SessionsService,
  ],
})
export class DevicesModule {}
