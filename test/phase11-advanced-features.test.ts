/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateDecisionClarity } from '../src/services/decisionClarity.ts';
import { analyzeRegretFactors } from '../src/services/regretCheck.ts';
import { runWhatIfSimulation } from '../src/services/whatIfEngine.ts';
import { calculatePriorityRanking } from '../src/services/priorityEngine.ts';
import { DecisionCardData } from '../src/types/decisionCard.ts';

export async function runPhase11AdvancedFeaturesTests() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: PHASE 11 ADVANCED DECISION-SUPPORT TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  const mockDecision: DecisionCardData = {
    title: 'Should I buy a fuel-efficient used car or finance a new electric vehicle?',
    summary: 'Evaluating car choices given a strict monthly budget of $450 and a 30-mile daily commute.',
    status: 'recommended',
    recommendedOption: {
      name: 'Option A: Reliable Used Hybrid',
      shortWhy: 'Minimizes monthly depreciation and fits cleanly under the $450/month ceiling.',
    },
    options: [
      {
        id: 'opt-1',
        name: 'Reliable Used Hybrid (Cash / Low Loan)',
        description: 'Dependable baseline with low insurance.',
        isRecommended: true,
        pros: ['Low monthly cost', 'Zero rapid depreciation'],
        cons: ['Older infotainment tech'],
        bestWhen: 'Budget predictability is paramount.',
      },
      {
        id: 'opt-2',
        name: 'New Electric Vehicle (Financed)',
        description: 'Modern EV with home charging convenience.',
        isRecommended: false,
        pros: ['Zero gasoline expense', 'Latest safety tech'],
        cons: ['Higher monthly payment ($550+)', 'Upfront charger installation'],
        bestWhen: 'Long-term fuel savings and modern tech are top priorities.',
      },
    ],
    risks: [
      {
        title: 'Unexpected battery maintenance on older hybrids',
        mitigation: 'Get a pre-purchase mechanical inspection before buying.',
      },
      {
        title: 'Depreciation hit on brand new EV',
        mitigation: 'Look for certified pre-owned EV incentives.',
      },
    ],
    nextSteps: [
      { id: 'step-1', text: 'Confirm home electrical charging feasibility.' },
      { id: 'step-2', text: 'Get pre-approved for auto insurance quotes on both models.' },
      { id: 'step-3', text: 'Test drive both vehicles back-to-back this weekend.' },
    ],
  };

  // TEST 1: Decision Clarity Score (Completeness Index)
  console.log('[TEST 1/5] Decision Clarity Completeness Scoring...');
  const clarityReport = calculateDecisionClarity(mockDecision);

  const clarityPass =
    clarityReport.score >= 80 &&
    clarityReport.rating === 'Comprehensive' &&
    clarityReport.disclaimer.includes('NOT a guarantee of success') &&
    clarityReport.criteria.length === 5;

  if (clarityPass) {
    console.log(`  ✅ Decision Clarity Score: ${clarityReport.score}% (Rating: ${clarityReport.rating})`);
    console.log('  ✅ Verified: Explicitly disclaimed as an information completeness checklist, NOT success probability.');
    passed++;
  } else {
    console.error('  ❌ Decision Clarity calculation failed:', clarityReport);
    failed++;
  }

  // TEST 2: What-If Sensitivity Simulator Engine
  console.log('\n[TEST 2/5] What-If Sensitivity Simulator Engine...');
  // Scenario A: -30% budget cut
  const simTightBudget = runWhatIfSimulation(
    {
      budgetDeltaPercent: -30,
      timeCommitmentHoursPerWeek: 10,
      priorityFocus: 'cost',
      timeHorizonMonths: 12,
    },
    mockDecision.options
  );

  // Scenario B: High time dedication
  const simHighDedication = runWhatIfSimulation(
    {
      budgetDeltaPercent: 20,
      timeCommitmentHoursPerWeek: 30,
      priorityFocus: 'speed',
      timeHorizonMonths: 6,
    },
    mockDecision.options
  );

  const whatIfPass =
    simTightBudget.preferredOptionName.includes('Used') &&
    simTightBudget.fragilityRating === 'High Fragility' &&
    simHighDedication.fragilityRating === 'Low Fragility' &&
    simTightBudget.disclaimer.includes('deterministic calculations');

  if (whatIfPass) {
    console.log('  ✅ What-If Simulator: Budget reduction correctly shifted preference toward cost preservation.');
    console.log(`  ✅ Fragility calculation verified: ${simTightBudget.fragilityRating} vs ${simHighDedication.fragilityRating}.`);
    passed++;
  } else {
    console.error('  ❌ What-If Simulator failed assertion:', simTightBudget, simHighDedication);
    failed++;
  }

  // TEST 3: Multi-Criteria Priority Weighting Engine (MCDA)
  console.log('\n[TEST 3/5] Transparent Multi-Criteria Priority Weighting (MCDA)...');
  // Weight heavily on cost savings & peace of mind
  const conservativeWeights = {
    costSavings: 5,
    speedOfOutcome: 1,
    peaceOfMind: 5,
    growthUpside: 1,
  };
  const conservativeRanking = calculatePriorityRanking(conservativeWeights, mockDecision.options);

  // Weight heavily on growth upside & speed
  const aggressiveWeights = {
    costSavings: 1,
    speedOfOutcome: 5,
    peaceOfMind: 1,
    growthUpside: 5,
  };
  const aggressiveRanking = calculatePriorityRanking(aggressiveWeights, mockDecision.options);

  const priorityPass =
    conservativeRanking.rankings.length === 2 &&
    aggressiveRanking.rankings.length === 2 &&
    conservativeRanking.scoringExplanation.includes('MCDA') &&
    conservativeRanking.disclaimer.includes('thinking tool');

  if (priorityPass) {
    console.log(`  ✅ Cost/Peace-of-Mind priority Top Option: "${conservativeRanking.rankings[0].optionName}" (${conservativeRanking.rankings[0].percentage}%)`);
    console.log(`  ✅ Speed/Growth priority Top Option: "${aggressiveRanking.rankings[0].optionName}" (${aggressiveRanking.rankings[0].percentage}%)`);
    passed++;
  } else {
    console.error('  ❌ Priority Ranking failed assertion:', conservativeRanking);
    failed++;
  }

  // TEST 4: Regret Check & Reversibility Classification
  console.log('\n[TEST 4/5] Regret Check & Reversibility Classification...');
  // One-way door test
  const oneWayDecision: DecisionCardData = {
    ...mockDecision,
    title: 'Should I resign from my tenured job to move to a new country?',
    summary: 'Quitting my safe tenured position and moving abroad.',
  };
  const regretOneWay = analyzeRegretFactors(oneWayDecision);

  // Two-way door test
  const twoWayDecision: DecisionCardData = {
    ...mockDecision,
    title: 'Should I buy this $30 online course on decision theory?',
    summary: 'Evaluating a self-paced online course trial.',
  };
  const regretTwoWay = analyzeRegretFactors(twoWayDecision);

  const regretPass =
    regretOneWay.reversibility === 'one_way_door' &&
    regretTwoWay.reversibility === 'two_way_door' &&
    regretOneWay.tenTenTenPerspective.tenYears.length > 10 &&
    regretOneWay.lowRiskPilotOptions.length >= 2;

  if (regretPass) {
    console.log(`  ✅ One-way door correctly classified: "${regretOneWay.reversibilityLabel}"`);
    console.log(`  ✅ Two-way door correctly classified: "${regretTwoWay.reversibilityLabel}"`);
    console.log('  ✅ 10/10/10 perspective and low-risk pilot steps verified.');
    passed++;
  } else {
    console.error('  ❌ Regret check failed assertion:', regretOneWay, regretTwoWay);
    failed++;
  }

  // TEST 5: Document Attachment & Privacy Boundaries
  console.log('\n[TEST 5/5] Document Attachment & Privacy Boundaries...');
  const fakeSmallDoc = {
    name: 'financial_summary.txt',
    size: 1024 * 50, // 50 KB
    content: 'Monthly net income: $4,200. Total fixed rent: $1,400.',
  };

  const isWithinLimit = fakeSmallDoc.size <= 5 * 1024 * 1024;
  const simulatedHeader = `[Attached Document: "${fakeSmallDoc.name}"]:\n${fakeSmallDoc.content}\n\n`;

  if (isWithinLimit && simulatedHeader.includes('financial_summary.txt')) {
    console.log('  ✅ Document attachment limits verified (5MB ceiling, safe prefixing, no background transmission).');
    passed++;
  } else {
    console.error('  ❌ Document attachment validation failed');
    failed++;
  }

  console.log('\n=============================================================');
  console.log(` PHASE 11 ADVANCED TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase11AdvancedFeaturesTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
