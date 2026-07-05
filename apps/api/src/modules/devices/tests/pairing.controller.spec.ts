import { Test, TestingModule } from '@nestjs/testing';
import { PairingController } from '../pairing/controllers/pairing.controller';
import { PairingService } from '../pairing/services/pairing.service';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';

function makeService(): jest.Mocked<PairingService> {
  return {
    pair: jest.fn().mockResolvedValue({ id: 'dev-1', status: 'PAIRED' }),
    unpair: jest.fn().mockResolvedValue({ id: 'dev-1', status: 'DISCONNECTED' }),
  } as any;
}

const USER = { sub: 'u1', role: 'PROFESSIONAL' };
const REQ = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

describe('PairingController', () => {
  let controller: PairingController;
  let svc: jest.Mocked<PairingService>;

  beforeEach(async () => {
    svc = makeService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PairingController],
      providers: [{ provide: PairingService, useValue: svc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PairingController);
  });

  it('pair delega para service.pair com contexto de auditoria', async () => {
    const dto = { patientId: 'pat-1' } as any;
    const result = await controller.pair('dev-1', dto, USER, REQ);
    expect(svc.pair).toHaveBeenCalledWith('dev-1', dto, USER, { ip: '127.0.0.1', userAgent: 'test' });
    expect(result).toEqual(expect.objectContaining({ status: 'PAIRED' }));
  });

  it('unpair delega para service.unpair com contexto de auditoria', async () => {
    await controller.unpair('dev-1', USER, REQ);
    expect(svc.unpair).toHaveBeenCalledWith('dev-1', USER, { ip: '127.0.0.1', userAgent: 'test' });
  });
});
