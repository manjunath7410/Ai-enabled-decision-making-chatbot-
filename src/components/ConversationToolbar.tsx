/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  BookOpen,
  Scale,
  Edit3,
  RotateCcw,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface ConversationToolbarProps {
  onQuickAction: (actionText: string) => void;
  onNewDecision: () => void;
  onPrefillInput: (text: string) => void;
  isLoading: boolean;
  hasMessages: boolean;
}

export const ConversationToolbar: React.FC<ConversationToolbarProps> = ({
  onQuickAction,
  onNewDecision,
  onPrefillInput,
  isLoading,
  hasMessages,
}) => {
  if (!hasMessages) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      {/* Primary Interaction Actions */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 pb-2 border-t border-stone-200/60">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Quick Actions:
        </span>

        {/* 1. Simpler Explanation */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onQuickAction('Could you explain this more simply, in everyday words without any jargon?')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
          title="Explain in simpler, everyday words"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Explain simply</span>
        </button>

        {/* 2. Deeper Analysis */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onQuickAction('Can you give me a deeper breakdown of the alternatives, trade-offs, and key risks?')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
          title="Get a more thorough, detailed breakdown"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>More details</span>
        </button>

        {/* 3. Compare Two Options */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onQuickAction('Help me compare two specific options directly: what are the pros, cons, and which one fits me better?')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
          title="Direct head-to-head comparison"
        >
          <Scale className="w-3.5 h-3.5 text-emerald-600" />
          <span>Compare 2 options</span>
        </button>

        {/* 4. Correct / Clarify Misunderstood Detail */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onPrefillInput('Actually, let me clarify something about my situation: ')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
          title="Correct or add a detail to the conversation"
        >
          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
          <span>Correct a detail</span>
        </button>

        {/* 5. Decision Replay */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() =>
            onQuickAction(
              "Let's do a Decision Replay: compare my original baseline assumptions against new information or what has changed since then."
            )
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
          title="Revisit original assumptions and test against updated facts"
        >
          <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
          <span>Decision replay</span>
        </button>

        {/* 6. Start a New Decision */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onNewDecision}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors disabled:opacity-50 ml-auto"
          title="Start fresh with a new decision"
        >
          <RotateCcw className="w-3 h-3" />
          <span>New decision</span>
        </button>
      </div>
    </div>
  );
};
