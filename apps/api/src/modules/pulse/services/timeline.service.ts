import { Injectable } from '@nestjs/common';
import { OracleMetricType } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

export interface TimelineEvent {
  id: string;
  type: 'METRIC' | 'VITAL' | 'BIOSCORE' | 'SYNC' | 'ALERT';
  timestamp: Date;
  title: string;
  value?: string;
  icon?: string;
  source?: string;
}

const METRIC_LABELS: Partial<Record<OracleMetricType, { label: string; unit: string; icon: string }>> = {
  [OracleMetricType.STEPS]: { label: 'passos', unit: 'passos', icon: '👟' },
  [OracleMetricType.HEART_RATE]: { label: 'FC média', unit: 'bpm', icon: '❤️' },
  [OracleMetricType.SLEEP]: { label: 'Sono', unit: 'min', icon: '😴' },
  [OracleMetricType.CALORIES]: { label: 'Calorias', unit: 'kcal', icon: '🔥' },
  [OracleMetricType.WEIGHT]: { label: 'Peso', unit: 'kg', icon: '⚖️' },
  [OracleMetricType.SPO2]: { label: 'SpO₂', unit: '%', icon: '🩸' },
  [OracleMetricType.HRV]: { label: 'HRV', unit: 'ms', icon: '💓' },
  [OracleMetricType.BODY_FAT]: { label: 'Gordura corporal', unit: '%', icon: '📊' },
};

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(
    patientId: string,
    since?: Date,
    until?: Date,
    limit = 50,
  ): Promise<TimelineEvent[]> {
    const end = until ?? new Date();
    const start = since ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();

    const [metricEvents, syncEvents, bioScoreEvents, alertEvents] = await Promise.all([
      this.getMetricEvents(patientId, start, end),
      this.getSyncEvents(patientId, start, end),
      this.getBioScoreEvents(patientId, start, end),
      this.getAlertEvents(patientId, start, end),
    ]);

    const all = [...metricEvents, ...syncEvents, ...bioScoreEvents, ...alertEvents];
    all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return all.slice(0, limit);
  }

  private async getMetricEvents(patientId: string, start: Date, end: Date): Promise<TimelineEvent[]> {
    const records = await this.prisma.normalizedHealthData.findMany({
      where: {
        patientId,
        recordedAt: { gte: start, lte: end },
        isValid: true,
        isDuplicate: false,
        metricType: { in: Object.keys(METRIC_LABELS) as OracleMetricType[] },
      },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });

    // Group by day + metricType and use daily aggregated values
    const grouped = new Map<string, { sum: number; count: number; last: Date; source: string }>();
    for (const r of records) {
      const day = r.recordedAt.toISOString().slice(0, 10);
      const key = `${day}:${r.metricType}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.sum += r.value;
        existing.count++;
      } else {
        grouped.set(key, { sum: r.value, count: 1, last: r.recordedAt, source: r.source });
      }
    }

    const events: TimelineEvent[] = [];
    for (const [key, { sum, count, last, source }] of grouped) {
      const [, metricType] = key.split(':') as [string, OracleMetricType];
      const meta = METRIC_LABELS[metricType];
      if (!meta) continue;

      const displayValue = metricType === OracleMetricType.STEPS
        ? Math.round(sum).toLocaleString('pt-BR')
        : (Math.round((sum / count) * 10) / 10).toLocaleString('pt-BR');

      events.push({
        id: `metric-${key}`,
        type: 'METRIC',
        timestamp: last,
        title: `${meta.label}: ${displayValue} ${meta.unit}`,
        value: `${displayValue} ${meta.unit}`,
        icon: meta.icon,
        source,
      });
    }

    return events;
  }

  private async getSyncEvents(patientId: string, start: Date, end: Date): Promise<TimelineEvent[]> {
    const jobs = await this.prisma.syncJob.findMany({
      where: {
        patientId,
        status: 'COMPLETED',
        completedAt: { gte: start, lte: end },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    return jobs.map((j) => ({
      id: `sync-${j.id}`,
      type: 'SYNC' as const,
      timestamp: j.completedAt!,
      title: `Dados sincronizados: ${j.platform}`,
      value: `${j.normalizedCount} registros`,
      icon: '🔄',
      source: j.platform,
    }));
  }

  private async getBioScoreEvents(patientId: string, start: Date, end: Date): Promise<TimelineEvent[]> {
    const scores = await this.prisma.bioScore.findMany({
      where: { patientId, calculatedAt: { gte: start, lte: end } },
      orderBy: { calculatedAt: 'desc' },
      take: 30,
    });

    return scores.map((s) => ({
      id: `bioscore-${s.id}`,
      type: 'BIOSCORE' as const,
      timestamp: s.calculatedAt,
      title: `Health Score calculado: ${Math.round(s.healthScore)}`,
      value: `${Math.round(s.healthScore)} / 100`,
      icon: '🏥',
    }));
  }

  private async getAlertEvents(patientId: string, start: Date, end: Date): Promise<TimelineEvent[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { patientId, triggeredAt: { gte: start, lte: end } },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
    });

    return alerts.map((a) => ({
      id: `alert-${a.id}`,
      type: 'ALERT' as const,
      timestamp: a.triggeredAt,
      title: a.title,
      value: a.severity,
      icon: a.severity === 'CRITICAL' ? '🚨' : a.severity === 'WARNING' ? '⚠️' : 'ℹ️',
    }));
  }
}
