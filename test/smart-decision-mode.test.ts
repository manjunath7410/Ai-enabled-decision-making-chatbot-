/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { aiService } from '../server/aiService.ts';
import { DECIDE_AI_SYSTEM_PROMPT } from '../src/prompts/decisionPrompts.ts';
import { parseDecisionContent, detectDecisionMode } from '../src/services/decisionParser.ts';

interface TestCase {
  id: string;
  name: string;
  query: string;
  validate: (response: string) => void;
}

export async function runSmartDecisionModeTestSuite() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: SMART DECISION MODE AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------------------
  // TEST 1: SYSTEM PROMPT SPECIFICATION VERIFICATION
  // -------------------------------------------------------------------------
  console.log('[CHECK 1/2] Verifying Smart Decision Mode System Prompt Rules...');
  const prompt = DECIDE_AI_SYSTEM_PROMPT;

  const checks = [
    { rule: 'Mode 1: Simple Conversational / Factual Answer', match: prompt.includes('Mode 1: Simple Conversational') },
    { rule: 'Mode 2: Problem Understanding & Smart Clarification', match: prompt.includes('Mode 2: Problem Understanding') },
    { rule: 'Mode 3: Option Comparison', match: prompt.includes('Mode 3: Option Comparison') },
    { rule: 'Mode 4: Structured Decision Support', match: prompt.includes('Mode 4: Structured Decision Support') },
    { rule: 'Mode 5: Practical Action Plan', match: prompt.includes('Mode 5: Practical Action Plan') },
    { rule: 'Max 3 clarifying questions constraint', match: prompt.includes('maximum of 3 clarifying questions') },
    { rule: 'Sections A-G definition', match: prompt.includes('### A. Understanding Your Situation') && prompt.includes('### G. Next Steps') },
    { rule: 'Never fabricate confidence percentages', match: prompt.includes('NEVER fabricate confidence percentages') },
  ];

  for (const c of checks) {
    if (!c.match) {
      console.error(`  ❌ Missing prompt specification for: ${c.rule}`);
      failed++;
    }
  }

  if (checks.every((c) => c.match)) {
    console.log('  ✅ System prompt enforces all Smart Decision Mode specifications.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: THE 8 REQUIRED DECISION SCENARIOS
  // -------------------------------------------------------------------------
  console.log('\n[CHECK 2/2] Running The 8 Required Decision Scenarios...\n');

  const scenarios: TestCase[] = [
    // Scenario 1: Choosing between two job offers
    {
      id: 'SCENARIO_1_JOB_OFFERS',
      name: 'Choosing between two job offers (Startup vs Big Tech)',
      query: 'I have two job offers: an early-stage startup offering $120k + equity vs. a Big Tech corporate offer for $155k + benefits. How should I choose?',
      validate: (response) => {
        const mode = detectDecisionMode(response);
        if (mode !== 'decision_analysis' && mode !== 'comparison') {
          throw new Error(`Expected decision_analysis or comparison mode, got: ${mode}`);
        }
        const parsed = parseDecisionContent(response);
        if (!parsed) {
          throw new Error('Failed to parse structured decision card for job offer dilemma');
        }
        if (parsed.options.length < 2) {
          throw new Error(`Expected at least 2 options, found ${parsed.options.length}`);
        }
        if (parsed.nextSteps.length > 5) {
          throw new Error(`Next steps must be capped at 5, found ${parsed.nextSteps.length}`);
        }
        if (!response.toLowerCase().includes('120') || !response.toLowerCase().includes('155')) {
          throw new Error('Response did not address the stated salary figures ($120k vs $155k)');
        }
      },
    },

    // Scenario 2: Choosing an educational course
    {
      id: 'SCENARIO_2_EDUCATIONAL_COURSE',
      name: 'Choosing an educational course (Bootcamp vs Self-paced)',
      query: 'I want to learn web development. Should I join an expensive 3-month coding bootcamp or do self-paced online courses while keeping my job?',
      validate: (response) => {
        const mode = detectDecisionMode(response);
        if (mode !== 'decision_analysis' && mode !== 'comparison') {
          throw new Error(`Expected decision_analysis or comparison, got: ${mode}`);
        }
        const parsed = parseDecisionContent(response);
        if (!parsed) {
          throw new Error('Failed to parse structured decision card for educational course');
        }
        if (!response.toLowerCase().includes('bootcamp') || !response.toLowerCase().includes('self-paced')) {
          throw new Error('Response did not compare bootcamp vs self-paced courses');
        }
        if (parsed.nextSteps.length > 5) {
          throw new Error(`Next steps exceeded maximum of 5: ${parsed.nextSteps.length}`);
        }
      },
    },

    // Scenario 3: Deciding whether a purchase fits a budget
    {
      id: 'SCENARIO_3_PURCHASE_BUDGET',
      name: 'Deciding whether a purchase fits a budget ($2,000 vs $800 with $1,000 cap)',
      query: 'My strict budget is $1,000 cash. Should I buy a $2,000 high-end computer on credit, or an $800 reliable machine and keep my $200 savings?',
      validate: (response) => {
        const lower = response.toLowerCase();
        if (!lower.includes('budget') && !lower.includes('1,000') && !lower.includes('800')) {
          throw new Error('Response failed to respect stated budget constraints');
        }
        const parsed = parseDecisionContent(response);
        if (!parsed) {
          throw new Error('Expected structured analysis for budget purchase dilemma');
        }
        if (parsed.options.length < 2) {
          throw new Error('Expected at least 2 budget options evaluated');
        }
      },
    },

    // Scenario 4: Comparing two everyday alternatives
    {
      id: 'SCENARIO_4_EVERYDAY_ALTERNATIVES',
      name: 'Comparing two everyday alternatives (Apartment 10 min vs 45 min away)',
      query: 'Help me compare two apartment options: renting 10 minutes from work for $1,600/month vs. renting 45 minutes away for $1,100/month.',
      validate: (response) => {
        const mode = detectDecisionMode(response);
        if (mode !== 'comparison' && mode !== 'decision_analysis') {
          throw new Error(`Expected comparison or decision_analysis mode, got: ${mode}`);
        }
        const parsed = parseDecisionContent(response);
        if (!parsed) {
          throw new Error('Failed to parse comparison data for apartment options');
        }
        if (parsed.options.length < 2) {
          throw new Error('Expected 2 apartment comparison options');
        }
      },
    },

    // Scenario 5: A decision request with missing information
    {
      id: 'SCENARIO_5_MISSING_INFO',
      name: 'A decision request with missing information (Investing $10,000)',
      query: 'I want to invest $10,000. What should I do?',
      validate: (response) => {
        const lower = response.toLowerCase();
        // Should ask a short clarifying question about timeline or risk without an overwhelming questionnaire
        if (!response.includes('?') && !lower.includes('timeline')) {
          throw new Error('Response did not ask clarifying question for underspecified investment request');
        }
        const questionsCount = (response.match(/\?/g) || []).length;
        if (questionsCount > 3) {
          throw new Error(`Asked too many questions (${questionsCount}). Maximum allowed is 3.`);
        }
      },
    },

    // Scenario 6: Inconclusive evidence / close call
    {
      id: 'SCENARIO_6_INCONCLUSIVE_DECISION',
      name: 'A decision where the available evidence is inconclusive (Close call)',
      query: 'I cannot decide between two equally balanced paths with identical trade-offs. The evidence is completely inconclusive and 50/50. Which should I pick?',
      validate: (response) => {
        const parsed = parseDecisionContent(response);
        if (!parsed) {
          throw new Error('Expected structured breakdown for inconclusive decision');
        }
        if (parsed.status !== 'uncertain') {
          throw new Error(`Expected status to be "uncertain" for inconclusive choice, got: ${parsed.status}`);
        }
        if (!parsed.uncertaintyReason) {
          throw new Error('Expected uncertaintyReason to be populated instead of arbitrary winner');
        }
      },
    },

    // Scenario 7: A simple factual question that should not trigger a long analysis
    {
      id: 'SCENARIO_7_SIMPLE_FACTUAL',
      name: 'Simple factual question that should NOT trigger a long analysis',
      query: 'Should I drink a cup of coffee at 5 PM if I want to sleep by 10 PM?',
      validate: (response) => {
        const mode = detectDecisionMode(response);
        if (mode !== 'conversational') {
          throw new Error(`Simple factual query should be "conversational" mode, got: ${mode}`);
        }
        const parsed = parseDecisionContent(response);
        if (parsed !== null) {
          throw new Error('Simple factual question should NOT trigger a structured decision card');
        }
        if (response.length > 800) {
          throw new Error(`Simple answer is too long (${response.length} characters). Keep it concise.`);
        }
      },
    },

    // Scenario 8: A failed API request
    {
      id: 'SCENARIO_8_FAILED_API_REQUEST',
      name: 'Graceful handling of failed API requests (No secrets leaked, actionable guidance)',
      query: '__TRIGGER_API_FAILURE_TEST__',
      validate: () => {
        // Validate error taxonomy categorization in aiService
        const simulatedError = new Error('Simulated upstream network timeout');
        const categorized = (aiService as any).categorizeError(simulatedError);
        if (!categorized.status) {
          throw new Error('Failed to categorize error status code');
        }
        if (!categorized.userMessage) {
          throw new Error('Categorized error must have a userMessage');
        }
        // Verify no secrets or sensitive internal strings are returned to user
        if (categorized.userMessage.includes('AIzaSy') || categorized.userMessage.includes('process.env')) {
          throw new Error('Categorized error disclosed internal API key secrets!');
        }
      },
    },
  ];

  for (const scenario of scenarios) {
    process.stdout.write(`• Running ${scenario.id}: "${scenario.name}"\n`);
    try {
      if (scenario.id === 'SCENARIO_8_FAILED_API_REQUEST') {
        scenario.validate('');
        console.log(`  ✅ ${scenario.id} PASSED all reliability criteria.\n`);
        passed++;
        continue;
      }

      let captured = '';
      await aiService.streamDecisionChat(
        [{ role: 'user', content: scenario.query }],
        {
          onChunk: (chunk) => {
            captured += chunk;
          },
          onError: (err: any) => {
            throw new Error(typeof err === 'string' ? err : err?.message || 'Error occurred');
          },
          onComplete: () => {},
        }
      );

      scenario.validate(captured);
      console.log(`  ✅ ${scenario.id} PASSED all requirements.\n`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ ${scenario.id} FAILED:`, err.message, '\n');
      failed++;
    }
  }

  console.log('=============================================================');
  console.log(` SMART DECISION MODE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('smart-decision-mode.test.ts')) {
  runSmartDecisionModeTestSuite().catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  });
}
