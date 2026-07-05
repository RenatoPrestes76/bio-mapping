import { Injectable } from '@nestjs/common';
import type { NormalizedMeasurement } from '../normalizers/dto/normalized-measurement.dto';
import { validateMeasurement } from './physiological-limits';
import type { ValidationResult } from './physiological-limits';

@Injectable()
export class MeasurementValidationService {
  validate(measurement: NormalizedMeasurement): ValidationResult {
    return validateMeasurement(measurement.measurementType, measurement.values);
  }

  hasBlockingIssue(result: ValidationResult): boolean {
    return !result.valid;
  }
}
