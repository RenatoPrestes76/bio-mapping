import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { BleManagerService } from '../../ble/ble-manager.service';
import {
  ReportDiscoveredDeviceDto,
  DiscoveredDeviceResponseDto,
  rssiToSignalStrength,
} from '../dto/discovered-device.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ble: BleManagerService,
  ) {}

  startScan(actor: Actor) {
    const status = this.ble.startScan();
    this.logger.log(`Scan started by user ${actor.sub}`);
    return {
      ...status,
      message: status.scanning ? 'Scan iniciado' : 'Scan já estava ativo',
    };
  }

  stopScan(actor: Actor) {
    const status = this.ble.stopScan();
    this.logger.log(`Scan stopped by user ${actor.sub}`);
    return {
      ...status,
      message: 'Scan encerrado',
    };
  }

  reportDevice(dto: ReportDiscoveredDeviceDto): DiscoveredDeviceResponseDto {
    const connType = dto.connectionType ?? 'BLE';
    this.ble.reportDiscovered({
      macAddress: dto.macAddress,
      name: dto.name,
      rssi: dto.rssi,
      manufacturer: dto.manufacturer,
      connectionType: connType,
      serviceUUIDs: dto.serviceUUIDs,
      discoveredAt: new Date(),
    });

    return this.toResponse({
      macAddress: dto.macAddress,
      name: dto.name,
      rssi: dto.rssi,
      manufacturer: dto.manufacturer,
      connectionType: connType,
      serviceUUIDs: dto.serviceUUIDs,
      discoveredAt: new Date(),
    });
  }

  getDiscovered(): DiscoveredDeviceResponseDto[] {
    return this.ble.getAvailableDevices().map(this.toResponse);
  }

  getScanStatus() {
    return this.ble.getScanStatus();
  }

  private toResponse = (d: {
    macAddress: string;
    name: string;
    rssi?: number;
    manufacturer?: string;
    connectionType: string;
    serviceUUIDs?: string[];
    discoveredAt: Date;
  }): DiscoveredDeviceResponseDto => ({
    macAddress: d.macAddress,
    name: d.name,
    rssi: d.rssi,
    manufacturer: d.manufacturer,
    connectionType: d.connectionType,
    serviceUUIDs: d.serviceUUIDs,
    signalStrength: rssiToSignalStrength(d.rssi),
    discoveredAt: d.discoveredAt,
  });
}
