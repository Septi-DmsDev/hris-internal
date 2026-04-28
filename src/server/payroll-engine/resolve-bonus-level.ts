import { BONUS_KINERJA_LEVEL } from "@/config/constants";

export type BonusLevel = {
  bonusKinerjaPercent: number;
  bonusPrestasiLevel: number;
};

export function resolveBonusLevel(performancePercent: number): BonusLevel {
  for (const level of BONUS_KINERJA_LEVEL) {
    if (performancePercent >= level.minPersen) {
      return {
        bonusKinerjaPercent: level.bonusKinerja,
        bonusPrestasiLevel: level.bonusPrestasi,
      };
    }
  }

  return {
    bonusKinerjaPercent: 0,
    bonusPrestasiLevel: 0,
  };
}
