import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentStatus } from '@bio/database';
import { ConsentRepository } from '../repositories/consent.repository.js';

@Injectable()
export class ConsentService {
  constructor(private readonly consentRepo: ConsentRepository) {}

  async grantConsent(data: {
    patientId: string;
    organizationId: string;
    grantedBy: string;
    scopes: string[];
    validUntil?: Date;
    ipAddress?: string;
  }) {
    if (!data.scopes.length) throw new BadRequestException('At least one scope is required');

    const existing = await this.consentRepo.findActiveByPatientAndOrg(data.patientId, data.organizationId);
    if (existing) {
      throw new BadRequestException('Active consent already exists for this organization. Revoke it first to create a new one.');
    }

    return this.consentRepo.create(data);
  }

  async listConsents(patientId: string, status?: ConsentStatus) {
    await this.consentRepo.expireOverdue();
    return this.consentRepo.findByPatient(patientId, status);
  }

  async revokeConsent(id: string, revokedBy: string, revokeReason?: string) {
    const consent = await this.consentRepo.findById(id);
    if (!consent) throw new NotFoundException(`Consent ${id} not found`);
    if (consent.status !== ConsentStatus.ACTIVE) {
      throw new BadRequestException(`Consent is already ${consent.status}`);
    }
    return this.consentRepo.revoke(id, revokedBy, revokeReason);
  }

  async checkConsent(patientId: string, organizationId: string, scope: string): Promise<boolean> {
    await this.consentRepo.expireOverdue();
    const consent = await this.consentRepo.findActiveByPatientAndOrg(patientId, organizationId);
    if (!consent) return false;
    return consent.scopes.includes('ALL') || consent.scopes.includes(scope);
  }

  async assertConsent(patientId: string, organizationId: string, scope: string): Promise<void> {
    const allowed = await this.checkConsent(patientId, organizationId, scope);
    if (!allowed) {
      throw new ForbiddenException(`No active consent for scope "${scope}" from organization ${organizationId}`);
    }
  }
}
