export interface OmicsDatasetData {
  id?: string;
  profileId: string;
  datasetType?: string;
  variables?: string[];
  measurements: Record<string, number>;
  units?: Record<string, string>;
  collectionDate?: Date;
  processingMethod?: string;
  createdAt?: Date;
}

export class OmicsDataset {
  readonly id: string;
  readonly profileId: string;
  readonly datasetType: string;
  readonly variables: string[];
  readonly measurements: Record<string, number>;
  readonly units: Record<string, string>;
  readonly collectionDate: Date;
  readonly processingMethod: string;
  readonly createdAt: Date;

  constructor(data: OmicsDatasetData) {
    this.id = data.id ?? `dataset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.profileId = data.profileId;
    this.datasetType = data.datasetType ?? 'GENERIC';
    this.measurements = data.measurements;
    this.variables = data.variables ?? Object.keys(data.measurements);
    this.units = data.units ?? {};
    this.collectionDate = data.collectionDate ?? new Date();
    this.processingMethod = data.processingMethod ?? 'RAW';
    this.createdAt = data.createdAt ?? new Date();
  }

  getMeasurement(variable: string): number | undefined {
    const q = variable.toLowerCase();
    for (const [key, value] of Object.entries(this.measurements)) {
      if (key.toLowerCase() === q) return value;
    }
    return undefined;
  }

  getVariableCount(): number {
    return this.variables.length;
  }

  hasVariable(name: string): boolean {
    const q = name.toLowerCase();
    return this.variables.some((v) => v.toLowerCase() === q);
  }

  getMeasurementValues(): number[] {
    return Object.values(this.measurements);
  }

  getNonZeroCount(): number {
    return Object.values(this.measurements).filter((v) => v !== 0 && !isNaN(v)).length;
  }
}
