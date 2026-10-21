/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecisionCardData } from '../types/decisionCard.ts';

export interface ClarityCriterion {
  id: string;
  label: string;
  description: string;
  points: number;
  maxPoints: number;
  isSatisfied: boolean;
  recommendationIfMissing: string;
}

export interface DecisionClarityReport {
  score: number; // 0 to 100
  rating: 'Initial Draft' | 'Developing' | 'Actionable' | 'Comprehensive';
  criteria: ClarityCriterion[];
  missingElements: string[];
  disclaimer: string;
}

/**
 * Deterministically evaluates the completeness of information for a decision.
 * Never calculates or implies a probability of success.
 */
export function calculateDecisionClarity(decision: DecisionCardData | null, userPrompt?: string): DecisionClarityReport {
  const criteria: ClarityCriterion[] = [
    {
      id: 'goal',
      label: 'Clear Core Dilemma & Goal',
      description: 'The specific problem and desired outcome are clearly stated.',
      maxPoints: 20,
      points: 0,
      isSatisfied: false,
      recommendationIfMissing: 'Define the exact choice to be made and your primary goal.',
    },
    {
      id: 'constraints',
      label: 'Constraints & Boundaries',
      description: 'Budget, timeline, location, or personal dealbreakers are identified.',
      maxPoints: 20,
      points: 0,
      isSatisfied: false,
      recommendationIfMissing: 'Specify non-negotiable limits such as maximum budget or deadlines.',
    },
    {
      id: 'alternatives',
      label: 'At Least 2 Realistic Options',
      description: 'Multiple distinct alternatives (including the status quo) are articulated.',
      maxPoints: 20,
      points: 0,
      isSatisfied: false,
      recommendationIfMissing: 'Identify at least two distinct paths, such as changing course vs. waiting.',
    },
    {
      id: 'risks',
      label: 'Trade-Offs & Downside Risks',
      description: 'Potential pitfalls, downsides, and reversibility factors are evaluated.',
      maxPoints: 20,
      points: 0,
      isSatisfied: false,
      recommendationIfMissing: 'Evaluate what could go wrong and what the worst-case scenario would cost.',
    },
    {
      id: 'action_plan',
      label: 'Concrete Immediate Next Steps',
      description: 'At least 2 practical, verifiable next actions are scheduled.',
      maxPoints: 20,
      points: 0,
      isSatisfied: false,
      recommendationIfMissing: 'Outline 2 immediate steps you can execute in the next 48 hours.',
    },
  ];

  if (!decision) {
    return {
      score: 0,
      rating: 'Initial Draft',
      criteria,
      missingElements: criteria.map((c) => c.recommendationIfMissing),
      disclaimer: 'This score measures information completeness only. It does not measure the probability of success.',
    };
  }

  // 1. Goal Check
  if (decision.title && decision.title.length > 10 && decision.summary && decision.summary.length > 20) {
    criteria[0].points = 20;
    criteria[0].isSatisfied = true;
  } else if (userPrompt && userPrompt.trim().length > 15) {
    criteria[0].points = 15;
    criteria[0].isSatisfied = true;
  }

  // 2. Constraints Check
  const summaryLower = (decision.summary + ' ' + (userPrompt || '')).toLowerCase();
  const hasConstraintSignals =
    summaryLower.includes('$') ||
    summaryLower.includes('budget') ||
    summaryLower.includes('month') ||
    summaryLower.includes('week') ||
    summaryLower.includes('year') ||
    summaryLower.includes('hour') ||
    summaryLower.includes('priority') ||
    summaryLower.includes('must') ||
    summaryLower.includes('deadline');

  if (hasConstraintSignals) {
    criteria[1].points = 20;
    criteria[1].isSatisfied = true;
  } else if (decision.missingInformation && decision.missingInformation.length > 0) {
    criteria[1].points = 10;
  }

  // 3. Alternatives Check
  if (decision.options && decision.options.length >= 2) {
    criteria[2].points = 20;
    criteria[2].isSatisfied = true;
  } else if (decision.options && decision.options.length === 1) {
    criteria[2].points = 10;
  }

  // 4. Risks & Trade-Offs Check
  if (decision.risks && decision.risks.length >= 2) {
    criteria[3].points = 20;
    criteria[3].isSatisfied = true;
  } else if (decision.risks && decision.risks.length === 1) {
    criteria[3].points = 10;
  }

  // 5. Next Steps Check
  if (decision.nextSteps && decision.nextSteps.length >= 2) {
    criteria[4].points = 20;
    criteria[4].isSatisfied = true;
  } else if (decision.nextSteps && decision.nextSteps.length === 1) {
    criteria[4].points = 10;
  }

  const score = criteria.reduce((sum, c) => sum + c.points, 0);

  let rating: 'Initial Draft' | 'Developing' | 'Actionable' | 'Comprehensive' = 'Initial Draft';
  if (score >= 80) rating = 'Comprehensive';
  else if (score >= 60) rating = 'Actionable';
  else if (score >= 40) rating = 'Developing';

  const missingElements = criteria.filter((c) => !c.isSatisfied).map((c) => c.recommendationIfMissing);

  return {
    score,
    rating,
    criteria,
    missingElements,
    disclaimer: 'The Decision Clarity Score measures how thoroughly the dilemma, constraints, options, and risks have been documented. It is a transparency checklist, NOT a guarantee of success or statistical prediction.',
  };
}
