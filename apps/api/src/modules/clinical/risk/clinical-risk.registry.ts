import { Injectable } from '@nestjs/common';
import { ClinicalRiskModel } from './clinical-risk.types';

export interface RegisterOptions {
  priority?: number;
  enabled?: boolean;
}

export interface RiskModelDescriptor {
  category: string;
  name: string;
  version: string;
  priority: number;
  enabled: boolean;
}

interface RegistryEntry {
  model: ClinicalRiskModel;
  priority: number;
  enabled: boolean;
}

/**
 * Registry de modelos de risco (Sprint 14.3, T4) — mesmo padrão do
 * ScoringService (modules/clinical/scoring): Map por chave + registro
 * dinâmico. Não sabe nada sobre nenhuma doença específica, só armazena e
 * ordena o que foi registrado (Diretriz 8: priority/enabled/version).
 */
@Injectable()
export class ClinicalRiskRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  register(model: ClinicalRiskModel, options: RegisterOptions = {}): void {
    this.entries.set(model.category, {
      model,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
    });
  }

  get(category: string): ClinicalRiskModel | undefined {
    return this.entries.get(category)?.model;
  }

  setEnabled(category: string, enabled: boolean): void {
    const entry = this.entries.get(category);
    if (entry) entry.enabled = enabled;
  }

  /** Modelos habilitados, do maior para o menor priority. */
  listEnabled(): ClinicalRiskModel[] {
    return [...this.entries.values()]
      .filter((entry) => entry.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map((entry) => entry.model);
  }

  list(): RiskModelDescriptor[] {
    return [...this.entries.entries()].map(([category, entry]) => ({
      category,
      name: entry.model.name,
      version: entry.model.version,
      priority: entry.priority,
      enabled: entry.enabled,
    }));
  }
}
