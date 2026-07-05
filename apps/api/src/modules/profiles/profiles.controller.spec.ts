import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: {
    create: jest.Mock; getMyProfile: jest.Mock; update: jest.Mock;
    delete: jest.Mock; uploadAvatar: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };
  const profile = { id: 'p-1', userId: 'user-1', fullName: 'Jane Doe' } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(profile),
      getMyProfile: jest.fn().mockResolvedValue(profile),
      update: jest.fn().mockResolvedValue(profile),
      delete: jest.fn().mockResolvedValue(undefined),
      uploadAvatar: jest.fn().mockResolvedValue({ ...profile, photo: '/uploads/avatars/img.jpg' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: service }],
    }).compile();

    controller = module.get(ProfilesController);
  });

  it('create() delegates to service', async () => {
    await controller.create(user, { fullName: 'Jane Doe' });
    expect(service.create).toHaveBeenCalledWith('user-1', { fullName: 'Jane Doe' });
  });

  it('getMyProfile() delegates to service', async () => {
    await controller.getMyProfile(user);
    expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
  });

  it('update() delegates to service', async () => {
    await controller.update(user, { fullName: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('user-1', { fullName: 'Updated' });
  });

  it('delete() delegates to service', async () => {
    await controller.delete(user);
    expect(service.delete).toHaveBeenCalledWith('user-1');
  });

  it('uploadAvatar() delegates to service with file', async () => {
    const file = { originalname: 'img.jpg', buffer: Buffer.from('') } as any;
    const result = await controller.uploadAvatar(user, file);
    expect(service.uploadAvatar).toHaveBeenCalledWith('user-1', file);
    expect(result.photo).toBe('/uploads/avatars/img.jpg');
  });

  it('uploadAvatar() throws BadRequestException when no file', () => {
    expect(() => controller.uploadAvatar(user, undefined as any)).toThrow(BadRequestException);
  });
});
