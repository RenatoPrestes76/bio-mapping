import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SmartScaleDriver } from '../scales/smart-scale.driver';
import { BloodPressureDriver } from '../blood-pressure/blood-pressure.driver';
import { PulseOximeterDriver } from '../pulse-oximeter/pulse-oximeter.driver';
import { HeartRateDriver } from '../heart-rate/heart-rate.driver';
import { GlucometerDriver } from '../glucometer/glucometer.driver';
import { MockDriver } from './mock.driver';
import { IngestionPipelineService } from '../../ingestion/ingestion-pipeline.service';
import type { BaseDeviceDriver } from '../base/base-device-driver';
import type { RawMeasurement } from '../base/device-driver.interface';
import { MeasurementType } from '../base/device-capability';

export interface SimulationSession {
  id: string;
  deviceId: string;
  driverName: string;
  startedAt: Date;
  measurementsSent: number;
  active: boolean;
}

export type SendMeasurementDto = {
  deviceId: string;
  driverName: string;
  measurementType?: MeasurementType;
  values?: Record<string, number | string>;
};

const DRIVER_MAP: Record<string, new () => BaseDeviceDriver> = {
  'smart-scale':            SmartScaleDriver,
  'blood-pressure-monitor': BloodPressureDriver,
  'pulse-oximeter':         PulseOximeterDriver,
  'heart-rate-monitor':     HeartRateDriver,
  'glucometer':             GlucometerDriver,
  'mock-driver':            MockDriver,
};

@Injectable()
export class MockDeviceService {
  private readonly logger = new Logger(MockDeviceService.name);
  private readonly sessions = new Map<string, SimulationSession>();
  private sessionCounter = 0;

  constructor(private readonly pipeline: IngestionPipelineService) {}

  listDrivers(): string[] {
    return Object.keys(DRIVER_MAP);
  }

  start(deviceId: string, driverName: string): SimulationSession {
    const DriverClass = DRIVER_MAP[driverName];
    if (!DriverClass) throw new NotFoundException(`Driver desconhecido: ${driverName}`);

    const id = `sim-${++this.sessionCounter}-${Date.now()}`;
    const session: SimulationSession = { id, deviceId, driverName, startedAt: new Date(), measurementsSent: 0, active: true };
    this.sessions.set(id, session);
    this.logger.log(`Simulation started: ${id} (driver: ${driverName}, device: ${deviceId})`);
    return session;
  }

  stop(sessionId: string): SimulationSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new NotFoundException(`Sessão de simulação não encontrada: ${sessionId}`);
    session.active = false;
    this.logger.log(`Simulation stopped: ${sessionId}`);
    return session;
  }

  async send(dto: SendMeasurementDto, actor: any, context: any) {
    const DriverClass = DRIVER_MAP[dto.driverName] ?? MockDriver;
    const driver = new DriverClass();
    await driver.connect(dto.deviceId);

    let raw: RawMeasurement;
    if (dto.values) {
      raw = {
        deviceId: dto.deviceId,
        driverName: dto.driverName,
        measurementType: dto.measurementType ?? MeasurementType.GENERIC,
        rawData: dto.values,
        timestamp: new Date(),
      };
    } else {
      raw = await driver.takeMeasurement(dto.deviceId);
    }

    const activeSession = [...this.sessions.values()].find(
      (s) => s.deviceId === dto.deviceId && s.active,
    );
    if (activeSession) activeSession.measurementsSent++;

    return this.pipeline.ingest(raw, actor, context);
  }

  getActiveSessions(): SimulationSession[] {
    return [...this.sessions.values()].filter((s) => s.active);
  }

  getAllSessions(): SimulationSession[] {
    return [...this.sessions.values()];
  }
}
