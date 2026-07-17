import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BranchRepository } from '../repositories/branch.repository.js';
import { PlanLimitsService } from './plan-limits.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class BranchService {
  constructor(
    private readonly branchRepo: BranchRepository,
    private readonly planLimits: PlanLimitsService,
    private readonly prisma: PrismaService,
  ) {}

  async createBranch(actorId: string, data: {
    organizationId: string;
    name: string;
    address?: string;
    phone?: string;
    city?: string;
    state?: string;
  }) {
    await this.assertAdmin(data.organizationId, actorId);
    await this.planLimits.assertCanAddBranch(data.organizationId);
    return this.branchRepo.create(data);
  }

  async listBranches(organizationId: string) {
    return this.branchRepo.findByOrganization(organizationId);
  }

  async getBranch(id: string) {
    const branch = await this.branchRepo.findById(id);
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  async updateBranch(id: string, actorId: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    city?: string;
    state?: string;
    isActive?: boolean;
  }) {
    const branch = await this.getBranch(id);
    await this.assertAdmin(branch.organizationId, actorId);
    return this.branchRepo.update(id, data);
  }

  async deleteBranch(id: string, actorId: string) {
    const branch = await this.getBranch(id);
    await this.assertAdmin(branch.organizationId, actorId);
    return this.branchRepo.softDelete(id);
  }

  private async assertAdmin(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN', 'MANAGER'] }, deletedAt: null },
    });
    if (!membership) throw new ForbiddenException('Permissão insuficiente na organização');
  }
}
