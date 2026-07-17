import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsentService } from '../services/consent.service.js';
import { ConsentStatus } from '@bio/database';

const consent = {
  id: 'consent-1',
  patientId: 'patient-1',
  organizationId: 'org-1',
  grantedBy: 'user-1',
  scopes: ['VITALS', 'MEDICATIONS'],
  status: ConsentStatus.ACTIVE,
  validFrom: new Date(),
  validUntil: null,
  revokedAt: null,
  revokedBy: null,
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(consent),
  findByPatient: jest.fn().mockResolvedValue([consent]),
  findById: jest.fn().mockResolvedValue(consent),
  findActiveByPatientAndOrg: jest.fn().mockResolvedValue(null),
  revoke: jest.fn().mockResolvedValue({ ...consent, status: ConsentStatus.REVOKED }),
  expireOverdue: jest.fn().mockResolvedValue({ count: 0 }),
  ...overrides,
});

describe('ConsentService', () => {
  describe('grantConsent', () => {
    it('creates consent when no active consent exists', async () => {
      const service = new ConsentService(makeRepo() as never);
      const result = await service.grantConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        grantedBy: 'user-1',
        scopes: ['VITALS'],
      });
      expect(result).toBe(consent);
    });

    it('throws BadRequestException when scopes array is empty', async () => {
      const service = new ConsentService(makeRepo() as never);
      await expect(service.grantConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        grantedBy: 'user-1',
        scopes: [],
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when active consent already exists', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(consent) });
      const service = new ConsentService(repo as never);
      await expect(service.grantConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        grantedBy: 'user-1',
        scopes: ['ALL'],
      })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listConsents', () => {
    it('returns consents after expiring overdue ones', async () => {
      const service = new ConsentService(makeRepo() as never);
      const result = await service.listConsents('patient-1');
      expect(result).toEqual([consent]);
    });
  });

  describe('revokeConsent', () => {
    it('revokes an active consent', async () => {
      const service = new ConsentService(makeRepo() as never);
      const result = await service.revokeConsent('consent-1', 'user-1', 'No longer needed');
      expect(result.status).toBe(ConsentStatus.REVOKED);
    });

    it('throws NotFoundException when consent not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ConsentService(repo as never);
      await expect(service.revokeConsent('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when consent already revoked', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...consent, status: ConsentStatus.REVOKED }) });
      const service = new ConsentService(repo as never);
      await expect(service.revokeConsent('consent-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('checkConsent', () => {
    it('returns true when scope is in consent scopes', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(consent) });
      const service = new ConsentService(repo as never);
      const result = await service.checkConsent('patient-1', 'org-1', 'VITALS');
      expect(result).toBe(true);
    });

    it('returns false when scope not in consent scopes', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(consent) });
      const service = new ConsentService(repo as never);
      const result = await service.checkConsent('patient-1', 'org-1', 'CLINICAL_RECORDS');
      expect(result).toBe(false);
    });

    it('returns false when no active consent', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(null) });
      const service = new ConsentService(repo as never);
      const result = await service.checkConsent('patient-1', 'org-1', 'VITALS');
      expect(result).toBe(false);
    });

    it('returns true for any scope when consent has ALL', async () => {
      const allConsent = { ...consent, scopes: ['ALL'] };
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(allConsent) });
      const service = new ConsentService(repo as never);
      expect(await service.checkConsent('patient-1', 'org-1', 'MEDICATIONS')).toBe(true);
      expect(await service.checkConsent('patient-1', 'org-1', 'CLINICAL_RECORDS')).toBe(true);
    });
  });

  describe('assertConsent', () => {
    it('does not throw when consent is valid', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(consent) });
      const service = new ConsentService(repo as never);
      await expect(service.assertConsent('patient-1', 'org-1', 'VITALS')).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when no consent', async () => {
      const repo = makeRepo({ findActiveByPatientAndOrg: jest.fn().mockResolvedValue(null) });
      const service = new ConsentService(repo as never);
      await expect(service.assertConsent('patient-1', 'org-1', 'VITALS')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
