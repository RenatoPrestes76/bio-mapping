import { PatientProfile } from '../entities/patient-profile.entity.js';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto.js';

export class ProfileBuilder {
  build(dto: CreateProfileDto): PatientProfile {
    return new PatientProfile({
      patientId: dto.patientId,
      demographics: dto.demographics,
      clinicalHistory: dto.clinicalHistory ?? [],
      familyHistory: dto.familyHistory ?? [],
      lifestyle: dto.lifestyle ?? {},
      nutrition: dto.nutrition ?? {},
      physicalActivity: dto.physicalActivity ?? {},
      sleep: dto.sleep ?? {},
      stress: dto.stress ?? {},
      biomarkers: dto.biomarkers ?? [],
      medications: dto.medications ?? [],
      allergies: dto.allergies ?? [],
      preferences: dto.preferences ?? {},
    });
  }

  update(profile: PatientProfile, updates: UpdateProfileDto): PatientProfile {
    return new PatientProfile({
      id: profile.id,
      patientId: profile.patientId,
      demographics: { ...profile.demographics, ...updates.demographics },
      clinicalHistory: updates.clinicalHistory ?? profile.clinicalHistory,
      familyHistory: updates.familyHistory ?? profile.familyHistory,
      lifestyle: { ...profile.lifestyle, ...updates.lifestyle },
      nutrition: { ...profile.nutrition, ...updates.nutrition },
      physicalActivity: { ...profile.physicalActivity, ...updates.physicalActivity },
      sleep: { ...profile.sleep, ...updates.sleep },
      stress: { ...profile.stress, ...updates.stress },
      biomarkers: updates.biomarkers ?? profile.biomarkers,
      medications: updates.medications ?? profile.medications,
      allergies: updates.allergies ?? profile.allergies,
      preferences: { ...profile.preferences, ...updates.preferences },
      createdAt: profile.createdAt,
    });
  }
}
