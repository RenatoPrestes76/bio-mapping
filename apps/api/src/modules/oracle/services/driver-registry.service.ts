import { Injectable } from '@nestjs/common';
import { HealthPlatform } from '@bio/database';
import { IPlatformDriver } from '../drivers/platform-driver.interface.js';
import { AppleHealthDriver } from '../drivers/apple-health.driver.js';
import { GoogleFitDriver } from '../drivers/google-fit.driver.js';
import { GoogleHealthConnectDriver } from '../drivers/google-health-connect.driver.js';
import { GarminDriver } from '../drivers/garmin.driver.js';
import { PolarDriver } from '../drivers/polar.driver.js';
import { FitbitDriver } from '../drivers/fitbit.driver.js';
import { AmazfitDriver } from '../drivers/amazfit.driver.js';
import { SamsungHealthDriver } from '../drivers/samsung-health.driver.js';
import { SimulatorDriver } from '../drivers/simulator.driver.js';

@Injectable()
export class DriverRegistryService {
  private readonly registry = new Map<HealthPlatform, IPlatformDriver>();

  constructor(
    appleHealth: AppleHealthDriver,
    googleFit: GoogleFitDriver,
    googleHealthConnect: GoogleHealthConnectDriver,
    garmin: GarminDriver,
    polar: PolarDriver,
    fitbit: FitbitDriver,
    amazfit: AmazfitDriver,
    samsungHealth: SamsungHealthDriver,
    simulator: SimulatorDriver,
  ) {
    [appleHealth, googleFit, googleHealthConnect, garmin, polar, fitbit, amazfit, samsungHealth, simulator].forEach(
      (driver) => this.registry.set(driver.platform, driver),
    );
  }

  get(platform: HealthPlatform): IPlatformDriver {
    const driver = this.registry.get(platform);
    if (!driver) throw new Error(`No driver registered for platform: ${platform}`);
    return driver;
  }

  getAll(): IPlatformDriver[] {
    return Array.from(this.registry.values());
  }

  supports(platform: HealthPlatform): boolean {
    return this.registry.has(platform);
  }
}
