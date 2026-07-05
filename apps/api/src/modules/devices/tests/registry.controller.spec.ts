import { Test, TestingModule } from '@nestjs/testing';
import { RegistryController } from '../registry/controllers/registry.controller';
import { RegistryService } from '../registry/services/registry.service';
import { SessionsService } from '../sessions/services/sessions.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';

function makeRegistry(): jest.Mocked<RegistryService> {
  return {
    register: jest.fn().mockResolvedValue({ id: 'dev-1', name: 'Dev' }),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    findOne: jest.fn().mockResolvedValue({ id: 'dev-1' }),
    update: jest.fn().mockResolvedValue({ id: 'dev-1', name: 'Updated' }),
    remove: jest.fn().mockResolvedValue(undefined),
    getStatistics: jest.fn().mockResolvedValue({ totalDevices: 0 }),
  } as any;
}

function makeSessions(): jest.Mocked<SessionsService> {
  return {
    findSessions: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    startSession: jest.fn().mockResolvedValue({ id: 'ses-1' }),
    endSession: jest.fn().mockResolvedValue({ id: 'ses-1', status: 'ENDED' }),
    findById: jest.fn().mockResolvedValue({ id: 'ses-1' }),
  } as any;
}

const USER = { sub: 'u1', role: 'ADMIN' };
const REQ = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

describe('RegistryController', () => {
  let controller: RegistryController;
  let registry: jest.Mocked<RegistryService>;
  let sessions: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    registry = makeRegistry();
    sessions = makeSessions();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistryController],
      providers: [
        { provide: RegistryService, useValue: registry },
        { provide: SessionsService, useValue: sessions },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RegistryController);
  });

  it('register delega para registry.register', async () => {
    const dto = { name: 'Dev' } as any;
    const result = await controller.register(dto, USER, REQ);
    expect(registry.register).toHaveBeenCalledWith(dto, USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ id: 'dev-1' }));
  });

  it('findAll delega para registry.findAll', async () => {
    const result = await controller.findAll({} as any, USER);
    expect(registry.findAll).toHaveBeenCalledWith({}, USER);
    expect(result.total).toBe(0);
  });

  it('getStatistics delega para registry.getStatistics', async () => {
    const result = await controller.getStatistics(USER);
    expect(registry.getStatistics).toHaveBeenCalledWith(USER);
    expect(result).toEqual(expect.objectContaining({ totalDevices: 0 }));
  });

  it('getSessions delega para sessions.findSessions', async () => {
    const result = await controller.getSessions(1, 20);
    expect(sessions.findSessions).toHaveBeenCalledWith(1, 20);
    expect(result.total).toBe(0);
  });

  it('findOne delega para registry.findOne', async () => {
    const result = await controller.findOne('dev-1', USER);
    expect(registry.findOne).toHaveBeenCalledWith('dev-1', USER);
    expect(result).toEqual(expect.objectContaining({ id: 'dev-1' }));
  });

  it('update delega para registry.update', async () => {
    const dto = { name: 'Updated' } as any;
    const result = await controller.update('dev-1', dto, USER, REQ);
    expect(registry.update).toHaveBeenCalledWith('dev-1', dto, USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ name: 'Updated' }));
  });

  it('remove delega para registry.remove', async () => {
    await controller.remove('dev-1', USER, REQ);
    expect(registry.remove).toHaveBeenCalledWith('dev-1', USER, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('startSession delega para sessions.startSession', async () => {
    const result = await controller.startSession('dev-1', USER, REQ);
    expect(sessions.startSession).toHaveBeenCalledWith('dev-1', USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ id: 'ses-1' }));
  });

  it('endSession delega para sessions.endSession', async () => {
    const result = await controller.endSession('ses-1', USER, REQ);
    expect(sessions.endSession).toHaveBeenCalledWith('ses-1', USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ status: 'ENDED' }));
  });
});
