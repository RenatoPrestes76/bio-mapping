import type { CohortFilterDefinition } from '../engine/cohort-builder.js';

export interface CreateCohortDto {
  tenantId?: string;
  name: string;
  description?: string;
  segment?: string;
  filters: CohortFilterDefinition[];
}

export interface UpdateCohortDto {
  name?: string;
  description?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  filters?: CohortFilterDefinition[];
}

export interface CompareCohortsDto {
  cohortAId: string;
  cohortBId: string;
}

export interface PopulationQueryDto {
  tenantId: string;
  cohortId?: string;
  periodStart?: string;
  periodEnd?: string;
}
