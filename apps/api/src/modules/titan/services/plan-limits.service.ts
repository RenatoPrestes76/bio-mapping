import { BadRequestException, Injectable } from '@nestjs/common';
import { OrganizationPlan } from '@bio/database';
import { BranchRepository } from '../repositories/branch.repository.js';
import { PrismaService } from '../../../database/prisma.service.js';

const PLAN_LIMITS: Record<OrganizationPlan, { maxUsers: number; maxBranches: number; apiCallsMonthly: number }> = {
  FREE:         { maxUsers: 5,     maxBranches: 1,   apiCallsMonthly: 1_000 },
  STARTER:      { maxUsers: 25,    maxBranches: 3,   apiCallsMonthly: 10_000 },
  PROFESSIONAL: { maxUsers: 100,   maxBranches: 10,  apiCallsMonthly: 100_000 },
  ENTERPRISE:   { maxUsers: 10000, maxBranches: 999, apiCallsMonthly: 10_000_000 },
};

@Injectable()
export class PlanLimitsService {
  constructor(
    private readonly branchRepo: BranchRepository,
    private readonly prisma: PrismaService,
  ) {}

  getLimits(plan: OrganizationPlan) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  }

  async assertCanAddUser(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findFirst({ where: { id: organizationId } });
    if (!org) return;
    const limits = this.getLimits(org.plan as OrganizationPlan);
    const count = await this.prisma.membership.count({ where: { organizationId, deletedAt: null } });
    if (count >= limits.maxUsers) {
      throw new BadRequestException(`Limite do plano ${org.plan}: máximo ${limits.maxUsers} usuários`);
    }
  }

  async assertCanAddBranch(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findFirst({ where: { id: organizationId } });
    if (!org) return;
    const limits = this.getLimits(org.plan as OrganizationPlan);
    const count = await this.branchRepo.countByOrganization(organizationId);
    if (count >= limits.maxBranches) {
      throw new BadRequestException(`Limite do plano ${org.plan}: máximo ${limits.maxBranches} unidades`);
    }
  }

  async getUsage(organizationId: string) {
    const org = await this.prisma.organization.findFirst({ where: { id: organizationId } });
    if (!org) return null;
    const limits = this.getLimits(org.plan as OrganizationPlan);
    const [userCount, branchCount] = await Promise.all([
      this.prisma.membership.count({ where: { organizationId, deletedAt: null } }),
      this.branchRepo.countByOrganization(organizationId),
    ]);
    return {
      plan: org.plan,
      users: { current: userCount, limit: limits.maxUsers, pct: Math.round((userCount / limits.maxUsers) * 100) },
      branches: { current: branchCount, limit: limits.maxBranches, pct: Math.round((branchCount / limits.maxBranches) * 100) },
      apiCallsMonthlyLimit: limits.apiCallsMonthly,
    };
  }
}
