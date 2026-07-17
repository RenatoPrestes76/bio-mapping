import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { BranchService } from '../services/branch.service.js';

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  createBranch(
    @CurrentUser() user: { sub: string },
    @Body() body: {
      organizationId: string;
      name: string;
      address?: string;
      phone?: string;
      city?: string;
      state?: string;
    },
  ) {
    return this.branchService.createBranch(user.sub, body);
  }

  @Get()
  listBranches(@Query('organizationId') organizationId: string) {
    return this.branchService.listBranches(organizationId);
  }

  @Get(':id')
  getBranch(@Param('id') id: string) {
    return this.branchService.getBranch(id);
  }

  @Patch(':id')
  updateBranch(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { name?: string; address?: string; phone?: string; city?: string; state?: string; isActive?: boolean },
  ) {
    return this.branchService.updateBranch(id, user.sub, body);
  }

  @Delete(':id')
  deleteBranch(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.branchService.deleteBranch(id, user.sub);
  }
}
