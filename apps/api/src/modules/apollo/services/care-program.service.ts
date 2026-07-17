import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgramCategory, ProgramStatus } from '@bio/database';
import { CareProgramRepository } from '../repositories/care-program.repository.js';

@Injectable()
export class CareProgramService {
  constructor(private readonly repo: CareProgramRepository) {}

  async createProgram(data: {
    name: string;
    description?: string;
    category: ProgramCategory;
    durationDays?: number;
    objectives?: string[];
    completionCriteria?: string;
    organizationId?: string;
    createdBy: string;
    isTemplate?: boolean;
  }) {
    return this.repo.create({ ...data, status: ProgramStatus.DRAFT } as Parameters<typeof this.repo.create>[0]);
  }

  async listPrograms(filters: { category?: ProgramCategory; status?: ProgramStatus; organizationId?: string } = {}) {
    return this.repo.findAll(filters);
  }

  async getProgram(id: string) {
    const program = await this.repo.findById(id);
    if (!program) throw new NotFoundException(`Program ${id} not found`);
    return program;
  }

  async updateProgram(id: string, data: Partial<{
    name: string;
    description: string;
    status: ProgramStatus;
    durationDays: number;
    objectives: string[];
    completionCriteria: string;
  }>) {
    await this.getProgram(id);
    return this.repo.update(id, data);
  }

  async deleteProgram(id: string) {
    await this.getProgram(id);
    return this.repo.softDelete(id);
  }

  async addPhase(programId: string, data: {
    name: string;
    description?: string;
    order: number;
    durationDays?: number;
    objectives?: string[];
  }) {
    await this.getProgram(programId);
    return this.repo.addPhase(programId, data);
  }
}
