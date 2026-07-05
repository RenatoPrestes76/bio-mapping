import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BleManagerService } from '../ble/ble-manager.service';
import type { DeviceDashboardDto, DeviceSummaryDto, RecentMeasurementDto } from './dto/dashboard-response.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ble: BleManagerService,
  ) {}

  async getDashboard(actor: Actor): Promise<DeviceDashboardDto> {
    const orgFilter = actor.role === 'PATIENT' ? await this.buildPatientFilter(actor.sub) : {};

    const [devices, sessions, measurements] = await Promise.all([
      this.prisma.device.findMany({
        where: { deletedAt: null, ...orgFilter },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.deviceSession.findMany({
        where: { device: { deletedAt: null, ...orgFilter } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      this.prisma.deviceMeasurement.findMany({
        where: { device: { deletedAt: null, ...orgFilter } },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      }),
    ]);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const bleStatus = this.ble.getScanStatus();

    const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
    const endedSessions  = sessions.filter((s) => s.status === 'ENDED' && s.endedAt);
    const avgDuration = endedSessions.length > 0
      ? endedSessions.reduce((sum, s) => sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()), 0) / endedSessions.length
      : null;

    const withSignal   = devices.filter((d) => d.avgSignalQuality !== null);
    const withLatency  = devices.filter((d) => d.avgLatencyMs !== null);
    const avgSignal    = withSignal.length ? withSignal.reduce((s, d) => s + d.avgSignalQuality!, 0) / withSignal.length : null;
    const avgLatency   = withLatency.length ? withLatency.reduce((s, d) => s + d.avgLatencyMs!, 0) / withLatency.length : null;

    const deviceSummaries: DeviceSummaryDto[] = await Promise.all(devices.slice(0, 10).map(async (d) => {
      const latest = await this.prisma.deviceMeasurement.findFirst({
        where: { deviceId: d.id },
        orderBy: { recordedAt: 'desc' },
        select: { recordedAt: true },
      });
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        batteryLevel: d.batteryLevel,
        signalStrength: d.signalStrength,
        lastSeen: d.lastSeen,
        totalErrors: d.totalErrors,
        latestMeasurementAt: latest?.recordedAt ?? null,
      };
    }));

    const recentMeasurements: RecentMeasurementDto[] = measurements.slice(0, 10).map((m) => ({
      id: m.id,
      deviceId: m.deviceId,
      driverName: m.driverName,
      measurementType: m.measurementType,
      status: m.status,
      recordedAt: m.recordedAt,
      validFlags: Array.isArray(m.validationFlags) ? (m.validationFlags as unknown[]).length : 0,
    }));

    return {
      totalDevices:          devices.length,
      activeDevices:         devices.filter((d) => d.status !== 'DISCONNECTED' && d.status !== 'ERROR').length,
      connectedDevices:      bleStatus.connectedCount,
      devicesWithLowBattery: devices.filter((d) => d.batteryLevel !== null && d.batteryLevel < 20).length,

      totalMeasurements:     measurements.length,
      measurementsLast24h:   measurements.filter((m) => new Date(m.recordedAt) >= yesterday).length,
      measurementsValidated: measurements.filter((m) => m.status === 'VALIDATED' || m.status === 'PROCESSED').length,
      measurementsRejected:  measurements.filter((m) => m.status === 'REJECTED').length,

      totalErrors:           devices.reduce((s, d) => s + d.totalErrors, 0),
      avgSignalQuality:      avgSignal,
      avgLatencyMs:          avgLatency,

      activeSessions:        activeSessions.length,
      totalSessions:         sessions.length,
      avgSessionDurationMs:  avgDuration,

      recentMeasurements,
      deviceSummaries,
    };
  }

  private async buildPatientFilter(userId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { userId, deletedAt: null } });
    return patient ? { patientId: patient.id } : { patientId: 'none' };
  }
}
