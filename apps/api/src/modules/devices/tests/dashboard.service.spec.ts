import { DashboardService } from '../dashboard/dashboard.service';

const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PATIENT = { sub: 'pat-1', role: 'PATIENT' };

function makeDevice(overrides: any = {}) {
  return {
    id: 'dev-1',
    name: 'Dev',
    status: 'CONNECTED',
    batteryLevel: 80,
    signalStrength: 'GOOD',
    lastSeen: new Date(),
    avgSignalQuality: 0.8,
    avgLatencyMs: 120,
    totalErrors: 2,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSession(overrides: any = {}) {
  return {
    id: 'ses-1',
    status: 'ENDED',
    startedAt: new Date(Date.now() - 60000),
    endedAt: new Date(),
    ...overrides,
  };
}

function makeMeasurement(overrides: any = {}) {
  return {
    id: 'meas-1',
    deviceId: 'dev-1',
    driverName: 'mock-driver',
    measurementType: 'BLOOD_PRESSURE',
    status: 'VALIDATED',
    recordedAt: new Date(),
    validationFlags: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    device: { findMany: jest.fn() },
    deviceSession: { findMany: jest.fn() },
    deviceMeasurement: {
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    patient: { findFirst: jest.fn() },
  };
}

function makeBle() {
  return {
    getScanStatus: jest.fn().mockReturnValue({ scanning: false, connectedCount: 1, discoveredCount: 0, startedAt: null }),
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: ReturnType<typeof makePrisma>;
  let ble: ReturnType<typeof makeBle>;

  beforeEach(() => {
    prisma = makePrisma();
    ble = makeBle();
    service = new DashboardService(prisma as any, ble as any);
  });

  it('returns dashboard with correct counts for ADMIN', async () => {
    prisma.device.findMany.mockResolvedValue([
      makeDevice({ status: 'CONNECTED' }),
      makeDevice({ id: 'dev-2', status: 'DISCONNECTED', batteryLevel: 10, avgSignalQuality: null, avgLatencyMs: null }),
    ]);
    prisma.deviceSession.findMany.mockResolvedValue([
      makeSession({ status: 'ACTIVE', endedAt: null }),
      makeSession({ status: 'ENDED' }),
    ]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([
      makeMeasurement({ status: 'VALIDATED', recordedAt: new Date() }),
      makeMeasurement({ id: 'meas-2', status: 'REJECTED', recordedAt: new Date() }),
    ]);

    const result = await service.getDashboard(ADMIN);

    expect(result.totalDevices).toBe(2);
    expect(result.activeDevices).toBe(1);
    expect(result.connectedDevices).toBe(1);
    expect(result.devicesWithLowBattery).toBe(1);
    expect(result.activeSessions).toBe(1);
    expect(result.totalSessions).toBe(2);
    expect(result.measurementsValidated).toBe(1);
    expect(result.measurementsRejected).toBe(1);
    expect(result.totalErrors).toBe(4); // 2+2
  });

  it('calculates avgSessionDurationMs for ended sessions', async () => {
    const start = new Date(Date.now() - 60000);
    const end = new Date();
    prisma.device.findMany.mockResolvedValue([]);
    prisma.deviceSession.findMany.mockResolvedValue([makeSession({ startedAt: start, endedAt: end })]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([]);

    const result = await service.getDashboard(ADMIN);
    expect(result.avgSessionDurationMs).toBeGreaterThan(0);
  });

  it('avgSessionDurationMs is null when no ended sessions', async () => {
    prisma.device.findMany.mockResolvedValue([]);
    prisma.deviceSession.findMany.mockResolvedValue([makeSession({ status: 'ACTIVE', endedAt: null })]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([]);

    const result = await service.getDashboard(ADMIN);
    expect(result.avgSessionDurationMs).toBeNull();
  });

  it('avgSignalQuality is null when no devices have signal data', async () => {
    prisma.device.findMany.mockResolvedValue([makeDevice({ avgSignalQuality: null, avgLatencyMs: null })]);
    prisma.deviceSession.findMany.mockResolvedValue([]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([]);

    const result = await service.getDashboard(ADMIN);
    expect(result.avgSignalQuality).toBeNull();
    expect(result.avgLatencyMs).toBeNull();
  });

  it('PATIENT uses patientId filter', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.device.findMany.mockResolvedValue([]);
    prisma.deviceSession.findMany.mockResolvedValue([]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([]);

    await service.getDashboard(PATIENT);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({ where: { userId: PATIENT.sub, deletedAt: null } });
  });

  it('PATIENT with no patient record uses patientId=none', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    prisma.device.findMany.mockResolvedValue([]);
    prisma.deviceSession.findMany.mockResolvedValue([]);
    prisma.deviceMeasurement.findMany.mockResolvedValue([]);

    await service.getDashboard(PATIENT);
    expect(prisma.device.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ patientId: 'none' }) }),
    );
  });

  it('measurementsLast24h counts recent measurements', async () => {
    prisma.device.findMany.mockResolvedValue([]);
    prisma.deviceSession.findMany.mockResolvedValue([]);
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    prisma.deviceMeasurement.findMany.mockResolvedValue([
      makeMeasurement({ recordedAt: new Date() }),
      makeMeasurement({ id: 'meas-old', recordedAt: old }),
    ]);

    const result = await service.getDashboard(ADMIN);
    expect(result.measurementsLast24h).toBe(1);
  });
});
