// Alert rule configuration — tune thresholds without touching calculator logic

export const ALERT_RULES = {
  elevatedHr: {
    consecutiveDays: 3,
    sdMultiplier: 1,
  },
  performanceDrop: {
    dropThreshold: 0.1,  // 10%
  },
  insufficientRecovery: {
    consecutiveDays: 2,
    lowThreshold: 40,
  },
  rapidWeightGain: {
    days: 7,
    gainThresholdKg: 2.0,
  },
  prolongedSedentarism: {
    windowDays: 7,
  },
  sleepDeficit: {
    days: 7,
    targetHours: 8,
    deficitThresholdHours: 5,
  },
  overtraining: {
    rampRateThreshold: 1.5,
  },
} as const;
