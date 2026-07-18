import { describe, it, expect } from '@jest/globals';
import {
  evaluateCalibration,
  buildCalibrationBins,
  computeOverallCalibrationScore,
  interpretCalibrationGrade,
} from '../engine/confidence-calibrator.js';

describe('confidence-calibrator', () => {
  describe('evaluateCalibration', () => {
    it('grades as WELL_CALIBRATED when error <= 5%', () => {
      const result = evaluateCalibration(0.9, 0.92);
      expect(result.calibrationGrade).toBe('WELL_CALIBRATED');
      expect(result.calibrationError).toBeLessThanOrEqual(0.05);
    });
    it('grades as OVERCONFIDENT when predicted > actual by more than 5%', () => {
      const result = evaluateCalibration(0.95, 0.72);
      expect(result.calibrationGrade).toBe('OVERCONFIDENT');
    });
    it('grades as UNDERCONFIDENT when actual > predicted by more than 5%', () => {
      const result = evaluateCalibration(0.6, 0.9);
      expect(result.calibrationGrade).toBe('UNDERCONFIDENT');
    });
    it('returns correct calibration error', () => {
      const result = evaluateCalibration(0.8, 0.6);
      expect(result.calibrationError).toBe(0.2);
    });
    it('includes description text', () => {
      const result = evaluateCalibration(0.8, 0.6);
      expect(result.description.length).toBeGreaterThan(0);
    });
    it('description contains percentage values', () => {
      const result = evaluateCalibration(0.8, 0.6);
      expect(result.description).toContain('80%');
      expect(result.description).toContain('60%');
    });
  });

  describe('buildCalibrationBins', () => {
    it('returns empty array for empty samples', () => {
      expect(buildCalibrationBins([])).toHaveLength(0);
    });
    it('builds bins with correct counts', () => {
      const samples = [
        { confidence: 0.95, correct: true },
        { confidence: 0.92, correct: true },
        { confidence: 0.88, correct: false },
        { confidence: 0.1, correct: false },
        { confidence: 0.15, correct: false },
      ];
      const bins = buildCalibrationBins(samples, 10);
      const totalCount = bins.reduce((s, b) => s + b.count, 0);
      expect(totalCount).toBe(samples.length);
    });
    it('each bin has avgConfidence between 0 and 1', () => {
      const samples = [
        { confidence: 0.7, correct: true },
        { confidence: 0.3, correct: false },
      ];
      const bins = buildCalibrationBins(samples);
      for (const b of bins) {
        expect(b.avgConfidence).toBeGreaterThanOrEqual(0);
        expect(b.avgConfidence).toBeLessThanOrEqual(1);
      }
    });
    it('each bin has accuracy between 0 and 1', () => {
      const samples = [
        { confidence: 0.8, correct: true },
        { confidence: 0.75, correct: false },
      ];
      const bins = buildCalibrationBins(samples);
      for (const b of bins) {
        expect(b.accuracy).toBeGreaterThanOrEqual(0);
        expect(b.accuracy).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('computeOverallCalibrationScore', () => {
    it('returns 0/0 for empty samples', () => {
      const result = computeOverallCalibrationScore([]);
      expect(result.predictedConfidence).toBe(0);
      expect(result.actualAccuracy).toBe(0);
    });
    it('returns 1.0 accuracy for all correct predictions', () => {
      const samples = Array(10).fill({ confidence: 0.9, correct: true });
      const result = computeOverallCalibrationScore(samples);
      expect(result.actualAccuracy).toBe(1);
    });
    it('returns 0.0 accuracy for all incorrect predictions', () => {
      const samples = Array(10).fill({ confidence: 0.9, correct: false });
      const result = computeOverallCalibrationScore(samples);
      expect(result.actualAccuracy).toBe(0);
    });
    it('calculates correct average confidence', () => {
      const samples = [
        { confidence: 0.6, correct: true },
        { confidence: 0.8, correct: true },
      ];
      const result = computeOverallCalibrationScore(samples);
      expect(result.predictedConfidence).toBe(0.7);
    });
  });

  describe('interpretCalibrationGrade', () => {
    it('maps WELL_CALIBRATED to Portuguese', () => {
      expect(interpretCalibrationGrade('WELL_CALIBRATED')).toBe('Bem Calibrado');
    });
    it('maps OVERCONFIDENT to Portuguese', () => {
      expect(interpretCalibrationGrade('OVERCONFIDENT')).toBe('Superconfiante');
    });
    it('maps UNDERCONFIDENT to Portuguese', () => {
      expect(interpretCalibrationGrade('UNDERCONFIDENT')).toBe('Subconfiante');
    });
  });
});
