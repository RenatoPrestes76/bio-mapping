import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsArray, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportDiscoveredDeviceDto {
  @IsString()
  @IsNotEmpty()
  macAddress: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(-120)
  @Max(0)
  @Type(() => Number)
  rssi?: number;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  connectionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceUUIDs?: string[];
}

export interface DiscoveredDeviceResponseDto {
  macAddress: string;
  name: string;
  rssi?: number;
  manufacturer?: string;
  connectionType: string;
  serviceUUIDs?: string[];
  signalStrength: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  discoveredAt: Date;
}

export function rssiToSignalStrength(rssi?: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  if (rssi === undefined || rssi === null) return 'POOR';
  if (rssi >= -50) return 'EXCELLENT';
  if (rssi >= -65) return 'GOOD';
  if (rssi >= -80) return 'FAIR';
  return 'POOR';
}
