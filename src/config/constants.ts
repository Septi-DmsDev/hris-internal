export const POINT_TARGET_HARIAN = 13_000;

export const DIVISION_POINT_TARGET_OVERRIDES: Record<string, number> = {
  OFFSET: 39_000,
};

export function resolvePointTargetForDivision(divisionName?: string | null) {
  const normalizedDivision = divisionName?.trim().toUpperCase();
  if (!normalizedDivision) return POINT_TARGET_HARIAN;
  return DIVISION_POINT_TARGET_OVERRIDES[normalizedDivision] ?? POINT_TARGET_HARIAN;
}

export const GAJI_POKOK_REGULER_DEFAULT = 1_200_000;

export const GAJI_TRAINING_DEFAULT = 1_000_000;

export const BONUS_KINERJA_LEVEL = [
  { minPersen: 165, bonusKinerja: 100, bonusPrestasi: 165 },
  { minPersen: 140, bonusKinerja: 100, bonusPrestasi: 140 },
  { minPersen: 100, bonusKinerja: 100, bonusPrestasi: 0 },
  { minPersen: 90, bonusKinerja: 90, bonusPrestasi: 0 },
  { minPersen: 80, bonusKinerja: 80, bonusPrestasi: 0 },
] as const;

export const STANDAR_LULUS_TRAINING: Record<string, number> = {
  Creative: 70,
  Printing: 75,
  Finishing: 80,
  Logistic: 80,
  Offset: 80,
  "Blangko / Pabrik": 80,
};

export const SP_PERFORMANCE_PENALTY_PERCENT = {
  NONE: 0,
  SP1: 10,
  SP2: 20,
} as const;
