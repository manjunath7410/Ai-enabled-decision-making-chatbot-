/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecisionCardData } from '../types/decisionCard.ts';

export type ReversibilityType = 'two_way_door' | 'one_way_door' | 'partially_reversible';

export interface RegretAnalysis {
  reversibility: ReversibilityType;
  reversibilityLabel: string;
  reversibilityExplanation: string;
  worstCaseAssessment: string;
  tenTenTenPerspective: {
    tenMinutes: string;
    tenMonths: string;
    tenYears: string;
  };
  lowRiskPilotOptions: string[];
  regretMinimizationAdvice: string;
}

/**
 * Deterministically analyzes the reversibility and regret factors for a decision.
 */
export function analyzeRegretFactors(decision: DecisionCardData | null, userContext?: string): RegretAnalysis {
  const text = ((decision?.title || '') + ' ' + (decision?.summary || '') + ' ' + (userContext || '')).toLowerCase();

  // Classify reversibility based on high-commitment signals
  const isOneWayDoor =
    text.includes('quit') ||
    text.includes('resign') ||
    text.includes('buy a house') ||
    text.includes('mortgage') ||
    text.includes('marriage') ||
    text.includes('divorce') ||
    text.includes('move to') ||
    text.includes('relocat') ||
    text.includes('surgery') ||
    text.includes('loan');

  const isLowCommitment =
    text.includes('laptop') ||
    text.includes('course') ||
    text.includes('book') ||
    text.includes('habit') ||
    text.includes('trial') ||
    text.includes('subscription') ||
    text.includes('freelance');

  let reversibility: ReversibilityType = 'partially_reversible';
  let reversibilityLabel = 'Partially Reversible Choice';
  let reversibilityExplanation = 'This decision carries moderate transition effort, but can be adjusted or reversed with some time and patience.';

  if (isOneWayDoor) {
    reversibility = 'one_way_door';
    reversibilityLabel = 'One-Way Door (High Commitment)';
    reversibilityExplanation = 'This choice involves significant irreversible elements, high transaction costs, or lasting consequences. Give it at least 48 hours of deliberation before signing or committing.';
  } else if (isLowCommitment) {
    reversibility = 'two_way_door';
    reversibilityLabel = 'Two-Way Door (Easily Reversible)';
    reversibilityExplanation = 'If you find that this choice does not work out, you can reverse course quickly with minimal downside.';
  }

  // 10/10/10 Rule
  const tenTenTenPerspective = {
    tenMinutes: 'You may feel temporary relief or slight second-guessing as the choice is finalized.',
    tenMonths: 'You will have adapted to the new routine, and the initial anxiety will have dissolved into day-to-day reality.',
    tenYears: 'You will remember the general life direction it unlocked, not the micro-frictions of the transition.',
  };

  // Low-Risk Pilots
  const lowRiskPilotOptions: string[] = [];
  if (reversibility === 'one_way_door') {
    lowRiskPilotOptions.push('Test on a small scale: spend a week in the new location or shadow someone in the role before committing.');
    lowRiskPilotOptions.push('Secure a formal safety buffer (3-6 months of essential living expenses) before executing.');
    lowRiskPilotOptions.push('Negotiate a flexible contingency clause or probationary review period.');
  } else {
    lowRiskPilotOptions.push('Commit to a 30-day trial period with a scheduled review milestone.');
    lowRiskPilotOptions.push('Set a stop-loss threshold: if key assumptions are not met in 4 weeks, revert to baseline.');
  }

  const worstCaseAssessment =
    reversibility === 'one_way_door'
      ? 'The worst-case scenario involves financial variance or relocation friction. Ensure you have an emergency fund and a clear fallback plan.'
      : 'The worst-case scenario involves minor opportunity cost or spent effort that can be recovered within a few weeks.';

  const regretMinimizationAdvice =
    'Research in behavioral decision theory shows that in the long run, people regret inaction (not trying) more than calculated, reversible attempts. If this choice is reversible and aligns with your core values, lean toward action.';

  return {
    reversibility,
    reversibilityLabel,
    reversibilityExplanation,
    worstCaseAssessment,
    tenTenTenPerspective,
    lowRiskPilotOptions,
    regretMinimizationAdvice,
  };
}
