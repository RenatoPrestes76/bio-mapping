import { Test, TestingModule } from '@nestjs/testing';
import { MockDeviceController } from '../drivers/mock/mock-device.controller';
import { MockDeviceService } from '../drivers/mock/mock-device.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { MeasurementType } from '../drivers/base/device-capability';

function makeMockService(): jest.Mocked<MockDeviceService> {
  return {
    listDrivers: jest.fn().mockReturnValue(['mock-driver', 'smart-scale']),
    start: jest.fn().mockReturnValue({ id: 'sim-1', deviceId: 'dev-1', active: true }),
    stop: jest.fn().mockReturnValue({ id: 'sim-1', active: false }),
    send: jest.fn().mockResolvedValue({ measurementId: 'meas-1' }),
    getAllSessions: jest.fn().mockReturnValue([{ id: 'sim-1' }]),
    getActiveSessions: jest.fn().mockReturnValue([]),
  } as any;
}

const USER = { sub: 'u1', role: 'ADMIN' };
const REQ = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

describe('MockDeviceController', () => {
  let controller: MockDeviceController;
  let svc: jest.Mocked<MockDeviceService>;

  beforeEach(async () => {
    svc = makeMockService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MockDeviceController],
      providers: [{ provide: MockDeviceService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MockDeviceController);
  });

  it('listDrivers delegates to service', () => {
    const result = controller.listDrivers();
    expect(svc.listDrivers).toHaveBeenCalled();
    expect(result).toContain('mock-driver');
  });

  it('start delegates to service', () => {
    const result = controller.start({ deviceId: 'dev-1', driverName: 'mock-driver' });
    expect(svc.start).toHaveBeenCalledWith('dev-1', 'mock-driver');
    expect(result).toEqual(expect.objectContaining({ active: true }));
  });

  it('stop delegates to service', () => {
    const result = controller.stop('sim-1');
    expect(svc.stop).toHaveBeenCalledWith('sim-1');
    expect(result).toEqual(expect.objectContaining({ active: false }));
  });

  it('send delegates to service with user and context', async () => {
    const dto = { deviceId: 'dev-1', driverName: 'mock-driver', measurementType: MeasurementType.GENERIC };
    const result = await controller.send(dto, USER, REQ);
    expect(svc.send).toHaveBeenCalledWith(dto, USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ measurementId: 'meas-1' }));
  });

  it('getSessions delegates to service', () => {
    const result = controller.getSessions();
    expect(svc.getAllSessions).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
