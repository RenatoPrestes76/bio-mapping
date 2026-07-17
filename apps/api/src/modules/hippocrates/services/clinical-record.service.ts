import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalRecordType, ClinicalStatus } from '@bio/database';
import { ClinicalRecordRepository } from '../repositories/clinical-record.repository.js';
import { MedicationRepository } from '../repositories/medication.repository.js';
import { AllergyRepository } from '../repositories/allergy.repository.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';

@Injectable()
export class ClinicalRecordService {
  constructor(
    private readonly recordRepo: ClinicalRecordRepository,
    private readonly medicationRepo: MedicationRepository,
    private readonly allergyRepo: AllergyRepository,
    private readonly procedureRepo: ProcedureRepository,
  ) {}

  async getRecords(patientId: string, recordType?: ClinicalRecordType) {
    return this.recordRepo.findByPatient(patientId, recordType ? { recordType } : {});
  }

  async getRecord(id: string) {
    const record = await this.recordRepo.findById(id);
    if (!record) throw new NotFoundException(`Clinical record ${id} not found`);
    return record;
  }

  async getMedications(patientId: string, status?: ClinicalStatus) {
    return this.medicationRepo.findByPatient(patientId, status);
  }

  async getAllergies(patientId: string, status?: ClinicalStatus) {
    return this.allergyRepo.findByPatient(patientId, status);
  }

  async getProcedures(patientId: string, status?: ClinicalStatus) {
    return this.procedureRepo.findByPatient(patientId, status);
  }

  async getSummary(patientId: string) {
    const [records, medications, allergies, procedures] = await Promise.all([
      this.recordRepo.countByPatient(patientId),
      this.medicationRepo.findByPatient(patientId, ClinicalStatus.ACTIVE),
      this.allergyRepo.findByPatient(patientId, ClinicalStatus.ACTIVE),
      this.procedureRepo.findByPatient(patientId),
    ]);

    return {
      totalRecords: records,
      activeMedications: medications.length,
      activeAllergies: allergies.length,
      totalProcedures: procedures.length,
      medications: medications.slice(0, 5),
      allergies: allergies.slice(0, 5),
    };
  }
}
