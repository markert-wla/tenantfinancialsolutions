/**
 * Rent Stability Score — prototype scoring model.
 *
 * All of the weighting lives in this one file on purpose: if the blueprint's
 * exact weights differ, only the four numbers below need to change and the
 * whole tool follows.
 *
 * 0–100, made up of four parts:
 *   Rent burden        40 pts  — rent as a share of income (30% or less is ideal)
 *   Fixed obligations  25 pts  — rent + all fixed costs as a share of income
 *   Monthly margin     25 pts  — what is left after every bucket is covered
 *   Unexpected cushion 10 pts  — money deliberately set aside for surprises
 */

export type BucketKey = 'fixed' | 'freely' | 'unexpected'

export type ScoreBand = 'stable' | 'building' | 'at_risk' | 'critical'

export type ScoreInput = {
  monthlyIncome: number
  rentAmount: number
  totals: Record<BucketKey, number>
}

export type ScoreBreakdown = {
  key: 'rentBurden' | 'fixedLoad' | 'margin' | 'cushion'
  earned: number
  max: number
}

export type ScoreResult = {
  score: number
  band: ScoreBand
  breakdown: ScoreBreakdown[]
  rentToIncome: number | null
  totalPlanned: number
  leftOver: number
}

const MAX = { rentBurden: 40, fixedLoad: 25, margin: 25, cushion: 10 }

/** Linear score: full marks at `best`, zero at `worst`, straight line between. */
function ramp(value: number, best: number, worst: number, max: number): number {
  if (Number.isNaN(value)) return 0
  if (best < worst) {
    if (value <= best) return max
    if (value >= worst) return 0
  } else {
    if (value >= best) return max
    if (value <= worst) return 0
  }
  return (max * (worst - value)) / (worst - best)
}

export function bandFor(score: number): ScoreBand {
  if (score >= 80) return 'stable'
  if (score >= 60) return 'building'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

export function calculateRentStabilityScore(input: ScoreInput): ScoreResult {
  const income = Math.max(0, input.monthlyIncome || 0)
  const rent = Math.max(0, input.rentAmount || 0)
  const fixed = Math.max(0, input.totals.fixed || 0)
  const freely = Math.max(0, input.totals.freely || 0)
  const unexpected = Math.max(0, input.totals.unexpected || 0)

  const totalPlanned = rent + fixed + freely + unexpected
  const leftOver = income - totalPlanned

  // With no income entered there is nothing meaningful to score yet.
  if (income <= 0) {
    return {
      score: 0,
      band: 'critical',
      breakdown: [
        { key: 'rentBurden', earned: 0, max: MAX.rentBurden },
        { key: 'fixedLoad', earned: 0, max: MAX.fixedLoad },
        { key: 'margin', earned: 0, max: MAX.margin },
        { key: 'cushion', earned: 0, max: MAX.cushion },
      ],
      rentToIncome: null,
      totalPlanned,
      leftOver,
    }
  }

  const rentToIncome = rent / income
  const fixedLoad = (rent + fixed) / income
  const marginShare = leftOver / income
  const cushionShare = unexpected / income

  const breakdown: ScoreBreakdown[] = ([
    // 30% or less of income on rent = full marks; 50% or more = none.
    { key: 'rentBurden', earned: ramp(rentToIncome, 0.3, 0.5, MAX.rentBurden), max: MAX.rentBurden },
    // Rent + fixed costs at 50% of income or less = full marks; 80% or more = none.
    { key: 'fixedLoad', earned: ramp(fixedLoad, 0.5, 0.8, MAX.fixedLoad), max: MAX.fixedLoad },
    // 20% of income left over = full marks; nothing left (or overspent) = none.
    { key: 'margin', earned: ramp(marginShare, 0.2, 0, MAX.margin), max: MAX.margin },
    // 5% of income set aside for surprises = full marks; nothing = none.
    { key: 'cushion', earned: ramp(cushionShare, 0.05, 0, MAX.cushion), max: MAX.cushion },
  ] as ScoreBreakdown[]).map((part) => ({ ...part, earned: Math.round(part.earned * 10) / 10 }))

  const score = Math.max(0, Math.min(100, Math.round(breakdown.reduce((sum, p) => sum + p.earned, 0))))

  return { score, band: bandFor(score), breakdown, rentToIncome, totalPlanned, leftOver }
}
