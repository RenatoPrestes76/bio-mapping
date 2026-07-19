export interface ReasoningStepData {
  id: string;
  strategyName: string;
  description: string;
  confidence: number;
  duration: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt?: Date;
}

export class ReasoningStep {
  readonly id: string;
  readonly strategyName: string;
  readonly description: string;
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
  readonly confidence: number;
  readonly duration: number;
  readonly createdAt: Date;

  constructor(data: ReasoningStepData) {
    this.id = data.id;
    this.strategyName = data.strategyName;
    this.description = data.description;
    this.input = data.input ?? {};
    this.output = data.output ?? {};
    this.confidence = Math.min(1, Math.max(0, data.confidence));
    this.duration = Math.max(0, data.duration);
    this.createdAt = data.createdAt ?? new Date();
  }
}
