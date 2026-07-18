import { Injectable } from '@nestjs/common';
import { PredictionModel, PredictionType } from './prediction.types';

export interface RegisterOptions {
  priority?: number;
  enabled?: boolean;
}

export interface PredictionModelDescriptor {
  name: string;
  predictionType: PredictionType;
  version: string;
  priority: number;
  enabled: boolean;
}

interface RegistryEntry {
  model: PredictionModel;
  priority: number;
  enabled: boolean;
}

/**
 * Registry de modelos de previsão (Sprint 14.5, P4) — mesmo padrão do
 * ClinicalRiskRegistry, chaveado por `model.name` (não por `predictionType`,
 * já que vários modelos podem compartilhar o mesmo tipo — ex: futuros
 * weight-trend/sleep-trend seriam todos TREND). Não sabe nada sobre nenhum
 * modelo específico, só armazena e ordena o que foi registrado.
 */
@Injectable()
export class PredictionRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  register(model: PredictionModel, options: RegisterOptions = {}): void {
    this.entries.set(model.name, {
      model,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
    });
  }

  get(name: string): PredictionModel | undefined {
    return this.entries.get(name)?.model;
  }

  setEnabled(name: string, enabled: boolean): void {
    const entry = this.entries.get(name);
    if (entry) entry.enabled = enabled;
  }

  /** Modelos habilitados, do maior para o menor priority. */
  listEnabled(): PredictionModel[] {
    return [...this.entries.values()]
      .filter((entry) => entry.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map((entry) => entry.model);
  }

  list(): PredictionModelDescriptor[] {
    return [...this.entries.entries()].map(([name, entry]) => ({
      name,
      predictionType: entry.model.predictionType,
      version: entry.model.version,
      priority: entry.priority,
      enabled: entry.enabled,
    }));
  }
}
