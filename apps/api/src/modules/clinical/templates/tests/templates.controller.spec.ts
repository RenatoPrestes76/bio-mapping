import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from '../controllers/templates.controller';
import { TemplatesService } from '../services/templates.service';

const mockUser = { sub: 'u1', role: 'ADMIN' };
const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } };

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: jest.Mocked<Pick<
    TemplatesService,
    | 'create' | 'findAll' | 'findOne' | 'update' | 'remove'
    | 'addSection' | 'updateSection' | 'removeSection'
    | 'addField' | 'updateField' | 'removeField'
  >>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addSection: jest.fn(),
      updateSection: jest.fn(),
      removeSection: jest.fn(),
      addField: jest.fn(),
      updateField: jest.fn(),
      removeField: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [{ provide: TemplatesService, useValue: service }],
    })
      .overrideGuard(require('../../../identity/auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../../identity/auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TemplatesController);
  });

  it('create delega ao service', () => {
    const dto = { name: 'T', category: 'PHYSICAL' } as any;
    controller.create(dto, mockUser, mockReq);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('findAll delega ao service', () => {
    const dto = { page: 1 } as any;
    controller.findAll(dto, mockUser);
    expect(service.findAll).toHaveBeenCalledWith(dto, mockUser);
  });

  it('findOne delega ao service', () => {
    controller.findOne('tpl-1');
    expect(service.findOne).toHaveBeenCalledWith('tpl-1');
  });

  it('update delega ao service', () => {
    const dto = { name: 'Novo' } as any;
    controller.update('tpl-1', dto, mockUser, mockReq);
    expect(service.update).toHaveBeenCalledWith('tpl-1', dto, mockUser, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('remove delega ao service', () => {
    controller.remove('tpl-1', mockUser, mockReq);
    expect(service.remove).toHaveBeenCalledWith('tpl-1', mockUser, { ip: '127.0.0.1', userAgent: 'test' });
  });

  it('addSection delega ao service', () => {
    const dto = { title: 'S1' } as any;
    controller.addSection('tpl-1', dto, mockUser);
    expect(service.addSection).toHaveBeenCalledWith('tpl-1', dto, mockUser);
  });

  it('updateSection delega ao service', () => {
    const dto = { title: 'S1 novo' } as any;
    controller.updateSection('sec-1', dto, mockUser);
    expect(service.updateSection).toHaveBeenCalledWith('sec-1', dto, mockUser);
  });

  it('removeSection delega ao service', () => {
    controller.removeSection('sec-1', mockUser);
    expect(service.removeSection).toHaveBeenCalledWith('sec-1', mockUser);
  });

  it('addField delega ao service', () => {
    const dto = { label: 'F1', fieldType: 'NUMBER' } as any;
    controller.addField('sec-1', dto, mockUser);
    expect(service.addField).toHaveBeenCalledWith('sec-1', dto, mockUser);
  });

  it('updateField delega ao service', () => {
    const dto = { label: 'F1 novo' } as any;
    controller.updateField('fld-1', dto, mockUser);
    expect(service.updateField).toHaveBeenCalledWith('fld-1', dto, mockUser);
  });

  it('removeField delega ao service', () => {
    controller.removeField('fld-1', mockUser);
    expect(service.removeField).toHaveBeenCalledWith('fld-1', mockUser);
  });
});
