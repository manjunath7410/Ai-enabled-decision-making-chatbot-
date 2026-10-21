/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WhatIfParameters {
  budgetDeltaPercent: number; // e.g. -20% to +50%
  timeCommitmentHoursPerWeek: number; // e.g. 5 to 40 hours
  priorityFocus: 'cost' | 'speed' | 'quality' | 'peace_of_mind';
  timeHorizonMonths: number; // e.g. 3, 6, 12, 24 months
}

export interface SimulationResult {
  preferredOptionName: string;
  rationalSummary: string;
  projectedCostImpact: string;
  projectedTimeImpact: string;
  fragilityRating: 'Low Fragility' | 'Moderate Fragility' | 'High Fragility';
  sensitivityNotes: string[];
  disclaimer: string;
}

/**
 * Deterministically simulates outcomes based on adjusted user parameters.
 */
export function runWhatIfSimulation(
  params: WhatIfParameters,
  options: Array<{ id: string; name: string }>
): SimulationResult {
  const optNames = options.map((o) => o.name);

  // Identify conservative vs growth paths based on semantic naming
  const conservativeOpt =
    optNames.find((n) => {
      const lower = n.toLowerCase();
      return (
        lower.includes('safe') ||
        lower.includes('status') ||
        lower.includes('used') ||
        lower.includes('low') ||
        lower.includes('conservative')
      );
    }) || optNames[1] || 'Conservative Alternative';

  const growthOpt =
    optNames.find((n) => {
      const lower = n.toLowerCase();
      return (
        lower.includes('new') ||
        lower.includes('growth') ||
        lower.includes('active') ||
        lower.includes('electric') ||
        lower.includes('bold')
      );
    }) || optNames[0] || 'Active Growth Path';

  let preferredOptionName = growthOpt;
  let rationalSummary = 'Based on your selected parameters, the active growth path remains favorable.';
  let fragilityRating: 'Low Fragility' | 'Moderate Fragility' | 'High Fragility' = 'Moderate Fragility';
  const sensitivityNotes: string[] = [];

  // Parameter analysis
  if (params.budgetDeltaPercent < -15) {
    preferredOptionName = conservativeOpt;
    rationalSummary = `With a ${Math.abs(params.budgetDeltaPercent)}% reduction in budget, the lower-cost path (${conservativeOpt}) protects you against financial strain.`;
    sensitivityNotes.push('Tight budgets favor capital preservation over fast growth.');
  } else if (params.priorityFocus === 'peace_of_mind') {
    preferredOptionName = conservativeOpt;
    rationalSummary = `When peace of mind is prioritized, avoiding volatile transitions is the most stable choice.`;
    sensitivityNotes.push('Prioritizing peace of mind reduces transition anxiety.');
  } else if (params.priorityFocus === 'speed') {
    preferredOptionName = growthOpt;
    rationalSummary = `Prioritizing speed makes ${growthOpt} the clear winner, provided you can dedicate the required hours.`;
    sensitivityNotes.push('Fast timelines require aggressive execution and higher daily focus.');
  }

  if (params.timeCommitmentHoursPerWeek <= 10) {
    sensitivityNotes.push(`With only ${params.timeCommitmentHoursPerWeek} hrs/week, large initiatives may face delays. A phased rollout is advised.`);
    fragilityRating = 'High Fragility';
  } else if (params.timeCommitmentHoursPerWeek >= 25) {
    sensitivityNotes.push(`Dedication of ${params.timeCommitmentHoursPerWeek} hrs/week substantially increases the likelihood of reaching milestones on schedule.`);
    fragilityRating = 'Low Fragility';
  }

  // Cost and Time impact projections
  const costImpact =
    params.budgetDeltaPercent === 0
      ? 'Baseline budget (no variance)'
      : params.budgetDeltaPercent > 0
      ? `+${params.budgetDeltaPercent}% financial cushion allocated`
      : `${params.budgetDeltaPercent}% budget constraint enforced`;

  const timeImpact = `${params.timeCommitmentHoursPerWeek} hrs/week over ${params.timeHorizonMonths} months (~${
    params.timeCommitmentHoursPerWeek * 4 * params.timeHorizonMonths
  } total dedicated hours)`;

  return {
    preferredOptionName,
    rationalSummary,
    projectedCostImpact: costImpact,
    projectedTimeImpact: timeImpact,
    fragilityRating,
    sensitivityNotes,
    disclaimer: 'This simulation uses deterministic calculations based strictly on your selected slider values. It is a hypothetical scenario model and not a guaranteed real-world forecast.',
  };
}
