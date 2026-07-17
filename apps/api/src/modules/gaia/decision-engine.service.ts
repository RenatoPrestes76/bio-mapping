import { Injectable, Logger } from '@nestjs/common';
import { ClinicalContextBuilder } from './clinical-context.builder';
import { DecisionEngineResult, DecisionProvider, ProviderRunResult } from './contracts';

export interface RunPipelineOptions {
  providers?: string[];
  windowDays?: number;
}

/**
 * Registry + orquestrador central (Sprint 14.1). Mesmo padrão do ScoringService
 * (modules/clinical/scoring): um Map<string, Provider> e um método que
 * despacha para os providers registrados — o engine nunca conhece detalhes
 * internos de nenhum provider, só o contrato DecisionProvider.
 */
@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly providers = new Map<string, DecisionProvider>();

  constructor(private readonly contextBuilder: ClinicalContextBuilder) {}

  registerProvider(provider: DecisionProvider): void {
    this.providers.set(provider.name, provider);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async runPipeline(patientId: string, options: RunPipelineOptions = {}): Promise<DecisionEngineResult> {
    const context = await this.contextBuilder.build(patientId, options.windowDays);

    const candidateNames = options.providers ?? this.listProviders();
    const results: ProviderRunResult[] = [];
    const providersRun: string[] = [];

    for (const name of candidateNames) {
      const provider = this.providers.get(name);
      if (!provider) {
        this.logger.warn(`Decision provider "${name}" is not registered — skipping`);
        continue;
      }
      if (!provider.supports(context)) {
        continue;
      }

      const insights = await provider.generateInsights(context);
      const recommendations = await provider.generateRecommendations(context, insights);
      const predictions = await provider.generatePredictions(context);

      results.push({ provider: provider.name, insights, recommendations, predictions });
      providersRun.push(provider.name);
    }

    return {
      patientId,
      generatedAt: new Date(),
      providersRun,
      results,
    };
  }
}
