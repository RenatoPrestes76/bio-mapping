export interface DataPointRef {
  source: string;
  field: string;
  value: unknown;
  recordedAt?: Date;
}
