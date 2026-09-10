import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { getMe: jest.Mock; updateMe: jest.Mock; changePassword: jest.Mock; findAll: jest.Mock };

  const req = { ip: '10.0.0.1' } as any;
  const currentUser = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };

  beforeEach(async () => {
    usersService = { getMe: jest.fn(), updateMe: jest.fn(), changePassword: jest.fn(), findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('getMe() forwards the current user id to the service', async () => {
    usersService.getMe.mockResolvedValue({ id: 'user-1' });

    await controller.getMe(currentUser);

    expect(usersService.getMe).toHaveBeenCalledWith('user-1');
  });

  it('updateMe() forwards the current user id and dto to the service', async () => {
    usersService.updateMe.mockResolvedValue({ id: 'user-1', name: 'New Name' });

    await controller.updateMe(currentUser, { name: 'New Name' });

    expect(usersService.updateMe).toHaveBeenCalledWith('user-1', { name: 'New Name' });
  });

  it('changePassword() forwards the user id, dto and ip to the service', async () => {
    usersService.changePassword.mockResolvedValue(undefined);

    await controller.changePassword(
      currentUser,
      { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' },
      req,
    );

    expect(usersService.changePassword).toHaveBeenCalledWith(
      'user-1',
      { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' },
      '10.0.0.1',
    );
  });

  // Achado da Sprint 06.1: findAll() é a rota que a Área Administrador do Web
  // agora consome (@Roles(Role.ADMIN) já existente, nunca testado antes).
  it('findAll() forwards the query dto to the service', async () => {
    usersService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    const result = await controller.findAll({ page: 1, limit: 20 } as any);

    expect(usersService.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });
});
