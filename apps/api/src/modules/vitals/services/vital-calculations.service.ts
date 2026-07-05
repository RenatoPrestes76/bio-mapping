import { Injectable } from '@nestjs/common';
import {
  BmiClassification,
  BloodPressureClassification,
  GlucoseClassification,
  calculateBmi,
  calculateWaistHipRatio,
  classifyBmi,
  classifyBloodPressure,
  classifyBloodGlucose,
} from '../calculators/vital-calculators';

@Injectable()
export class VitalCalculationsService {
  calculateBmi(weightKg: number, heightCm: number): number {
    return calculateBmi(weightKg, heightCm);
  }

  classifyBmi(bmi: number): BmiClassification {
    return classifyBmi(bmi);
  }

  calculateWaistHipRatio(waistCm: number, hipCm: number): number {
    return calculateWaistHipRatio(waistCm, hipCm);
  }

  classifyBloodPressure(
    systolic: number,
    diastolic: number,
  ): BloodPressureClassification {
    return classifyBloodPressure(systolic, diastolic);
  }

  classifyBloodGlucose(glucoseMgDl: number): GlucoseClassification {
    return classifyBloodGlucose(glucoseMgDl);
  }
}
