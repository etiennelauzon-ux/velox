// src/state/physicsState.ts — physics configuration store

import type { PhysicsConfig } from '@/types';

export const physicsState: PhysicsConfig = {
  riderWeightKg:        72,
  bikeWeightKg:         10,
  rho:                  1.225,
  g:                    9.81,
  crr:                  0.0045,
  cda:                  0.32,
  drivetrainEfficiency: 0.97,
  tau:                  2.7,
  minTargetMps:         0.1,
  maxTargetMps:         35,
  gradeWindowM:         85,
};
