import { Injectable, Logger } from '@nestjs/common';
import { ClinicalContextBuilder } from './clinical-context.builder';
import { ExplainabilityEngine } from './explainability/explainability-engine';
import { RecommendationEngine } from './recommendations/recommendation-engine';
import { DecisionEngineResult, DecisionProvider, ExecutionStatus, ProviderRunResult } from './contracts';

export interface RunPipelineOptions {
  providers?: string[];
  windowDays?: number;
}

interface TimedCall<T> {
  result: T;
  ok: boolean;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * Registry + orquestrador central (Sprint 14.1). Mesmo padrão do ScoringService
 * (modules/clinical/scoring): um Map<string, Provider> e um método que
 * despacha para os providers registrados — o engine nunca conhece detalhes
 * internos de nenhum provider, só o contrato DecisionProvider.
 *
 * Sprint 14.2: cada execução vira um DecisionTrace auditável e um Provenance
 * por provider. Uma exceção de um provider não derruba mais o pipeline
 * inteiro — fica contida e registrada como FAILED/PARTIAL no trace.
 */
@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly providers = new Map<string, DecisionProvider>();

  constructor(
    private readonly contextBuilder: ClinicalContextBuilder,
    private readonly explainabilityEngine: ExplainabilityEngine,
    private readonly recommendationEngine: RecommendationEngine,
  ) {}

  registerProvider(provider: DecisionProvider): void {
    this.providers.set(provider.name, provider);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async runPipeline(patientId: string, options: RunPipelineOptions = {}): Promise<DecisionEngineResult> {
    const traceBuilder = this.explainabilityEngine.startTrace(patientId);
    const correlationId = traceBuilder.getTraceId();

    const contextStart = new Date();
    const context = await this.contextBuilder.build(patientId, options.windowDays);
    traceBuilder.recordStep('CLINICAL_CONTEXT', contextStart, new Date(), 'SUCCESS');

    const decisionStart = new Date();
    const candidateNames = options.providers ?? this.listProviders();
    const toRun = candidateNames
      .map((name) => this.providers.get(name))
      .filter((provider): provider is DecisionProvider => !!provider && provider.supports(context));
    traceBuilder.recordStep(
      'DECISION_ENGINE',
      decisionStart,
      new Date(),
      'SUCCESS',
      `${toRun.length}/${candidateNames.length} providers selected`,
    );

    const results: ProviderRunResult[] = [];
    const providersRun: string[] = [];

    for (const provider of toRun) {
      const executionId = `${correlationId}:${provider.name}`;
      const providerStart = new Date();

      const insightsCall = await this.timed(() => provider.generateInsights(context), provider.name, 'generateInsights');
      traceBuilder.recordStep(
        'PROVIDER',
        insightsCall.startedAt,
        insightsCall.finishedAt,
        insightsCall.ok ? 'SUCCESS' : 'FAILED',
        `${provider.name}:generateInsights`,
      );

      const recommendationsCall = await this.timed(
        () => provider.generateRecommendations(context, insightsCall.result),
        provider.name,
        'generateRecommendations',
      );
      traceBuilder.recordStep(
        'RECOMMENDATION',
        recommendationsCall.startedAt,
        recommendationsCall.finishedAt,
        recommendationsCall.ok ? 'SUCCESS' : 'FAILED',
        `${provider.name}:generateRecommendations`,
      );

      const predictionsCall = await this.timed(
        () => provider.generatePredictions(context),
        provider.name,
        'generatePredictions',
      );
      traceBuilder.recordStep(
        'PROVIDER',
        predictionsCall.startedAt,
        predictionsCall.finishedAt,
        predictionsCall.ok ? 'SUCCESS' : 'FAILED',
        `${provider.name}:generatePredictions`,
      );

      const providerEnd = new Date();
      const successCount = [insightsCall.ok, recommendationsCall.ok, predictionsCall.ok].filter(Boolean).length;
      const executionStatus: ExecutionStatus =
        successCount === 3 ? 'SUCCESS' : successCount === 0 ? 'FAILED' : 'PARTIAL';

      const provenance = this.explainabilityEngine.buildProvenance({
        providerName: provider.name,
        providerVersion: provider.version,
        correlationId,
        executionId,
        executionTimeMs: providerEnd.getTime() - providerStart.getTime(),
        executionStatus,
      });
      traceBuilder.recordStep('EXPLAINABILITY', providerEnd, new Date(), executionStatus, provider.name);

      results.push({
        provider: provider.name,
        provenance,
        insights: insightsCall.result,
        recommendations: recommendationsCall.result,
        predictions: predictionsCall.result,
      });
      providersRun.push(provider.name);
    }

    const allCandidates = results.flatMap((r) => r.recommendations);
    const recommendationSet = this.recommendationEngine.consolidate(allCandidates, context);

    return {
      patientId,
      generatedAt: new Date(),
      providersRun,
      results,
      trace: traceBuilder.build(),
      recommendationSet,
    };
  }

  private async timed<T>(
    fn: () => Promise<T[]>,
    providerName: string,
    stepName: string,
  ): Promise<TimedCall<T[]>> {
    const startedAt = new Date();
    try {
      const result = await fn();
      return { result, ok: true, startedAt, finishedAt: new Date() };
    } catch (error) {
      this.logger.error(`${stepName} failed for provider "${providerName}"`, error as Error);
      return { result: [], ok: false, startedAt, finishedAt: new Date() };
    }
  }
}
