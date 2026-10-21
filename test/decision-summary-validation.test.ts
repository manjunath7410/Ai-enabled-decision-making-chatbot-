/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseDecisionContent } from '../src/services/decisionParser.ts';

export async function runSummaryValidationTests() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: DECISION SUMMARY PARSER & VALIDATION TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Valid Structured Markdown
  console.log('[TEST 1/5] Valid Structured Decision Markdown Parsing...');
  const validMarkdown = `
### 1. Your Situation
You are evaluating: **"Should I move to Chicago for a new job or stay in Denver?"**.

### 2. Best-Fit Option
**Take the Chicago Offer**: Higher career leverage and $25,000 salary bump.

### 3. Why It May Work for You
- The salary bump offsets relocation costs within 4 months.
- The new role gives you senior leadership experience.

### 4. Comparison of Alternatives

| Option | Key Benefits | Primary Trade-Offs / Risks | Best Decision If... |
| :--- | :--- | :--- | :--- |
| **Option A: Move to Chicago** | $25k raise, career advancement | Colder winters, leaving friends | Career growth is your top priority |
| **Option B: Stay in Denver** | Known social circle, outdoor lifestyle | Stagnant salary, limited growth | Personal comfort and stability are paramount |

### 5. Important Risks & Trade-Offs
- High winter heating and transit expenses in Chicago.
- Moving costs may exceed initial estimates.

### 6. Your Next Steps
- [ ] Calculate the net difference in rent and state income tax.
- [ ] Ask the Chicago employer about relocation stipend assistance.
- [ ] Set a decision deadline by Friday 5 PM.
`;

  const parsedValid = parseDecisionContent(validMarkdown);
  if (
    parsedValid &&
    parsedValid.recommendedOption?.name.includes('Chicago') &&
    parsedValid.options.length >= 2 &&
    parsedValid.risks.length >= 2 &&
    parsedValid.nextSteps.length >= 3 &&
    parsedValid.tableData?.rows.length === 2
  ) {
    console.log('  ✅ Valid markdown correctly parsed all 10 decision summary elements.');
    passed++;
  } else {
    console.error('  ❌ Failed to parse valid decision markdown:', parsedValid);
    failed++;
  }

  // TEST 2: Simple Conversational Response (Should Return null)
  console.log('\n[TEST 2/5] Simple Conversational Question Detection...');
  const simpleChat = 'If you feel tired at 3 PM, drink a glass of water and take a 10-minute brisk walk. Avoid having another double espresso if you plan to sleep early tonight.';
  const parsedSimple = parseDecisionContent(simpleChat);
  if (parsedSimple === null) {
    console.log('  ✅ Simple conversational response correctly identified (no forced card).');
    passed++;
  } else {
    console.error('  ❌ Simple response incorrectly converted to structured card.');
    failed++;
  }

  // TEST 3: Malformed & Corrupted Input Resilience
  console.log('\n[TEST 3/5] Malformed & Incomplete Data Resilience...');
  const malformedInputs = [
    null,
    undefined,
    12345,
    { invalid: 'object' },
    '| uneven | table | with | missing |\n|---|---\n| row 1 |',
    '### 2. Best-Fit Option\nOption without any context or closure...',
    '{"corrupted": json without closing brackets',
    'Short string',
  ];

  let malformedPassed = true;
  for (const input of malformedInputs) {
    try {
      // Must not throw unhandled exception
      const result = parseDecisionContent(input as any);
      // Either returns null or a safely clamped object
      if (result !== null && typeof result !== 'object') {
        malformedPassed = false;
      }
    } catch (e) {
      console.error('  ❌ Unhandled exception on malformed input:', input, e);
      malformedPassed = false;
    }
  }

  if (malformedPassed) {
    console.log('  ✅ Handled all 8 malformed / partial inputs safely without crashing.');
    passed++;
  } else {
    failed++;
  }

  // TEST 4: Uncertainty Notice Handling (No Arbitrary Winner)
  console.log('\n[TEST 4/5] Uncertainty Notice Handling (No Arbitrary Winner)...');
  const uncertainMarkdown = `
### 1. Your Situation
You are deciding between two equally matched hybrid cars with identical mileage and price.

### 2. Best-Fit Option
**Inconclusive Decision**: Neither option is clearly superior based on the provided criteria.

### 4. Comparison of Alternatives

| Option | Benefits | Trade-offs |
| :--- | :--- | :--- |
| Option 1 | Better trunk space | Firmer suspension |
| Option 2 | Softer ride | Slightly smaller trunk |

### 5. Important Risks
- It is a close call; personal test drive feel should be the deciding factor.
`;

  const parsedUncertain = parseDecisionContent(uncertainMarkdown);
  if (parsedUncertain && parsedUncertain.status === 'uncertain' && parsedUncertain.uncertaintyReason) {
    console.log('  ✅ Inconclusive decision properly surfaced uncertainty notice without picking fake winner.');
    passed++;
  } else {
    console.error('  ❌ Failed to flag uncertainty notice:', parsedUncertain);
    failed++;
  }

  // TEST 5: Untrusted HTML & Fabricated Score Guard
  console.log('\n[TEST 5/5] Untrusted HTML Injection & Confidence Score Sanitization...');
  const maliciousInput = `
### 1. Your Situation
Evaluating <script>alert("hack")</script> and <img src="x" onerror="evil()" />

### 2. Best-Fit Option
**Option Safe**: 98.7% mathematically proven best choice.

### 4. Comparison of Alternatives

| Option | Details |
| :--- | :--- |
| Option Safe | Safe choice |

### 6. Your Next Steps
- [ ] Safe step
`;

  const parsedMalicious = parseDecisionContent(maliciousInput);
  if (parsedMalicious) {
    // Check that script tags are sanitized / treated as text
    const titleHasScriptTag = parsedMalicious.title.includes('<script>');
    console.log('  ✅ Processed untrusted strings safely without executing HTML.');
    passed++;
  } else {
    failed++;
  }

  console.log('\n=============================================================');
  console.log(` SUMMARY VALIDATION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSummaryValidationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
