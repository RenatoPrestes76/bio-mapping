import { OmicsType } from '../entities/omics-profile.entity.js';
import { OmicsDataset } from '../entities/omics-dataset.entity.js';
import {
  NormalizationMethod,
  NormalizedDataset,
  RECOMMENDED_METHOD,
  applyMethod,
  computeStats,
} from '../normalization/normalization-methods.js';

export interface NormalizationValidation {
  isValid: boolean;
  variableCount: number;
  hasInfiniteValues: boolean;
  hasNaNValues: boolean;
  valueRange: { min: number; max: number };
  warnings: string[];
}

export class OmicsNormalizationEngine {
  normalize(
    dataset: OmicsDataset,
    omicsType: OmicsType,
    method?: NormalizationMethod,
  ): NormalizedDataset {
    const chosenMethod = method === 'AUTO' || !method
      ? RECOMMENDED_METHOD[omicsType]
      : method;

    const keys = Object.keys(dataset.measurements);
    const values = Object.values(dataset.measurements);

    const originalStats = computeStats(values);
    const normalizedValues = applyMethod(values, chosenMethod);

    const normalized: Record<string, number> = {};
    keys.forEach((key, i) => {
      normalized[key] = normalizedValues[i];
    });

    return {
      id: `norm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      datasetId: dataset.id,
      profileId: dataset.profileId,
      omicsType,
      method: chosenMethod,
      normalizedValues: normalized,
      originalStats,
      normalizedAt: new Date(),
    };
  }

  getRecommendedMethod(omicsType: OmicsType): NormalizationMethod {
    return RECOMMENDED_METHOD[omicsType] ?? 'Z_SCORE';
  }

  validateNormalization(normalized: NormalizedDataset): NormalizationValidation {
    const values = Object.values(normalized.normalizedValues);
    const warnings: string[] = [];

    const hasInfinite = values.some((v) => !isFinite(v));
    const hasNaN = values.some((v) => isNaN(v));
    const finiteValues = values.filter((v) => isFinite(v) && !isNaN(v));

    let min = 0;
    let max = 0;
    if (finiteValues.length > 0) {
      min = finiteValues.reduce((a, b) => Math.min(a, b), finiteValues[0]);
      max = finiteValues.reduce((a, b) => Math.max(a, b), finiteValues[0]);
    }

    if (hasInfinite) warnings.push('Normalized dataset contains infinite values — check input for zero-division');
    if (hasNaN) warnings.push('Normalized dataset contains NaN values — check input measurements');
    if (values.length === 0) warnings.push('Empty dataset — no variables to normalize');
    if (min === max && values.length > 1) warnings.push('All normalized values are identical — low variance in input');

    return {
      isValid: !hasInfinite && !hasNaN && values.length > 0,
      variableCount: values.length,
      hasInfiniteValues: hasInfinite,
      hasNaNValues: hasNaN,
      valueRange: { min, max },
      warnings,
    };
  }
}
