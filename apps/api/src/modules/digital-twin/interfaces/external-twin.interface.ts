export interface IFHIRObservationStream {
  patientId: string;
  observations: Array<{
    resourceType: 'Observation';
    id: string;
    code: { coding: { system: string; code: string; display: string }[] };
    valueQuantity?: { value: number; unit: string };
    effectiveDateTime: string;
    status: 'final' | 'preliminary' | 'amended';
  }>;
}

export interface IFHIRDeviceData {
  resourceType: 'Device';
  id: string;
  type?: { coding: { system: string; code: string; display: string }[] };
  patient?: { reference: string };
  manufacturer?: string;
  deviceName?: { name: string; type: string }[];
}

export interface IFHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'in-progress' | 'finished' | 'cancelled';
  subject: { reference: string };
  period?: { start: string; end?: string };
  reasonCode?: { coding: { system: string; code: string; display: string }[] }[];
}

export interface IWearableStreamPoint {
  deviceId: string;
  patientId: string;
  metric: 'HEART_RATE' | 'STEPS' | 'SPO2' | 'SKIN_TEMP' | 'SLEEP_STAGE' | 'HRV' | 'GLUCOSE_CGM';
  value: number;
  unit: string;
  timestamp: string;
  quality?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IIoTMedicalDevice {
  deviceId: string;
  deviceType: 'BP_MONITOR' | 'GLUCOMETER' | 'PULSE_OXIMETER' | 'SCALE' | 'THERMOMETER' | 'ECG';
  patientId: string;
  readings: Array<{
    timestamp: string;
    parameters: Record<string, number>;
    unit: Record<string, string>;
  }>;
}

export interface IContinuousMonitoringFeed {
  patientId: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  streams: Array<{
    metric: string;
    samplingRateHz: number;
    values: Array<{ t: number; v: number }>;
  }>;
  alerts: Array<{
    timestamp: string;
    metric: string;
    value: number;
    threshold: number;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  }>;
}

export interface IWearableAdapter {
  getRealtimeStream(patientId: string): Promise<IWearableStreamPoint[]>;
  syncToTwin(twinId: string, points: IWearableStreamPoint[]): Promise<void>;
}

export interface IIoTDeviceAdapter {
  getDeviceReadings(deviceId: string, patientId: string): Promise<IIoTMedicalDevice>;
  pushToTwin(twinId: string, device: IIoTMedicalDevice): Promise<void>;
}

export interface IContinuousMonitoringAdapter {
  startSession(patientId: string): Promise<string>;
  getFeed(sessionId: string): Promise<IContinuousMonitoringFeed>;
  alertOnThreshold(twinId: string, metric: string, threshold: number): Promise<void>;
}

export interface IFHIRTwinAdapter {
  importObservations(stream: IFHIRObservationStream): Promise<void>;
  exportTwinState(twinId: string): Promise<IFHIRObservationStream>;
  linkDevice(twinId: string, device: IFHIRDeviceData): Promise<void>;
  recordEncounter(twinId: string, encounter: IFHIREncounter): Promise<void>;
}

export interface IDigitalTwinExternalRegistry {
  wearable?: IWearableAdapter;
  iotDevice?: IIoTDeviceAdapter;
  continuousMonitoring?: IContinuousMonitoringAdapter;
  fhir?: IFHIRTwinAdapter;
}
