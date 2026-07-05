import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryController } from '../discovery/controllers/discovery.controller';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';

function makeService(): jest.Mocked<DiscoveryService> {
  return {
    startScan: jest.fn().mockReturnValue({ scanning: true, message: 'Scan iniciado' }),
    stopScan: jest.fn().mockReturnValue({ scanning: false, discoveredCount: 0, message: 'Scan encerrado' }),
    reportDevice: jest.fn().mockReturnValue({ macAddress: 'AA:BB', name: 'Dev', signalStrength: 'GOOD', connectionType: 'BLE', discoveredAt: new Date() }),
    getDiscovered: jest.fn().mockReturnValue([]),
    getScanStatus: jest.fn().mockReturnValue({ scanning: false, startedAt: null, discoveredCount: 0, connectedCount: 0 }),
  } as any;
}

const USER = { sub: 'u1', role: 'ADMIN' };

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let svc: jest.Mocked<DiscoveryService>;

  beforeEach(async () => {
    svc = makeService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [{ provide: DiscoveryService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DiscoveryController);
  });

  it('startScan delega para service.startScan', () => {
    const result = controller.startScan(USER);
    expect(svc.startScan).toHaveBeenCalledWith(USER);
    expect(result).toEqual(expect.objectContaining({ scanning: true }));
  });

  it('stopScan delega para service.stopScan', () => {
    const result = controller.stopScan(USER);
    expect(svc.stopScan).toHaveBeenCalledWith(USER);
    expect(result).toEqual(expect.objectContaining({ scanning: false }));
  });

  it('reportDevice delega para service.reportDevice', () => {
    const dto = { macAddress: 'AA:BB', name: 'Dev' } as any;
    const result = controller.reportDevice(dto);
    expect(svc.reportDevice).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expect.objectContaining({ macAddress: 'AA:BB' }));
  });

  it('getDiscovered delega para service.getDiscovered', () => {
    const result = controller.getDiscovered();
    expect(svc.getDiscovered).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getScanStatus delega para service.getScanStatus', () => {
    const result = controller.getScanStatus();
    expect(svc.getScanStatus).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ scanning: false }));
  });
});
