import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { BranchService } from '../services/branch.service.js';

const makeBranchRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn(),
  findByOrganization: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
  softDelete: jest.fn(),
  countByOrganization: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const makePlanLimits = (overrides: Record<string, unknown> = {}) => ({
  assertCanAddBranch: jest.fn().mockResolvedValue(undefined),
  assertCanAddUser: jest.fn().mockResolvedValue(undefined),
  getUsage: jest.fn(),
  getLimits: jest.fn(),
  ...overrides,
});

const makePrisma = (membership: unknown = { role: 'OWNER' }) => ({
  membership: { findFirst: jest.fn().mockResolvedValue(membership) },
});

const branch = {
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Unidade Centro',
  address: 'Rua A, 123',
  isActive: true,
  deletedAt: null,
};

describe('BranchService', () => {
  let service: BranchService;
  let branchRepo: ReturnType<typeof makeBranchRepo>;
  let planLimits: ReturnType<typeof makePlanLimits>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    branchRepo = makeBranchRepo({ create: jest.fn().mockResolvedValue(branch) });
    planLimits = makePlanLimits();
    prisma = makePrisma();
    service = new BranchService(branchRepo as never, planLimits as never, prisma as never);
  });

  describe('createBranch', () => {
    it('creates branch when user is admin', async () => {
      const result = await service.createBranch('user-1', { organizationId: 'org-1', name: 'Unidade Centro' });
      expect(result).toBe(branch);
      expect(branchRepo.create).toHaveBeenCalled();
      expect(planLimits.assertCanAddBranch).toHaveBeenCalledWith('org-1');
    });

    it('throws ForbiddenException when user is not admin', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.createBranch('user-1', { organizationId: 'org-1', name: 'X' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when plan limit reached', async () => {
      planLimits.assertCanAddBranch.mockRejectedValue(new BadRequestException('Limite atingido'));
      await expect(service.createBranch('user-1', { organizationId: 'org-1', name: 'X' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listBranches', () => {
    it('returns branches for organization', async () => {
      branchRepo.findByOrganization.mockResolvedValue([branch]);
      const result = await service.listBranches('org-1');
      expect(result).toEqual([branch]);
    });
  });

  describe('getBranch', () => {
    it('returns branch when found', async () => {
      branchRepo.findById.mockResolvedValue(branch);
      const result = await service.getBranch('branch-1');
      expect(result).toBe(branch);
    });

    it('throws NotFoundException when not found', async () => {
      branchRepo.findById.mockResolvedValue(null);
      await expect(service.getBranch('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateBranch', () => {
    it('updates branch when user is admin', async () => {
      branchRepo.findById.mockResolvedValue(branch);
      branchRepo.update.mockResolvedValue({ ...branch, name: 'Updated' });
      const result = await service.updateBranch('branch-1', 'user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws ForbiddenException when user is not admin', async () => {
      branchRepo.findById.mockResolvedValue(branch);
      prisma.membership.findFirst.mockResolvedValue(null);
      await expect(service.updateBranch('branch-1', 'user-1', { name: 'X' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deleteBranch', () => {
    it('soft deletes branch when user is admin', async () => {
      branchRepo.findById.mockResolvedValue(branch);
      branchRepo.softDelete.mockResolvedValue({ ...branch, deletedAt: new Date() });
      await service.deleteBranch('branch-1', 'user-1');
      expect(branchRepo.softDelete).toHaveBeenCalledWith('branch-1');
    });
  });
});
