import { Injectable, NotFoundException } from '@nestjs/common';
import { SportMetricsRepository } from '../repositories/sport-metrics.repository.js';
import type { CreateSportMetricsDto } from '../dto/create-sport-metrics.dto.js';

@Injectable()
export class SportMetricsService {
  constructor(private readonly repo: SportMetricsRepository) {}

  async create(patientId: string, dto: CreateSportMetricsDto) {
    return this.repo.create({
      patientId,
      recordedAt: new Date(dto.recordedAt),
      sport: dto.sport,
      avgPaceSecPerKm: dto.avgPaceSecPerKm,
      maxPaceSecPerKm: dto.maxPaceSecPerKm,
      vo2maxEstimated: dto.vo2maxEstimated,
      weeklyDistanceM: dto.weeklyDistanceM,
      weeklyLoadPoints: dto.weeklyLoadPoints,
      estimatedFtpWatts: dto.estimatedFtpWatts,
      avgCadenceRpm: dto.avgCadenceRpm,
      avgSpeedKph: dto.avgSpeedKph,
      avgPacePer100mSec: dto.avgPacePer100mSec,
      swolf: dto.swolf,
      weeklyVolumeSets: dto.weeklyVolumeSets,
      weeklyTonnageKg: dto.weeklyTonnageKg,
      loadProgressionPct: dto.loadProgressionPct,
      sessionCount: dto.sessionCount,
      activeDays: dto.activeDays,
    });
  }

  async findAll(patientId: string, sport?: string) {
    return this.repo.findAll(patientId, sport);
  }

  async findById(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`SportMetrics ${id} não encontrado`);
    return record;
  }

  async getActiveDaysLastWeek(patientId: string): Promise<number> {
    const records = await this.repo.findRecent(patientId, 7);
    const uniqueDays = new Set(
      records.map((r) => new Date(r.recordedAt).toDateString()),
    );
    return uniqueDays.size;
  }

  async getTotalSessionsLastWeek(patientId: string): Promise<number> {
    const records = await this.repo.findRecent(patientId, 7);
    return records.reduce((sum, r) => sum + (r.sessionCount ?? 1), 0);
  }
}
