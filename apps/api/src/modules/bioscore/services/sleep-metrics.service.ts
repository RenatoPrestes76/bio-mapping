import { Injectable, NotFoundException } from '@nestjs/common';
import { computeSleepMetrics } from '@bio/bioscore-engine';
import { SleepMetricsRepository } from '../repositories/sleep-metrics.repository.js';
import type { CreateSleepMetricsDto } from '../dto/create-sleep-metrics.dto.js';

@Injectable()
export class SleepMetricsService {
  constructor(private readonly repo: SleepMetricsRepository) {}

  async create(patientId: string, dto: CreateSleepMetricsDto) {
    const date = new Date(dto.date);
    const bedtime = dto.bedtime ? new Date(dto.bedtime) : undefined;
    const wakeTime = dto.wakeTime ? new Date(dto.wakeTime) : undefined;

    const recent = await this.repo.findRecent(patientId, 7);
    const recentNightsMinutes = recent.map((r) => r.totalMinutes ?? 0);

    const result = computeSleepMetrics({
      totalMinutes: dto.totalMinutes,
      deepMinutes: dto.deepMinutes,
      remMinutes: dto.remMinutes,
      awakeMinutes: dto.awakeMinutes,
      bedtime,
      wakeTime,
      recentNightsMinutes,
    });

    return this.repo.upsert({
      patientId,
      date,
      bedtime,
      wakeTime,
      totalMinutes: dto.totalMinutes,
      deepMinutes: dto.deepMinutes,
      remMinutes: dto.remMinutes,
      lightMinutes: dto.lightMinutes,
      awakeMinutes: dto.awakeMinutes,
      efficiency: result.efficiency,
      sleepDebtMin: result.sleepDebtMin,
      classification: result.classification,
      source: dto.source ?? 'MANUAL',
      score: result.score,
    });
  }

  async findAll(patientId: string) {
    return this.repo.findAll(patientId);
  }

  async findById(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException(`SleepMetrics ${id} não encontrado`);
    return record;
  }

  async update(id: string, patientId: string, dto: CreateSleepMetricsDto) {
    await this.findById(id);
    return this.create(patientId, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  async getRecentScores(patientId: string, days: number): Promise<number[]> {
    const records = await this.repo.findRecent(patientId, days);
    return records.map((r) => r.score ?? 50);
  }

  async getRecentHours(patientId: string, days: number): Promise<number[]> {
    const records = await this.repo.findRecent(patientId, days);
    return records.map((r) => (r.totalMinutes ?? 0) / 60);
  }
}
