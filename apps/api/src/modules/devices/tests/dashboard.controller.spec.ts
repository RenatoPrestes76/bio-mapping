import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';

const mockDashboard = {
  totalDevices: 5,
  activeDevices: 3,
  connectedDevices: 1,
  devicesWithLowBattery: 0,
  totalMeasurements: 20,
  measurementsLast24h: 5,
  measurementsValidated: 18,
  measurementsRejected: 2,
  totalErrors: 1,
  avgSignalQuality: 0.9,
  avgLatencyMs: 80,
  activeSessions: 1,
  totalSessions: 10,
  avgSessionDurationMs: 30000,
  recentMeasurements: [],
  deviceSummaries: [],
};

const USER = { sub: 'u1', role: 'ADMIN' };

describe('DashboardController', () => {
  let controller: DashboardController;
  let svc: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    svc = { getDashboard: jest.fn().mockResolvedValue(mockDashboard) } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DashboardController);
  });

  it('getDashboard delegates to service', async () => {
    const result = await controller.getDashboard(USER);
    expect(svc.getDashboard).toHaveBeenCalledWith(USER);
    expect(result).toEqual(mockDashboard);
  });
});
