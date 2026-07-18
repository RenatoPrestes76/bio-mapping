import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AuditAction =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_LOGOUT_ALL'
  | 'AUTH_REFRESH'
  | 'AUTH_SESSION_REVOKED'
  | 'USER_PASSWORD_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'USER_DELETED'
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'PROFILE_DELETED'
  | 'PROFILE_AVATAR_UPDATED'
  | 'PROFESSIONAL_CREATED'
  | 'PROFESSIONAL_UPDATED'
  | 'PROFESSIONAL_DELETED'
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'PATIENT_DELETED'
  | 'ORG_CREATED'
  | 'ORG_UPDATED'
  | 'ORG_DELETED'
  | 'MEMBERSHIP_CREATED'
  | 'MEMBERSHIP_UPDATED'
  | 'MEMBERSHIP_DELETED'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REJECTED'
  | 'VITAL_CREATED'
  | 'VITAL_UPDATED'
  | 'VITAL_DELETED'
  | 'VITAL_VALIDATED'
  | 'VITAL_IMPORTED'
  | 'BIOMARKER_CREATED'
  | 'BIOMARKER_UPDATED'
  | 'BIOMARKER_DELETED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_UPDATED'
  | 'ASSESSMENT_COMPLETED'
  | 'ASSESSMENT_VALIDATED'
  | 'ASSESSMENT_LOCKED'
  | 'ASSESSMENT_DELETED'
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_UPDATED'
  | 'TEMPLATE_DELETED'
  | 'EVIDENCE_UPLOADED'
  | 'EVIDENCE_DELETED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_UPDATED'
  | 'DEVICE_DELETED'
  | 'DEVICE_PAIRED'
  | 'DEVICE_UNPAIRED'
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'DEVICE_ERROR'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'MEASUREMENT_PROCESSED'
  | 'MEASUREMENT_REJECTED'
  | 'CALIBRATION_CREATED'
  | 'CALIBRATION_EXPIRED'
  | 'BRANCH_CREATED'
  | 'BRANCH_UPDATED'
  | 'BRANCH_DELETED'
  | 'ORG_SETTINGS_UPDATED'
  | 'DATA_EXPORTED'
  | 'PERMISSION_CHANGED'
  | 'SSO_LOGIN'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_UPDATED'
  | 'ENROLLMENT_CREATED'
  | 'ENROLLMENT_UPDATED'
  | 'KNOWLEDGE_CREATED'
  | 'KNOWLEDGE_UPDATED'
  | 'KNOWLEDGE_DELETED'
  | 'DECISION_CREATED'
  | 'DECISION_STATUS_UPDATED'
  | 'PATHWAY_STARTED'
  | 'PATHWAY_STEP_ADVANCED'
  | 'PATHWAY_COMPLETED'
  | 'PATHWAY_CANCELLED';

export interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(action: AuditAction, context: AuditContext): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        userId: context.userId ?? null,
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        metadata: context.metadata ? (context.metadata as object) : undefined,
      },
    });
  }
}
