import { describe, it, expect } from '@jest/globals';
import {
  evaluateFilter,
  evaluateCohortFilters,
  countMatchingPatients,
  segmentPatient,
  groupBySegment,
  type PatientRecord,
  type CohortFilterDefinition,
} from '../engine/cohort-builder.js';

const base: PatientRecord = {
  age: 45, sex: 'MALE', bmi: 27, smoking: false, alcohol: 'MODERATE',
  lifestyle: 'SEDENTARY', conditions: [], familyHistory: [], medications: [], riskLevel: 'LOW',
};

describe('cohort-builder', () => {
  describe('evaluateFilter', () => {
    it('eq matches equal value', () => {
      expect(evaluateFilter({ age: 45 }, { filterKey: 'age', filterOperator: 'eq', filterValue: '45' })).toBe(true);
    });

    it('eq fails on different value', () => {
      expect(evaluateFilter({ age: 30 }, { filterKey: 'age', filterOperator: 'eq', filterValue: '45' })).toBe(false);
    });

    it('neq matches when not equal', () => {
      expect(evaluateFilter({ sex: 'MALE' }, { filterKey: 'sex', filterOperator: 'neq', filterValue: '"FEMALE"' })).toBe(true);
    });

    it('gt passes when patient value greater', () => {
      expect(evaluateFilter({ age: 50 }, { filterKey: 'age', filterOperator: 'gt', filterValue: '40' })).toBe(true);
    });

    it('gt fails when patient value equal', () => {
      expect(evaluateFilter({ age: 40 }, { filterKey: 'age', filterOperator: 'gt', filterValue: '40' })).toBe(false);
    });

    it('gte passes when equal', () => {
      expect(evaluateFilter({ bmi: 30 }, { filterKey: 'bmi', filterOperator: 'gte', filterValue: '30' })).toBe(true);
    });

    it('lt passes when patient value lower', () => {
      expect(evaluateFilter({ bmi: 25 }, { filterKey: 'bmi', filterOperator: 'lt', filterValue: '30' })).toBe(true);
    });

    it('lte passes when equal', () => {
      expect(evaluateFilter({ age: 65 }, { filterKey: 'age', filterOperator: 'lte', filterValue: '65' })).toBe(true);
    });

    it('in matches array membership', () => {
      expect(evaluateFilter({ riskLevel: 'HIGH' }, { filterKey: 'riskLevel', filterOperator: 'in', filterValue: '["HIGH","VERY_HIGH"]' })).toBe(true);
    });

    it('in fails when not in array', () => {
      expect(evaluateFilter({ riskLevel: 'LOW' }, { filterKey: 'riskLevel', filterOperator: 'in', filterValue: '["HIGH","VERY_HIGH"]' })).toBe(false);
    });

    it('not_in passes when not in array', () => {
      expect(evaluateFilter({ riskLevel: 'LOW' }, { filterKey: 'riskLevel', filterOperator: 'not_in', filterValue: '["HIGH","CRITICAL"]' })).toBe(true);
    });

    it('contains passes when array includes value', () => {
      expect(evaluateFilter({ conditions: ['diabetes', 'hypertension'] }, { filterKey: 'conditions', filterOperator: 'contains', filterValue: 'diabetes' })).toBe(true);
    });

    it('contains fails when array does not include value', () => {
      expect(evaluateFilter({ conditions: ['obesity'] }, { filterKey: 'conditions', filterOperator: 'contains', filterValue: 'diabetes' })).toBe(false);
    });

    it('unknown operator returns false', () => {
      expect(evaluateFilter({ age: 45 }, { filterKey: 'age', filterOperator: 'BETWEEN' as any, filterValue: '40' })).toBe(false);
    });
  });

  describe('evaluateCohortFilters', () => {
    it('returns true when all filters pass', () => {
      const filters: CohortFilterDefinition[] = [
        { filterKey: 'age', filterOperator: 'gte', filterValue: '40' },
        { filterKey: 'bmi', filterOperator: 'gt', filterValue: '25' },
      ];
      expect(evaluateCohortFilters({ age: 45, bmi: 27 }, filters)).toBe(true);
    });

    it('returns false when any filter fails', () => {
      const filters: CohortFilterDefinition[] = [
        { filterKey: 'age', filterOperator: 'gte', filterValue: '40' },
        { filterKey: 'bmi', filterOperator: 'lt', filterValue: '25' },
      ];
      expect(evaluateCohortFilters({ age: 45, bmi: 27 }, filters)).toBe(false);
    });

    it('returns true for empty filter list', () => {
      expect(evaluateCohortFilters(base, [])).toBe(true);
    });
  });

  describe('countMatchingPatients', () => {
    const patients: PatientRecord[] = [
      { age: 50, bmi: 30 }, { age: 35, bmi: 22 }, { age: 60, bmi: 28 },
    ];

    it('counts patients matching age filter', () => {
      const filters: CohortFilterDefinition[] = [{ filterKey: 'age', filterOperator: 'gte', filterValue: '40' }];
      expect(countMatchingPatients(patients, filters)).toBe(2);
    });

    it('returns all when no filters', () => {
      expect(countMatchingPatients(patients, [])).toBe(3);
    });

    it('returns 0 when none match', () => {
      const filters: CohortFilterDefinition[] = [{ filterKey: 'age', filterOperator: 'gt', filterValue: '100' }];
      expect(countMatchingPatients(patients, filters)).toBe(0);
    });
  });

  describe('segmentPatient', () => {
    it('returns SENIOR for age >= 65', () => {
      expect(segmentPatient({ ...base, age: 65 })).toBe('SENIOR');
    });

    it('returns CARDIOMETABOLIC for diabetes', () => {
      expect(segmentPatient({ ...base, conditions: ['diabetes'] })).toBe('CARDIOMETABOLIC');
    });

    it('returns ONCOLOGY for cancer condition', () => {
      expect(segmentPatient({ ...base, conditions: ['lung cancer'] })).toBe('ONCOLOGY');
    });

    it('returns MENTAL_HEALTH for depression', () => {
      expect(segmentPatient({ ...base, conditions: ['depression'] })).toBe('MENTAL_HEALTH');
    });

    it('returns CHRONIC_DISEASES for unspecified condition', () => {
      expect(segmentPatient({ ...base, conditions: ['arthritis'] })).toBe('CHRONIC_DISEASES');
    });

    it('returns AT_RISK for HIGH riskLevel with no conditions', () => {
      expect(segmentPatient({ ...base, conditions: [], riskLevel: 'HIGH' })).toBe('AT_RISK');
    });

    it('returns WOMENS_HEALTH for FEMALE with no conditions', () => {
      expect(segmentPatient({ ...base, sex: 'FEMALE', conditions: [], riskLevel: 'LOW' })).toBe('WOMENS_HEALTH');
    });

    it('returns HEALTHY as default', () => {
      expect(segmentPatient({ ...base, conditions: [], riskLevel: 'LOW' })).toBe('HEALTHY');
    });

    it('SENIOR takes priority over CARDIOMETABOLIC', () => {
      expect(segmentPatient({ age: 70, conditions: ['diabetes'], riskLevel: 'HIGH' })).toBe('SENIOR');
    });
  });

  describe('groupBySegment', () => {
    it('distributes patients into segments', () => {
      const patients: PatientRecord[] = [
        { age: 70 },
        { conditions: ['diabetes'] },
        { conditions: [], riskLevel: 'LOW' },
      ];
      const groups = groupBySegment(patients);
      expect(groups.SENIOR).toHaveLength(1);
      expect(groups.CARDIOMETABOLIC).toHaveLength(1);
      expect(groups.HEALTHY).toHaveLength(1);
    });

    it('each segment is an array', () => {
      const groups = groupBySegment([]);
      for (const key of Object.keys(groups)) {
        expect(Array.isArray(groups[key as keyof typeof groups])).toBe(true);
      }
    });
  });
});
