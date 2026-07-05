import { Test, TestingModule } from '@nestjs/testing';
import { BiologicalProfileController } from './biological-profile.controller';
import { BiologicalProfileService } from './biological-profile.service';

describe('BiologicalProfileController', () => {
  let controller: BiologicalProfileController;
  let service: { getMine: jest.Mock; upsertMine: jest.Mock };

  const currentUser = { sub: 'user-1', email: 'jane@example.com', role: 'USER' as const };

  beforeEach(async () => {
    service = { getMine: jest.fn(), upsertMine: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiologicalProfileController],
      providers: [{ provide: BiologicalProfileService, useValue: service }],
    }).compile();

    controller = module.get(BiologicalProfileController);
  });

  it('getMine() forwards the current user id to the service', async () => {
    service.getMine.mockResolvedValue({ id: 'profile-1' });

    await controller.getMine(currentUser);

    expect(service.getMine).toHaveBeenCalledWith('user-1');
  });

  it('upsertMine() forwards the current user id and dto to the service', async () => {
    service.upsertMine.mockResolvedValue({ id: 'profile-1', height: 178 });

    await controller.upsertMine(currentUser, { height: 178 });

    expect(service.upsertMine).toHaveBeenCalledWith('user-1', { height: 178 });
  });
});
