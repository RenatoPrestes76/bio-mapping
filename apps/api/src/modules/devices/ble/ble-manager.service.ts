import { Injectable, Logger } from '@nestjs/common';
import { DeviceEventBusService } from '../events/device-event-bus.service';
import { DeviceEventType } from '../events/device-events';

export interface DiscoveredDeviceInfo {
  macAddress: string;
  name: string;
  rssi?: number;
  manufacturer?: string;
  connectionType: string;
  serviceUUIDs?: string[];
  discoveredAt: Date;
}

// Server-side BLE state manager.
// Actual scanning happens on the client (Web Bluetooth / React Native BLE Plx).
// This service manages scan state, discovered device cache, and connection tracking.
@Injectable()
export class BleManagerService {
  private readonly logger = new Logger(BleManagerService.name);

  private scanning = false;
  private scanStartedAt?: Date;
  private readonly discoveredCache = new Map<string, DiscoveredDeviceInfo>();
  private readonly connectedDevices = new Set<string>();

  constructor(private readonly eventBus: DeviceEventBusService) {}

  // ── Scan lifecycle ─────────────────────────────────────────────────────────

  startScan(): { scanning: boolean; startedAt: Date } {
    if (this.scanning) {
      return { scanning: true, startedAt: this.scanStartedAt! };
    }
    this.scanning = true;
    this.scanStartedAt = new Date();
    this.discoveredCache.clear();
    this.logger.log('BLE scan started');
    return { scanning: true, startedAt: this.scanStartedAt };
  }

  stopScan(): { scanning: boolean; discoveredCount: number } {
    this.scanning = false;
    const count = this.discoveredCache.size;
    this.logger.log(`BLE scan stopped — ${count} device(s) discovered`);
    return { scanning: false, discoveredCount: count };
  }

  get isScanning(): boolean {
    return this.scanning;
  }

  // ── Discovery cache ────────────────────────────────────────────────────────

  reportDiscovered(info: DiscoveredDeviceInfo): void {
    this.discoveredCache.set(info.macAddress, { ...info, discoveredAt: new Date() });
    this.eventBus.emit(DeviceEventType.DEVICE_DISCOVERED, {
      macAddress: info.macAddress,
      name: info.name,
      rssi: info.rssi,
      manufacturer: info.manufacturer,
      connectionType: info.connectionType,
      timestamp: new Date(),
    });
  }

  reportLost(macAddress: string, deviceId?: string): void {
    this.discoveredCache.delete(macAddress);
    this.eventBus.emit(DeviceEventType.DEVICE_LOST, {
      macAddress,
      deviceId,
      timestamp: new Date(),
    });
  }

  getAvailableDevices(): DiscoveredDeviceInfo[] {
    return [...this.discoveredCache.values()];
  }

  clearDiscoveryCache(): void {
    this.discoveredCache.clear();
  }

  // ── Connection management ──────────────────────────────────────────────────

  connect(deviceId: string, sessionId: string): void {
    this.connectedDevices.add(deviceId);
    this.logger.log(`Device connected: ${deviceId}`);
    this.eventBus.emit(DeviceEventType.DEVICE_CONNECTED, {
      deviceId,
      sessionId,
      timestamp: new Date(),
    });
  }

  disconnect(deviceId: string, sessionId?: string, reason?: string): void {
    this.connectedDevices.delete(deviceId);
    this.logger.log(`Device disconnected: ${deviceId}${reason ? ` (${reason})` : ''}`);
    this.eventBus.emit(DeviceEventType.DEVICE_DISCONNECTED, {
      deviceId,
      sessionId,
      reason,
      timestamp: new Date(),
    });
  }

  reportBatteryChange(deviceId: string, batteryLevel: number): void {
    this.eventBus.emit(DeviceEventType.DEVICE_BATTERY_CHANGED, {
      deviceId,
      batteryLevel,
      timestamp: new Date(),
    });
  }

  reportError(deviceId: string, error: string): void {
    this.logger.warn(`Device error ${deviceId}: ${error}`);
    this.eventBus.emit(DeviceEventType.DEVICE_ERROR, {
      deviceId,
      error,
      timestamp: new Date(),
    });
  }

  getConnectedDevices(): string[] {
    return [...this.connectedDevices];
  }

  isConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  getScanStatus() {
    return {
      scanning: this.scanning,
      startedAt: this.scanStartedAt ?? null,
      discoveredCount: this.discoveredCache.size,
      connectedCount: this.connectedDevices.size,
    };
  }
}
