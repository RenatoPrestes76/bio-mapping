export type TrendClassification = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'OSCILLATING' | 'INSUFFICIENT_DATA';
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT';

export interface TrendDataPoint {
  date: Date;
  value: number;
  eventId: string;
}

export interface TrendExplanation {
  eventsConsidered: number;
  periodStart: Date;
  periodEnd: Date;
  influencingFactors: string[];
  confidence: number;
  reasoning: string;
}

export class BiomarkerTrend {
  readonly id: string;
  readonly marker: string;
  readonly unit: string;
  readonly firstValue: number;
  readonly lastValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly variation: number;
  readonly variationPercent: number;
  readonly direction: TrendDirection;
  readonly classification: TrendClassification;
  readonly confidence: number;
  readonly dataPoints: TrendDataPoint[];
  readonly explanation: TrendExplanation;
  readonly normalRange?: { low: number; high: number };
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    marker: string;
    unit?: string;
    firstValue: number;
    lastValue: number;
    minValue: number;
    maxValue: number;
    variation: number;
    variationPercent: number;
    direction: TrendDirection;
    classification: TrendClassification;
    confidence: number;
    dataPoints: TrendDataPoint[];
    explanation: TrendExplanation;
    normalRange?: { low: number; high: number };
  }) {
    this.id = params.id ?? `trend-${params.marker}-${Date.now()}`;
    this.marker = params.marker;
    this.unit = params.unit ?? '';
    this.firstValue = params.firstValue;
    this.lastValue = params.lastValue;
    this.minValue = params.minValue;
    this.maxValue = params.maxValue;
    this.variation = params.variation;
    this.variationPercent = params.variationPercent;
    this.direction = params.direction;
    this.classification = params.classification;
    this.confidence = Math.max(0, Math.min(1, params.confidence));
    this.dataPoints = params.dataPoints;
    this.explanation = params.explanation;
    this.normalRange = params.normalRange;
    this.generatedAt = new Date();
  }

  isImproving(): boolean {
    return this.classification === 'IMPROVING';
  }

  isWorsening(): boolean {
    return this.classification === 'WORSENING';
  }

  isWithinNormalRange(value?: number): boolean {
    if (!this.normalRange) return true;
    const v = value ?? this.lastValue;
    return v >= this.normalRange.low && v <= this.normalRange.high;
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.7;
  }

  getAbsoluteChange(): number {
    return Math.abs(this.variation);
  }

  getSummary(): string {
    const dir = this.direction === 'UP' ? '↑' : this.direction === 'DOWN' ? '↓' : '→';
    return `${this.marker}: ${this.firstValue} → ${this.lastValue} ${this.unit} ${dir} (${this.classification})`;
  }
}
