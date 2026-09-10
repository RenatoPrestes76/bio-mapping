import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceController } from '../controllers/evidence.controller';
import { EvidenceService } from '../services/evidence.service';

const mockUser = { sub: 'u1', role: 'ADMIN' };
const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

describe('EvidenceController', () => {
  let controller: EvidenceController;
  let service: jest.Mocked<Pick<EvidenceService, 'upload' | 'findAll' | 'remove' | 'download'>>;

  beforeEach(async () => {
    service = {
      upload: jest.fn(),
      findAll: jest.fn(),
      remove: jest.fn(),
      download: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceController],
      providers: [{ provide: EvidenceService, useValue: service }],
    })
      .overrideGuard(require('../../../identity/auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../../identity/auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EvidenceController);
  });

  it('upload delega ao service com contexto correto', () => {
    const file = { originalname: 'foto.jpg' } as Express.Multer.File;
    controller.upload('asm-1', file, mockUser, mockReq);
    expect(service.upload).toHaveBeenCalledWith('asm-1', file, mockUser, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('findAll delega ao service', () => {
    controller.findAll('asm-1', mockUser);
    expect(service.findAll).toHaveBeenCalledWith('asm-1', mockUser);
  });

  it('remove delega ao service com contexto correto', () => {
    controller.remove('asm-1', 'ev-1', mockUser, mockReq);
    expect(service.remove).toHaveBeenCalledWith('asm-1', 'ev-1', mockUser, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('download delega ao service e faz stream do arquivo com Content-Type correto', async () => {
    service.download.mockResolvedValue({ path: '/app/uploads/evidence/asm-1/uuid.jpg', mimeType: 'image/jpeg', originalName: 'foto.jpg' });
    const res = { setHeader: jest.fn(), sendFile: jest.fn() } as any;

    await controller.download('asm-1', 'ev-1', mockUser, res);

    expect(service.download).toHaveBeenCalledWith('asm-1', 'ev-1', mockUser);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(res.sendFile).toHaveBeenCalledWith('/app/uploads/evidence/asm-1/uuid.jpg');
  });
});
