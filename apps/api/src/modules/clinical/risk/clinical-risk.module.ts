import { Module, OnModuleInit } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { GaiaModule } from '../../gaia/gaia.module';
import { DecisionEngineService } from '../../gaia/decision-engine.service';
import { ClinicalRiskRegistry } from './clinical-risk.registry';
import { ClinicalRiskEngine } from './clinical-risk-engine';
import { ClinicalRiskProvider } from './clinical-risk.provider';
import { METABOLIC_RISK_MODEL } from './models/metabolic-risk.model';

@Module({
  imports: [ScoringModule, GaiaModule],
  providers: [ClinicalRiskRegistry, ClinicalRiskEngine, ClinicalRiskProvider],
  exports: [ClinicalRiskRegistry, ClinicalRiskEngine, ClinicalRiskProvider],
})
export class ClinicalRiskModule implements OnModuleInit {
  constructor(
    private readonly registry: ClinicalRiskRegistry,
    private readonly decisionEngine: DecisionEngineService,
    private readonly clinicalRiskProvider: ClinicalRiskProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(METABOLIC_RISK_MODEL);
    this.decisionEngine.registerProvider(this.clinicalRiskProvider);
  }
}
