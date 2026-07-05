import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityLevel, BloodType } from '@bio/database';

export class BiologicalProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional({ nullable: true })
  height: number | null;

  @ApiPropertyOptional({ nullable: true })
  weight: number | null;

  @ApiPropertyOptional({ nullable: true })
  bodyFat: number | null;

  @ApiPropertyOptional({ nullable: true })
  muscleMass: number | null;

  @ApiPropertyOptional({ nullable: true })
  restingHeartRate: number | null;

  @ApiPropertyOptional({ enum: BloodType, nullable: true })
  bloodType: BloodType | null;

  @ApiPropertyOptional({ nullable: true })
  goal: string | null;

  @ApiPropertyOptional({ enum: ActivityLevel, nullable: true })
  activityLevel: ActivityLevel | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
