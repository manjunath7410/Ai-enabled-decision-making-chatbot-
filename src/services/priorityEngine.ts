/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PriorityWeights {
  costSavings: number; // 1 to 5
  speedOfOutcome: number; // 1 to 5
  peaceOfMind: number; // 1 to 5
  growthUpside: number; // 1 to 5
}

export interface OptionScoreBreakdown {
  optionId: string;
  optionName: string;
  totalScore: number; // Weighted composite score
  maxPossibleScore: number;
  percentage: number;
  criteriaScores: Array<{
    criterion: string;
    weight: number;
    fitScore: number; // 1 to 10
    weightedContribution: number;
  }>;
}

export interface PriorityRankingResult {
  rankings: OptionScoreBreakdown[];
  topRankedOptionId: string;
  scoringExplanation: string;
  disclaimer: string;
}

/**
 * Deterministically calculates transparent Multi-Criteria Decision Analysis (MCDA) scores.
 * All criteria and mathematical calculations are open and auditable.
 */
export function calculatePriorityRanking(
  weights: PriorityWeights,
  options: Array<{ id: string; name: string; isConservative?: boolean }>
): PriorityRankingResult {
  const criteriaList = [
    { key: 'costSavings', name: 'Cost & Financial Efficiency', weight: weights.costSavings },
    { key: 'speedOfOutcome', name: 'Speed & Quick Execution', weight: weights.speedOfOutcome },
    { key: 'peaceOfMind', name: 'Peace of Mind & Low Stress', weight: weights.peaceOfMind },
    { key: 'growthUpside', name: 'Long-Term Growth & Opportunity', weight: weights.growthUpside },
  ];

  const totalWeight = criteriaList.reduce((sum, c) => sum + c.weight, 0);
  const maxPossibleScore = totalWeight * 10;

  const rankings: OptionScoreBreakdown[] = options.map((opt, idx) => {
    const lower = opt.name.toLowerCase();
    const isConservative =
      opt.isConservative ??
      (lower.includes('used') ||
        lower.includes('safe') ||
        lower.includes('status') ||
        lower.includes('low') ||
        lower.includes('conservative') ||
        idx === 0);

    // Deterministic baseline fit scores (1-10) based on option nature
    const fits: Record<string, number> = {
      costSavings: isConservative ? 9 : 5,
      speedOfOutcome: isConservative ? 4 : 8,
      peaceOfMind: isConservative ? 9 : 4,
      growthUpside: isConservative ? 4 : 9,
    };

    let totalScore = 0;
    const criteriaScores = criteriaList.map((c) => {
      const fit = fits[c.key] || 5;
      const contribution = fit * c.weight;
      totalScore += contribution;
      return {
        criterion: c.name,
        weight: c.weight,
        fitScore: fit,
        weightedContribution: contribution,
      };
    });

    const percentage = Math.round((totalScore / maxPossibleScore) * 100);

    return {
      optionId: opt.id,
      optionName: opt.name,
      totalScore,
      maxPossibleScore,
      percentage,
      criteriaScores,
    };
  });

  // Sort descending by total score
  rankings.sort((a, b) => b.totalScore - a.totalScore);
  const topRankedOptionId = rankings[0]?.optionId || '';

  const scoringExplanation = `Scores are calculated using transparent Multi-Criteria Decision Analysis (MCDA): Total Score = Sum of (Weight x Fit Score). Total active weights: ${totalWeight} points.`;

  return {
    rankings,
    topRankedOptionId,
    scoringExplanation,
    disclaimer: 'This scoring ranking is a mathematical reflection of your stated weights. It organizes your trade-offs transparently and should be treated as a thinking tool rather than a final decree.',
  };
}
