export interface RunSimulationDto {
  patientId: string;
  tenantId?: string;
  scenarioType: string;
  parameters?: Record<string, unknown>;
  timeHorizon: string;
}

export interface CompareSimulationsDto {
  runIds: string[];
}
