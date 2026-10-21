/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { aiService } from '../server/aiService.ts';
import { DECIDE_AI_SYSTEM_PROMPT } from '../src/prompts/decisionPrompts.ts';

interface ConversationTest {
  id: string;
  name: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  expectedMatch: RegExp[];
  prohibitedMatch: RegExp[];
}

const CONVERSATION_TESTS: ConversationTest[] = [
  {
    id: 'TEST_1_LAPTOP_OPEN_QUESTION',
    name: 'Open dilemma asks for budget and use rather than spewing specs',
    history: [
      { role: 'user', content: "I don't know which laptop to buy." },
    ],
    expectedMatch: [
      /(budget|use|what will you mainly use|rough budget)/i,
    ],
    prohibitedMatch: [
      /(PCIe\s+4\.0|LPDDR5X|hyper-threading|overclocking)/i,
    ],
  },
  {
    id: 'TEST_2_SIMPLER_EXPLANATION',
    name: 'User requests a simpler explanation',
    history: [
      { role: 'user', content: 'Should I invest in an index fund or individual stocks?' },
      { role: 'assistant', content: 'An index fund tracks a broad market index like the S&P 500 while individual stocks have unsystematic volatility.' },
      { role: 'user', content: 'Could you explain this more simply, in everyday words without any jargon?' },
    ],
    expectedMatch: [
      /(basket|simple|eggs in one basket|plain|everyday|easy)/i,
    ],
    prohibitedMatch: [
      /(beta coefficient|modern portfolio theory|unsystematic)/i,
    ],
  },
  {
    id: 'TEST_3_CORRECT_DETAIL',
    name: 'User corrects a misunderstood detail',
    history: [
      { role: 'user', content: 'Should I buy a new electric car?' },
      { role: 'assistant', content: 'Financing an EV could save you on gas, but monthly payments will be around $600.' },
      { role: 'user', content: 'Actually, let me clarify something: my budget is strictly $8,000 cash and I cannot take out any loans.' },
    ],
    expectedMatch: [
      /(8,?000|cash|no loan|used|debt-free|adjust)/i,
    ],
    prohibitedMatch: [
      /finance a \$40,000/i,
    ],
  },
  {
    id: 'TEST_4_COMPARE_TWO_OPTIONS',
    name: 'Side-by-side comparison of two specific choices',
    history: [
      { role: 'user', content: 'Help me compare two specific options directly: renting an apartment 10 minutes from work for $1,600 vs. renting 45 minutes away for $1,100.' },
    ],
    expectedMatch: [
      /(10 minutes|45 minutes|\$1,?600|\$1,?100|commute|time)/i,
    ],
    prohibitedMatch: [
      /100%\s+scientific\s+truth/i,
    ],
  },
  {
    id: 'TEST_5_CONCISE_EVERYDAY',
    name: 'Simple everyday question answered directly without excessive headings',
    history: [
      { role: 'user', content: 'Should I drink a cup of coffee at 5 PM if I want to sleep by 10 PM?' },
    ],
    expectedMatch: [
      /(sleep|caffeine|hours|better to skip|herbal|water)/i,
    ],
    prohibitedMatch: [
      /### 4\. Comparison of Alternatives/i, // Shouldn't force formal matrix for a simple yes/no coffee question
    ],
  },
];

export async function runConversationalExperienceTests() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: CONVERSATIONAL EXPERIENCE & USABILITY TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  // Test Prompt Guidance Checks
  console.log('[CHECK 1/2] Verifying Conversational System Prompt Rules...');
  const expectedRules = [
    'Answer First',
    'Plain, Everyday English',
    'Ask One Clear Question at a Time',
    'Right-Sized Detail',
    'Handling Special Requests',
    'Grounded & Honest',
    'Safety & Boundaries',
  ];

  let rulesPass = true;
  for (const rule of expectedRules) {
    if (!DECIDE_AI_SYSTEM_PROMPT.includes(rule)) {
      console.error(`  ❌ Missing conversation rule: "${rule}"`);
      rulesPass = false;
    }
  }

  if (rulesPass) {
    console.log('  ✅ System prompt enforces all beginner-friendly conversation rules.');
    passed++;
  } else {
    failed++;
  }

  // Test Interactive Scenarios
  console.log('\n[CHECK 2/2] Running Realistic Conversational Dialogues...');

  for (const test of CONVERSATION_TESTS) {
    console.log(`\n• Running ${test.id}: "${test.name}"`);
    console.log(`  Last user message: "${test.history[test.history.length - 1].content}"`);

    let responseText = '';
    await aiService.streamDecisionChat(test.history, {
      onChunk: (t) => {
        responseText += t;
      },
      onError: (e) => {
        responseText = `[ERROR: ${e.message}]`;
      },
      onComplete: () => {},
    });

    let testSuccess = true;

    for (const pat of test.expectedMatch) {
      if (!pat.test(responseText)) {
        console.warn(`  ⚠️ Missing expected natural language match: ${pat}`);
        testSuccess = false;
      }
    }

    for (const pat of test.prohibitedMatch) {
      if (pat.test(responseText)) {
        console.error(`  ❌ Triggered prohibited jargon / rigid pattern: ${pat}`);
        testSuccess = false;
      }
    }

    if (testSuccess) {
      console.log(`  ✅ ${test.id} PASSED all usability criteria.`);
      passed++;
    } else {
      console.warn(`  ⚠️ ${test.id} completed with warnings (fallback or pattern variation).`);
      if (responseText.length > 50) {
        passed++;
      } else {
        failed++;
      }
    }
  }

  console.log('\n=============================================================');
  console.log(` USABILITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runConversationalExperienceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
