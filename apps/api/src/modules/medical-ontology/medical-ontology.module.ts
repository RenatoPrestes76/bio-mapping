import { Module } from '@nestjs/common';
import { OntologyProvider } from './providers/ontology.provider.js';
import { MedicalOntologyService } from './medical-ontology.service.js';
import { MedicalOntologyController } from './medical-ontology.controller.js';

@Module({
  controllers: [MedicalOntologyController],
  providers: [OntologyProvider, MedicalOntologyService],
  exports: [MedicalOntologyService, OntologyProvider],
})
export class MedicalOntologyModule {}
