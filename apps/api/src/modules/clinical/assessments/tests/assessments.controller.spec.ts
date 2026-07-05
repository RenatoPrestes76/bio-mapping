import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsController } from '../controllers/assessments.controller';
import { AssessmentsService } from '../services/assessments.service';

const mockUser = { sub: 'u1', role: 'ADMIN' };
const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
const CTX = { ip: '127.0.0.1', userAgent: 'test' };

describe('AssessmentsController', () => {
  let controller: AssessmentsController;
  let service: jest.Mocked<Pick<
    AssessmentsService,
    | 'create' | 'findAll' | 'findOne' | 'update' | 'complete' | 'validate' | 'lock'
    | 'remove' | 'summary' | 'timeline' | 'search'
  >>;

  beforeEach(async () => {
    service = {
      create:    jest.fn(),
      findAll:   jest.fn(),
      findOne:   jest.fn(),
      update:    jest.fn(),
      complete:  jest.fn(),
      validate:  jest.fn(),
      lock:      jest.fn(),
      remove:    jest.fn(),
      summary:   jest.fn(),
      timeline:  jest.fn(),
      search:    jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentsController],
      providers: [{ provide: AssessmentsService, useValue: service }],
    })
      .overrideGuard(require('../../../identity/auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../../identity/auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AssessmentsController);
  });

  it('create delega ao service', () => {
    const dto = { templateId: 'tpl-1' } as any;
    controller.create('patient-1', dto, mockUser, mockReq);
    expect(service.create).toHaveBeenCalledWith('patient-1', dto, mockUser, CTX);
  });

  it('summary delega ao service', () => {
    controller.summary('patient-1', mockUser);
    expect(service.summary).toHaveBeenCalledWith('patient-1', mockUser);
  });

  it('findAll delega ao service', () => {
    const dto = { page: 1 } as any;
    controller.findAll('patient-1', dto, mockUser);
    expect(service.findAll).toHaveBeenCalledWith('patient-1', dto, mockUser);
  });

  it('timeline delega ao service', () => {
    controller.timeline('patient-1', mockUser);
    expect(service.timeline).toHaveBeenCalledWith('patient-1', mockUser);
  });

  it('search delega ao service', () => {
    const dto = {} as any;
    controller.search(dto, mockUser);
    expect(service.search).toHaveBeenCalledWith(dto, mockUser);
  });

  it('findOne delega ao service', () => {
    controller.findOne('asm-1', mockUser);
    expect(service.findOne).toHaveBeenCalledWith('asm-1', mockUser);
  });

  it('update delega ao service', () => {
    const dto = { notes: 'ok' } as any;
    controller.update('asm-1', dto, mockUser, mockReq);
    expect(service.update).toHaveBeenCalledWith('asm-1', dto, mockUser, CTX);
  });

  it('complete delega ao service', () => {
    controller.complete('asm-1', mockUser, mockReq);
    expect(service.complete).toHaveBeenCalledWith('asm-1', mockUser, CTX);
  });

  it('validate delega ao service', () => {
    controller.validate('asm-1', mockUser, mockReq);
    expect(service.validate).toHaveBeenCalledWith('asm-1', mockUser, CTX);
  });

  it('lock delega ao service', () => {
    controller.lock('asm-1', mockUser, mockReq);
    expect(service.lock).toHaveBeenCalledWith('asm-1', mockUser, CTX);
  });

  it('remove delega ao service', () => {
    controller.remove('asm-1', mockUser, mockReq);
    expect(service.remove).toHaveBeenCalledWith('asm-1', mockUser, CTX);
  });
});
