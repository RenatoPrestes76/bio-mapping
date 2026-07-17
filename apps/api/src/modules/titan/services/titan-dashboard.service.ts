import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';
import { BranchRepository } from '../repositories/branch.repository.js';
import { PlanLimitsService } from './plan-limits.service.js';

@Injectable()
export class TitanDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchRepo: BranchRepository,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async getDashboard(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalMembers,
      activeMembers,
      branches,
      recentAuditEvents,
      orgEnrollments,
      planUsage,
    ] = await Promise.all([
      this.prisma.membership.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.membership.count({ where: { organizationId, deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
      this.branchRepo.findByOrganization(organizationId),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.getEnrollmentMetrics(organizationId),
      this.planLimits.getUsage(organizationId),
    ]);

    const activeBranchCount = branches.filter((b) => b.isActive).length;

    const roleDistribution = await this.getRoleDistribution(organizationId);

    const alerts = this.buildAlerts(planUsage, activeBranchCount);

    return {
      summary: {
        totalMembers,
        activeMembers,
        totalBranches: branches.length,
        activeBranches: activeBranchCount,
      },
      enrollment: orgEnrollments,
      roleDistribution,
      branches: branches.slice(0, 5),
      recentAuditEvents,
      planUsage,
      alerts,
      generatedAt: new Date(),
    };
  }

  private async getEnrollmentMetrics(organizationId: string) {
    const orgPrograms = await this.prisma.careProgram.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, name: true, category: true },
    });
    const programIds = orgPrograms.map((p) => p.id);
    if (!programIds.length) return { total: 0, active: 0, completed: 0, avgAdherence: 0, programs: [] };

    const [total, active, completed, enrollments] = await Promise.all([
      this.prisma.programEnrollment.count({ where: { programId: { in: programIds } } }),
      this.prisma.programEnrollment.count({ where: { programId: { in: programIds }, status: EnrollmentStatus.ACTIVE } }),
      this.prisma.programEnrollment.count({ where: { programId: { in: programIds }, status: EnrollmentStatus.COMPLETED } }),
      this.prisma.programEnrollment.findMany({
        where: { programId: { in: programIds }, status: EnrollmentStatus.ACTIVE },
        select: { adherencePct: true },
      }),
    ]);

    const avgAdherence = enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.adherencePct ?? 0), 0) / enrollments.length)
      : 0;

    return { total, active, completed, avgAdherence, programs: orgPrograms };
  }

  private async getRoleDistribution(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, deletedAt: null },
      select: { role: true },
    });
    const dist: Record<string, number> = {};
    for (const m of memberships) {
      dist[m.role] = (dist[m.role] ?? 0) + 1;
    }
    return dist;
  }

  private buildAlerts(planUsage: Awaited<ReturnType<PlanLimitsService['getUsage']>>, activeBranches: number) {
    if (!planUsage) return [];
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    if (planUsage.users.pct >= 90) {
      alerts.push({ type: 'PLAN_USER_LIMIT', message: `Uso de usuários em ${planUsage.users.pct}% do limite`, severity: 'HIGH' });
    } else if (planUsage.users.pct >= 75) {
      alerts.push({ type: 'PLAN_USER_LIMIT', message: `Uso de usuários em ${planUsage.users.pct}% do limite`, severity: 'MEDIUM' });
    }

    if (planUsage.branches.pct >= 90) {
      alerts.push({ type: 'PLAN_BRANCH_LIMIT', message: `Uso de unidades em ${planUsage.branches.pct}% do limite`, severity: 'HIGH' });
    }

    if (activeBranches === 0 && planUsage.branches.limit > 1) {
      alerts.push({ type: 'NO_ACTIVE_BRANCHES', message: 'Nenhuma unidade ativa', severity: 'LOW' });
    }

    return alerts;
  }
}
