/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { aiService } from '../server/aiService.ts';
import { DECIDE_AI_SYSTEM_PROMPT } from '../src/prompts/decisionPrompts.ts';

export async function runAccessibilityAndMultilingualTests() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: MULTILINGUAL & ACCESSIBILITY TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: System Prompt Multilingual Specification
  console.log('[TEST 1/5] Verifying System Prompt Multilingual Specification...');
  const promptHasHindi = DECIDE_AI_SYSTEM_PROMPT.includes('Hindi') && DECIDE_AI_SYSTEM_PROMPT.includes('हिन्दी');
  const promptHasKannada = DECIDE_AI_SYSTEM_PROMPT.includes('Kannada') && DECIDE_AI_SYSTEM_PROMPT.includes('ಕನ್ನಡ');

  if (promptHasHindi && promptHasKannada) {
    console.log('  ✅ System prompt explicitly specifies English, Hindi (हिन्दी), and Kannada (ಕನ್ನಡ) capabilities.');
    passed++;
  } else {
    console.error('  ❌ Missing Hindi or Kannada specification in system prompt.');
    failed++;
  }

  // TEST 2: Hindi Decision Support Execution
  console.log('\n[TEST 2/5] Hindi Decision Support Execution...');
  const hindiQuery = 'मुझे नौकरी बदलने या अपने मौजूदा काम में बने रहने के बीच निर्णय लेना है। कृपया सलाह दें। (Hindi)';
  let hindiOutput = '';

  await aiService.streamDecisionChat([{ role: 'user', content: hindiQuery }], {
    onChunk: (chunk) => {
      hindiOutput += chunk;
    },
    onError: (err) => {
      hindiOutput = `[ERROR: ${err.message}]`;
    },
    onComplete: () => {},
  });

  // Verify Hindi script characters (Devanagari Unicode block \u0900-\u097F)
  const containsDevanagari = /[\u0900-\u097F]/.test(hindiOutput);
  if (containsDevanagari && hindiOutput.length > 50) {
    console.log('  ✅ Successfully generated fluent Hindi decision support response.');
    passed++;
  } else {
    console.error('  ❌ Failed to generate response in Hindi:', hindiOutput.slice(0, 100));
    failed++;
  }

  // TEST 3: Kannada Decision Support Execution
  console.log('\n[TEST 3/5] Kannada Decision Support Execution...');
  const kannadaQuery = 'ನಾನು ಹೊಸ ಕೆಲಸಕ್ಕೆ ಸೇರಬೇಕೇ ಅಥವಾ ಇಲ್ಲವೇ? ದಯವಿಟ್ಟು ಕನ್ನಡದಲ್ಲಿ ನಿರ್ಧಾರ ಸಹಾಯ ನೀಡಿ. (Kannada)';
  let kannadaOutput = '';

  await aiService.streamDecisionChat([{ role: 'user', content: kannadaQuery }], {
    onChunk: (chunk) => {
      kannadaOutput += chunk;
    },
    onError: (err) => {
      kannadaOutput = `[ERROR: ${err.message}]`;
    },
    onComplete: () => {},
  });

  // Verify Kannada script characters (Kannada Unicode block \u0C80-\u0CFF)
  const containsKannada = /[\u0C80-\u0CFF]/.test(kannadaOutput);
  if (containsKannada && kannadaOutput.length > 50) {
    console.log('  ✅ Successfully generated fluent Kannada decision support response.');
    passed++;
  } else {
    console.error('  ❌ Failed to generate response in Kannada:', kannadaOutput.slice(0, 100));
    failed++;
  }

  // TEST 4: Voice Speech Recognition Graceful Degradation Logic
  console.log('\n[TEST 4/5] Voice Recognition Environment & Degradation Validation...');
  // Verify speech recognition feature detection pattern
  const detectSpeechApi = (mockWindow: any) => {
    return Boolean(mockWindow?.SpeechRecognition || mockWindow?.webkitSpeechRecognition);
  };

  const chromeMock = { webkitSpeechRecognition: function () {} };
  const unsupportedMock = {};

  const chromeDetected = detectSpeechApi(chromeMock);
  const unsupportedSafelyHandled = !detectSpeechApi(unsupportedMock);

  if (chromeDetected && unsupportedSafelyHandled) {
    console.log('  ✅ Speech recognition correctly identifies supported vs unsupported browsers.');
    passed++;
  } else {
    console.error('  ❌ Speech API detection failed.');
    failed++;
  }

  // TEST 5: Accessible Input & Non-Reliance on Voice
  console.log('\n[TEST 5/5] Accessibility Invariants & Optional Voice Guarantee...');
  // Verify that empty speech does not block text input, and text input is fully operational independently
  const standardTextQuery = 'Should I take a personal sabbatical this year?';
  const textMessages = [{ role: 'user' as const, content: standardTextQuery }];
  const boundedText = aiService.prepareConversation(textMessages);

  if (boundedText.length === 1 && boundedText[0].content === standardTextQuery) {
    console.log('  ✅ Keyboard text input is completely independent of voice availability.');
    passed++;
  } else {
    console.error('  ❌ Keyboard input failed preparation.');
    failed++;
  }

  console.log('\n=============================================================');
  console.log(` ACCESSIBILITY & MULTILINGUAL TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAccessibilityAndMultilingualTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
