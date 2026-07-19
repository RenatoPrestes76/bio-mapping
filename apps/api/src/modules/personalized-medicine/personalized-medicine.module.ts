import { Module } from '@nestjs/common';
import { PersonalizedMedicineProvider } from './providers/personalized-medicine.provider.js';
import { PersonalizedMedicineService } from './personalized-medicine.service.js';
import { PersonalizedMedicineController } from './personalized-medicine.controller.js';

@Module({
  controllers: [PersonalizedMedicineController],
  providers: [PersonalizedMedicineProvider, PersonalizedMedicineService],
  exports: [PersonalizedMedicineService, PersonalizedMedicineProvider],
})
export class PersonalizedMedicineModule {}
