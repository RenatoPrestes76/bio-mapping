import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterAlertsDto {
  @ApiPropertyOptional({ description: 'Filtrar apenas não lidos' })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar apenas não resolvidos' })
  @IsOptional()
  @IsBoolean()
  unresolvedOnly?: boolean;
}

export class AlertResponseDto {
  id: string;
  patientId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: Date;
  triggeredAt: Date;
  createdAt: Date;
}

export function toAlertResponse(record: any): AlertResponseDto {
  return { ...record };
}
