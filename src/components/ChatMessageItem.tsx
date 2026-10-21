/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Copy, Check, RotateCcw, AlertCircle, Scale, LayoutList, AlignLeft } from 'lucide-react';
import { Message } from '../types/decision.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { DecisionSummaryCard } from './DecisionSummaryCard.tsx';
import { parseDecisionContent, detectDecisionMode } from '../services/decisionParser.ts';

interface ChatMessageItemProps {
  message: Message;
  isLastAssistant: boolean;
  onRetry?: () => void;
  isLoading: boolean;
  onFollowUp?: (prompt: string) => void;
  onPrefill?: (text: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLastAssistant,
  onRetry,
  isLoading,
  onFollowUp,
  onPrefill,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'text'>('card');
  const isUser = message.role === 'user';
  const isError = message.status === 'error' || Boolean(message.error);
  const isStreaming = message.status === 'streaming';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(message.timestamp));

  // Extract structured decision data if this message is a complex recommendation
  const decisionCardData = useMemo(() => {
    if (isUser || isStreaming || !message.content) return null;
    return parseDecisionContent(message.content);
  }, [message.content, isUser, isStreaming]);

  // Detected automatic mode
  const detectedMode = useMemo(() => {
    if (isUser || !message.content) return 'conversational';
    return detectDecisionMode(message.content);
  }, [message.content, isUser]);

  if (isUser) {
    return (
      <div className="flex justify-end w-full my-4">
        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-stone-400">
            <span>You</span>
            <span>&bull;</span>
            <time>{formattedTime}</time>
          </div>
          <div className="bg-stone-900 text-stone-50 rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full my-4 gap-3 sm:gap-4">
      {/* Assistant Avatar Badge */}
      <div className="shrink-0 pt-1">
        <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shadow-2xs">
          <Scale className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      {/* Assistant Content Container */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 text-xs text-stone-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-stone-700">DecideAI</span>
            <span>&bull;</span>
            <time>{formattedTime}</time>
            {isStreaming ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 font-mono text-[10px]">
                Reasoning...
              </span>
            ) : detectedMode === 'decision_analysis' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium text-[10px]">
                Smart Decision Mode
              </span>
            ) : detectedMode === 'comparison' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 font-medium text-[10px]">
                Option Comparison
              </span>
            ) : detectedMode === 'clarification' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-medium text-[10px]">
                Clarification Needed
              </span>
            ) : detectedMode === 'action_plan' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-medium text-[10px]">
                Action Plan
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {decisionCardData && (
              <button
                onClick={() => setViewMode(viewMode === 'card' ? 'text' : 'card')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                title={viewMode === 'card' ? 'View as text' : 'View structured card'}
              >
                {viewMode === 'card' ? (
                  <>
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Text View</span>
                  </>
                ) : (
                  <>
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Card View</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              title="Copy response"
              aria-label="Copy response"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLastAssistant && onRetry && !isLoading && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                title="Regenerate this response"
                aria-label="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Body or Structured Decision Card */}
        {decisionCardData && viewMode === 'card' ? (
          <DecisionSummaryCard
            data={decisionCardData}
            onFollowUp={(prompt) => onFollowUp?.(prompt)}
            onCorrectAssumption={(text) => onPrefill?.(text)}
          />
        ) : (
          <div className="bg-white rounded-2xl rounded-tl-xs border border-stone-200/80 p-4 sm:p-5 shadow-xs">
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : isStreaming ? (
              <div className="flex items-center gap-2 py-2 text-stone-500 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Analyzing options and trade-offs...</span>
              </div>
            ) : null}

            {/* Error Banner */}
            {isError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-xs uppercase tracking-wide text-red-700">
                    Notice
                  </p>
                  <p className="text-sm mt-0.5">
                    {message.error || 'A problem occurred while retrieving the decision advice.'}
                  </p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-900 underline hover:no-underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
