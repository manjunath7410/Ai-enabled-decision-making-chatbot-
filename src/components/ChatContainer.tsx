/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Message } from '../types/decision.ts';
import { ChatMessageItem } from './ChatMessageItem.tsx';
import { Sparkles, HelpCircle } from 'lucide-react';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onRetry: () => void;
  onQuickFollowUp?: (text: string) => void;
  onPrefill?: (text: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading,
  onRetry,
  onQuickFollowUp,
  onPrefill,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Relevant everyday follow-up suggestions to aid the user
  const quickFollowUps = [
    'What would you do in my shoes?',
    'What is the single biggest risk here?',
    'What if I do nothing for the next 3 months?',
    'Can you give me a simple 3-step action plan?',
  ];

  const lastAssistantIndex = messages
    .map((m, idx) => (m.role === 'assistant' ? idx : -1))
    .filter((idx) => idx !== -1)
    .pop();

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 overflow-y-auto"
      role="log"
      aria-live="polite"
    >
      <div className="space-y-2">
        {messages.map((message, index) => (
          <ChatMessageItem
            key={message.id || `msg-${index}`}
            message={message}
            isLastAssistant={index === lastAssistantIndex}
            onRetry={onRetry}
            isLoading={isLoading}
            onFollowUp={onQuickFollowUp}
            onPrefill={onPrefill}
          />
        ))}

        {/* Streaming / Reasoning Indicator if assistant has not output first chunk yet */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex w-full my-4 gap-3 sm:gap-4">
            <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shadow-2xs shrink-0">
              <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs border border-stone-200/80 p-4 shadow-xs flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-xs sm:text-sm text-stone-500 font-medium">
                Evaluating decision criteria...
              </span>
            </div>
          </div>
        )}

        {/* Quick follow-up chips when conversation is active and not loading */}
        {!isLoading && messages.length > 0 && onQuickFollowUp && (
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Explore further:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFollowUps.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => onQuickFollowUp(promptText)}
                  className="text-xs text-stone-700 bg-white hover:bg-stone-100 border border-stone-200/90 rounded-lg px-2.5 py-1.5 font-medium transition-colors shadow-2xs active:scale-98"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};
