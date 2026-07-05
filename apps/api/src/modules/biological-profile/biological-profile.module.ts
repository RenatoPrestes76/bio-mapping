import { Module } from '@nestjs/common';
import { BiologicalProfileController } from './biological-profile.controller';
import { BiologicalProfileService } from './biological-profile.service';

@Module({
  controllers: [BiologicalProfileController],
  providers: [BiologicalProfileService],
})
export class BiologicalProfileModule {}
