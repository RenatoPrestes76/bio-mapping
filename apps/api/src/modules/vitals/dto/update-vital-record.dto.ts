import { PartialType } from '@nestjs/swagger';
import { CreateVitalRecordDto } from './create-vital-record.dto';

export class UpdateVitalRecordDto extends PartialType(CreateVitalRecordDto) {}
