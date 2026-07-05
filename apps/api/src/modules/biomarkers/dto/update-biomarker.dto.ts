import { PartialType } from '@nestjs/swagger';
import { CreateBiomarkerDto } from './create-biomarker.dto';

export class UpdateBiomarkerDto extends PartialType(CreateBiomarkerDto) {}
