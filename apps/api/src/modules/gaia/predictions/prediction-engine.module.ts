import { Module, OnModuleInit } from '@nestjs/common';
import { GaiaModule } from '../gaia.module';
import { DecisionEngineService } from '../decision-engine.service';
import { PredictionRegistry } from './prediction-registry';
import { PredictionEngine } from './prediction-engine';
import { PredictionProvider } from './prediction-provider';
import { LIFESTYLE_TREND_MODEL } from './models/lifestyle-trend.model';

/**
 * Espelha ClinicalRiskModule (Sprint 14.3): importa GaiaModule para acessar
 * ExplainabilityEngine/DecisionEngineService e se auto-registra via
 * onModuleInit — GaiaModule nunca importa nem conhece este módulo (evita
 * acoplar o núcleo do GAIA a cada novo provider/model).
 */
@Module({
  imports: [GaiaModule],
  providers: [PredictionRegistry, PredictionEngine, PredictionProvider],
  exports: [PredictionRegistry, PredictionEngine, PredictionProvider],
})
export class PredictionEngineModule implements OnModuleInit {
  constructor(
    private readonly registry: PredictionRegistry,
    private readonly decisionEngine: DecisionEngineService,
    private readonly predictionProvider: PredictionProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(LIFESTYLE_TREND_MODEL);
    this.decisionEngine.registerProvider(this.predictionProvider);
  }
}
