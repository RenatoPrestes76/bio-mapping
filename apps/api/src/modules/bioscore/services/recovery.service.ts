import { Injectable } from '@nestjs/common';
import { computeRecoveryScore } from '@bio/bioscore-engine';
import { RecoveryRepository } from '../repositories/recovery.repository.js';

export interface RecoveryComputeInput {
  patientId: string;
  sleepEfficiency?: number;
  sleepHours?: number;
  hrv?: number;
  hrvBaseline?: number;
  restingHr?: number;
  restingHrBaseline?: number;
  acuteLoad?: number;
  chronicLoad?: number;
}

@Injectable()
export class RecoveryService {
  constructor(private readonly repo: RecoveryRepository) {}

  async compute(input: RecoveryComputeInput) {
    const result = computeRecoveryScore({
      sleepEfficiency: input.sleepEfficiency,
      sleepHours: input.sleepHours,
      hrv: input.hrv,
      hrvBaseline: input.hrvBaseline,
      restingHr: input.restingHr,
      restingHrBaseline: input.restingHrBaseline,
      acuteLoad: input.acuteLoad,
      chronicLoad: input.chronicLoad,
    });

    const tsb = input.acuteLoad != null && input.chronicLoad != null
      ? input.chronicLoad - input.acuteLoad
      : undefined;

    const saved = await this.repo.create({
      patientId: input.patientId,
      recordedAt: new Date(),
      recoveryScore: result.recoveryScore,
      sleepScore: result.sleepScore,
      hrvScore: result.hrvScore,
      hrScore: result.hrScore,
      trainingLoadScore: result.trainingLoadScore,
      acuteLoad: input.acuteLoad,
      chronicLoad: input.chronicLoad,
      trainingStressBalance: tsb,
      recommendation: result.recommendation,
    });

    return saved;
  }

  async findLatest(patientId: string) {
    return this.repo.findLatest(patientId);
  }

  async findAll(patientId: string) {
    return this.repo.findAll(patientId);
  }

  async getRecentScores(patientId: string, days: number): Promise<number[]> {
    const records = await this.repo.findRecent(patientId, days);
    return records.map((r) => r.recoveryScore);
  }
}
