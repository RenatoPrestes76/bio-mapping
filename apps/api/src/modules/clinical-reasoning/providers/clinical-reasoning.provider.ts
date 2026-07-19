import { Injectable } from '@nestjs/common';
import { InferenceResult } from '../entities/inference-result.entity.js';
import { ClinicalCase } from '../entities/clinical-case.entity.js';
import { ReasoningPipeline } from '../pipeline/reasoning-pipeline.js';
import { ReasoningGraph } from '../graph/reasoning-graph.js';

@Injectable()
export class ClinicalReasoningProvider {
  private readonly pipeline = new ReasoningPipeline();
  readonly graph = new ReasoningGraph();
  private readonly store = new Map<string, InferenceResult>();

  analyze(clinicalCase: ClinicalCase): InferenceResult {
    const result = this.pipeline.execute(clinicalCase);
    this.store.set(result.id, result);
    return result;
  }

  getById(inferenceId: string): InferenceResult | undefined {
    return this.store.get(inferenceId);
  }

  getAll(): InferenceResult[] {
    return Array.from(this.store.values());
  }

  deleteById(inferenceId: string): boolean {
    return this.store.delete(inferenceId);
  }

  count(): number {
    return this.store.size;
  }
}
