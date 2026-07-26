import type { ClinicalDecisionStrategy } from '../strategies/athena-strategies.js';
import {
  PreventiveStrategy,
  DiagnosticStrategy,
  TherapeuticStrategy,
  MonitoringStrategy,
  LifestyleStrategy,
  EmergencyStrategy,
} from '../strategies/athena-strategies.js';

export class DecisionStrategyRegistry {
  private readonly strategies = new Map<string, ClinicalDecisionStrategy>();

  constructor() {
    this.register(new EmergencyStrategy());
    this.register(new TherapeuticStrategy());
    this.register(new DiagnosticStrategy());
    this.register(new MonitoringStrategy());
    this.register(new PreventiveStrategy());
    this.register(new LifestyleStrategy());
  }

  register(strategy: ClinicalDecisionStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  get(type: string): ClinicalDecisionStrategy | undefined {
    return this.strategies.get(type.toUpperCase());
  }

  getAll(): ClinicalDecisionStrategy[] {
    return [...this.strategies.values()].sort((a, b) => a.priority - b.priority);
  }

  getByPriority(): ClinicalDecisionStrategy[] {
    return this.getAll();
  }

  has(type: string): boolean {
    return this.strategies.has(type.toUpperCase());
  }

  types(): string[] {
    return [...this.strategies.keys()];
  }
}
