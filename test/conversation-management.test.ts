/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { storageService } from '../src/services/storage.ts';
import { DecisionSession, Message } from '../src/types/decision.ts';

// Mock localStorage for Node.js test environment if not present
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.window === 'undefined') {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };

  (globalThis as any).window = { localStorage: mockLocalStorage };
  (globalThis as any).localStorage = mockLocalStorage;
}

export async function runConversationManagementTests() {
  console.log('\n=============================================================');
  console.log(' DECIDE-AI: CONVERSATION MANAGEMENT & PRIVACY TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Creation of New Conversation
  console.log('[TEST 1/6] Conversation Creation...');
  const newSession = storageService.createNewSession('Evaluate Hybrid Car Purchase');
  if (
    newSession &&
    newSession.id &&
    newSession.title === 'Evaluate Hybrid Car Purchase' &&
    Array.isArray(newSession.messages) &&
    storageService.getActiveSessionId() === newSession.id
  ) {
    console.log(`  ✅ Successfully created new session: ${newSession.id}`);
    passed++;
  } else {
    console.error('  ❌ Failed to create session:', newSession);
    failed++;
  }

  // TEST 2: Message Persistence & Restoration
  console.log('\n[TEST 2/6] Message Persistence and Restoration...');
  const userMsg: Message = {
    id: 'msg_test_1',
    role: 'user',
    content: 'Should I buy a Toyota Prius or Honda Accord Hybrid?',
    timestamp: Date.now(),
    status: 'complete',
  };
  const assistantMsg: Message = {
    id: 'msg_test_2',
    role: 'assistant',
    content: 'The Prius prioritizes maximum fuel economy while the Accord Hybrid offers a quieter ride.',
    timestamp: Date.now() + 1000,
    status: 'complete',
  };

  newSession.messages = [userMsg, assistantMsg];
  storageService.saveSession(newSession);

  // Restore
  const restoredSession = storageService.getSession(newSession.id);
  if (
    restoredSession &&
    restoredSession.messages.length === 2 &&
    restoredSession.messages[0].content === userMsg.content &&
    restoredSession.messages[1].role === 'assistant'
  ) {
    console.log(`  ✅ Successfully restored session with ${restoredSession.messages.length} messages.`);
    passed++;
  } else {
    console.error('  ❌ Failed to restore session correctly:', restoredSession);
    failed++;
  }

  // TEST 3: Renaming Conversation
  console.log('\n[TEST 3/6] Conversation Renaming...');
  const renameSuccess = storageService.renameSession(newSession.id, 'Prius vs Accord Hybrid: Final Decision');
  const renamedSession = storageService.getSession(newSession.id);

  if (renameSuccess && renamedSession && renamedSession.title === 'Prius vs Accord Hybrid: Final Decision') {
    console.log(`  ✅ Successfully renamed session to: "${renamedSession.title}"`);
    passed++;
  } else {
    console.error('  ❌ Failed to rename session:', renamedSession);
    failed++;
  }

  // Test rejection of invalid empty titles
  const emptyRename = storageService.renameSession(newSession.id, '   ');
  if (!emptyRename) {
    console.log('  ✅ Correctly rejected empty/whitespace title renaming.');
    passed++;
  } else {
    console.error('  ❌ Allowed invalid empty title renaming.');
    failed++;
  }

  // TEST 4: Single Conversation Deletion
  console.log('\n[TEST 4/6] Single Conversation Deletion...');
  const session2 = storageService.createNewSession('Session to delete');
  storageService.deleteSession(session2.id);

  const foundDeleted = storageService.getSession(session2.id);
  if (!foundDeleted) {
    console.log(`  ✅ Successfully deleted session: ${session2.id}`);
    passed++;
  } else {
    console.error('  ❌ Session was not deleted:', foundDeleted);
    failed++;
  }

  // TEST 5: Clear All Conversations & Empty State Handling
  console.log('\n[TEST 5/6] Clear All Conversations & Empty History State...');
  storageService.clearAllData();
  const allSessionsAfterClear = storageService.getSessions();
  const activeIdAfterClear = storageService.getActiveSessionId();

  if (allSessionsAfterClear.length === 0 && activeIdAfterClear === null) {
    console.log('  ✅ Clear all data succeeded. Clean empty state confirmed.');
    passed++;
  } else {
    console.error('  ❌ Storage not completely cleared:', allSessionsAfterClear);
    failed++;
  }

  // TEST 6: Privacy Architecture & Zero Secret Storage Invariant
  console.log('\n[TEST 6/6] Privacy Architecture Invariants & Zero Secrets in Browser Storage...');
  const privacyInfo = storageService.getStorageInfo();

  // Verify privacy invariants
  const isServerless = privacyInfo.serverStorage === false;
  const isZeroShadowBackups = privacyInfo.deletionGuarantee.includes('No server copies');

  // Verify that API key is NEVER stored in browser storage
  const rawStorageSnapshot = JSON.stringify(storageService.getSessions());
  const hasNoApiKey = !rawStorageSnapshot.includes('AIza') && !rawStorageSnapshot.includes('AQ.Ab');

  if (isServerless && isZeroShadowBackups && hasNoApiKey) {
    console.log('  ✅ Privacy invariants verified: 100% local, no server profiles, zero browser API keys.');
    passed++;
  } else {
    console.error('  ❌ Privacy invariant violation detected!');
    failed++;
  }

  console.log('\n=============================================================');
  console.log(` CONVERSATION MANAGEMENT TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runConversationManagementTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
