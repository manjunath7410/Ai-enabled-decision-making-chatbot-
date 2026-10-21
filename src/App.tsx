/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { ChatContainer } from './components/ChatContainer.tsx';
import { ChatComposer } from './components/ChatComposer.tsx';
import { ConversationToolbar } from './components/ConversationToolbar.tsx';
import { HistoryDrawer } from './components/HistoryDrawer.tsx';
import { PrivacyModal } from './components/PrivacyModal.tsx';
import { storageService } from './services/storage.ts';
import { apiService } from './services/api.ts';
import { DecisionSession, Message, DecisionCategory } from './types/decision.ts';

export default function App() {
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DecisionSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [composerPreset, setComposerPreset] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef<boolean>(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const loadedSessions = storageService.getSessions();
    setSessions(loadedSessions);

    const activeId = storageService.getActiveSessionId();
    if (activeId) {
      const active = loadedSessions.find((s) => s.id === activeId);
      if (active && active.messages.length > 0) {
        setCurrentSession(active);
        return;
      }
    }

    // Default to a fresh empty session
    const fresh = storageService.createNewSession();
    setCurrentSession(fresh);
  }, []);

  // Save current session to storage and session list when updated
  const syncSession = useCallback((updated: DecisionSession) => {
    setCurrentSession(updated);
    storageService.saveSession(updated);
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  // Handler for starting a new decision
  const handleNewDecision = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    const newSession = storageService.createNewSession();
    setCurrentSession(newSession);
    setComposerPreset('');
  }, []);

  // Handler for selecting past session from history
  const handleSelectSession = useCallback((id: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    const session = storageService.getSession(id);
    if (session) {
      setCurrentSession(session);
      storageService.setActiveSessionId(session.id);
    }
  }, []);

  // Handler for deleting a session
  const handleDeleteSession = useCallback((id: string) => {
    storageService.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSession?.id === id) {
      handleNewDecision();
    }
  }, [currentSession, handleNewDecision]);

  // Handler for renaming a session
  const handleRenameSession = useCallback((id: string, newTitle: string) => {
    const success = storageService.renameSession(id, newTitle);
    if (success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim(), updatedAt: Date.now() } : s))
      );
      if (currentSession?.id === id) {
        setCurrentSession((prev) =>
          prev ? { ...prev, title: newTitle.trim(), updatedAt: Date.now() } : null
        );
      }
    }
  }, [currentSession]);

  // Handler for clearing all local data
  const handleClearAllData = useCallback(() => {
    storageService.clearAllData();
    setSessions([]);
    handleNewDecision();
  }, [handleNewDecision]);

  // Handler to cancel ongoing streaming
  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isSendingRef.current = false;
    setIsLoading(false);

    if (currentSession) {
      const lastMsg = currentSession.messages[currentSession.messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'streaming') {
        const updatedMessages = [...currentSession.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMsg,
          status: 'complete',
          content: lastMsg.content || '*(Generation paused by user)*',
        };
        syncSession({ ...currentSession, messages: updatedMessages, updatedAt: Date.now() });
      }
    }
  }, [currentSession, syncSession]);

  // Main message sender logic
  const handleSendMessage = useCallback(
    async (content: string, category?: DecisionCategory) => {
      if (!currentSession || isLoading || isSendingRef.current) return;
      isSendingRef.current = true;

      const userMessage: Message = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'complete',
      };

      const assistantMessageId = 'msg_' + (Date.now() + 1);
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now() + 1,
        status: 'streaming',
      };

      // Generate a title from the first message if this is the start
      const updatedTitle =
        currentSession.messages.length === 0
          ? content.length > 50
            ? content.slice(0, 47) + '...'
            : content
          : currentSession.title;

      const updatedMessages = [...currentSession.messages, userMessage, assistantMessage];
      const updatedSession: DecisionSession = {
        ...currentSession,
        title: updatedTitle,
        category: category || currentSession.category,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };

      syncSession(updatedSession);
      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulatedContent = '';

      await apiService.streamChat(
        [...currentSession.messages, userMessage],
        {
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            setCurrentSession((prev) => {
              if (!prev) return null;
              const msgs = [...prev.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMessageId);
              if (targetIdx >= 0) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content: accumulatedContent,
                  status: 'streaming',
                };
              }
              return { ...prev, messages: msgs, updatedAt: Date.now() };
            });
          },
          onError: (errorMessage: string) => {
            isSendingRef.current = false;
            setIsLoading(false);
            setCurrentSession((prev) => {
              if (!prev) return null;
              const msgs = [...prev.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMessageId);
              if (targetIdx >= 0) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content: accumulatedContent,
                  status: 'error',
                  error: errorMessage,
                };
              }
              const finalSession = { ...prev, messages: msgs, updatedAt: Date.now() };
              storageService.saveSession(finalSession);
              return finalSession;
            });
          },
          onComplete: () => {
            isSendingRef.current = false;
            setIsLoading(false);
            setCurrentSession((prev) => {
              if (!prev) return null;
              const msgs = [...prev.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMessageId);
              if (targetIdx >= 0) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content: accumulatedContent,
                  status: 'complete',
                };
              }
              const finalSession = { ...prev, messages: msgs, updatedAt: Date.now() };
              storageService.saveSession(finalSession);
              setSessions((sPrev) => {
                const idx = sPrev.findIndex((s) => s.id === finalSession.id);
                if (idx >= 0) {
                  const copy = [...sPrev];
                  copy[idx] = finalSession;
                  return copy;
                }
                return [finalSession, ...sPrev];
              });
              return finalSession;
            });
          },
        },
        controller.signal
      );
    },
    [currentSession, isLoading, syncSession]
  );

  // Retry the last message
  const handleRetry = useCallback(() => {
    if (!currentSession || isLoading) return;
    const msgs = [...currentSession.messages];
    if (msgs.length === 0) return;

    // Find the last user message
    let lastUserMessage: Message | null = null;
    let cutoffIndex = msgs.length;

    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserMessage = msgs[i];
        cutoffIndex = i;
        break;
      }
    }

    if (!lastUserMessage) return;

    // Prune back to just before this user message and re-send
    const prunedSession: DecisionSession = {
      ...currentSession,
      messages: msgs.slice(0, cutoffIndex),
    };
    setCurrentSession(prunedSession);
    handleSendMessage(lastUserMessage.content);
  }, [currentSession, isLoading, handleSendMessage]);

  // Suggestion card clicked on Welcome Screen
  const handleSelectSuggestion = useCallback(
    (promptText: string, category: DecisionCategory) => {
      handleSendMessage(promptText, category);
    },
    [handleSendMessage]
  );

  const hasMessages = Boolean(currentSession && currentSession.messages.length > 0);

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Navigation Header */}
      <Navbar
        onNewDecision={handleNewDecision}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        savedCount={sessions.filter((s) => s.messages.length > 0).length}
        currentTitle={currentSession?.title}
        isChatActive={hasMessages}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between overflow-x-hidden">
        {!hasMessages ? (
          <div className="flex-1 flex flex-col justify-center">
            <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} />
          </div>
        ) : (
          <ChatContainer
            messages={currentSession?.messages || []}
            isLoading={isLoading}
            onRetry={handleRetry}
            onQuickFollowUp={(followUpText) => handleSendMessage(followUpText)}
            onPrefill={(text) => setComposerPreset(text)}
          />
        )}

        {/* Bottom Interactive Area */}
        <div className="w-full bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent pt-1">
          <ConversationToolbar
            onQuickAction={(actionText) => handleSendMessage(actionText)}
            onNewDecision={handleNewDecision}
            onPrefillInput={(text) => {
              setComposerPreset(text);
            }}
            isLoading={isLoading}
            hasMessages={hasMessages}
          />
          <ChatComposer
            onSendMessage={(msg) => {
              handleSendMessage(msg);
              setComposerPreset('');
            }}
            isLoading={isLoading}
            onCancelRequest={handleCancelRequest}
            initialValue={composerPreset}
            placeholder={
              hasMessages
                ? 'Type your reply, clarify your priorities, or ask for next steps...'
                : "Describe your dilemma (e.g. 'Should I accept a new job with a longer commute?')"
            }
          />
        </div>
      </main>

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions.filter((s) => s.messages.length > 0)}
        activeSessionId={currentSession?.id || null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewDecision}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllData}
      />

      {/* Privacy & Transparency Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onClearAllData={handleClearAllData}
        savedDecisionsCount={sessions.filter((s) => s.messages.length > 0).length}
      />
    </div>
  );
}
