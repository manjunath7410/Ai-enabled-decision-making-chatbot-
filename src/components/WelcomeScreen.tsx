/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Briefcase, GraduationCap, Wallet, Compass, Sparkles, ArrowRight } from 'lucide-react';
import { STARTER_SUGGESTIONS } from '../prompts/decisionPrompts.ts';
import { DecisionCategory } from '../types/decision.ts';

interface WelcomeScreenProps {
  onSelectSuggestion: (promptText: string, category: DecisionCategory) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'briefcase':
        return <Briefcase className="w-5 h-5 text-indigo-600" />;
      case 'graduation-cap':
        return <GraduationCap className="w-5 h-5 text-emerald-600" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-amber-600" />;
      case 'compass':
      default:
        return <Compass className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
      {/* Hero Badge & Typography */}
      <div className="text-center max-w-2xl mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300 text-stone-700 text-xs font-medium mb-5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Calm, structured decision support</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight sm:leading-tight mb-4">
          Let&apos;s make your next decision clearer.
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-sans leading-relaxed">
          Tell me what&apos;s on your mind. I&apos;ll help you explore your options.
        </p>
      </div>

      {/* 4 Clickable Suggestion Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {STARTER_SUGGESTIONS.map((card) => {
          return (
            <div
              key={card.id}
              className="group relative flex flex-col justify-between p-5 rounded-xl bg-white border border-stone-200/90 shadow-xs hover:border-stone-400/80 hover:shadow-md transition-all duration-200 text-left"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getIcon(card.icon)}
                  </div>
                  <span className="text-xs font-semibold text-stone-400 group-hover:text-stone-700 transition-colors">
                    Explore &rarr;
                  </span>
                </div>

                <h2 className="font-semibold text-stone-900 text-base mb-1 group-hover:text-stone-950">
                  {card.title}
                </h2>
                <p className="text-xs text-stone-500 font-medium mb-3">
                  {card.subtitle}
                </p>
                <p className="text-sm text-stone-600 leading-snug mb-4">
                  {card.description}
                </p>
              </div>

              {/* Sample Quick Action Prompt */}
              <div className="pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => onSelectSuggestion(card.exampleQuestions[0], card.id as DecisionCategory)}
                  className="w-full text-left text-xs text-stone-700 bg-stone-50 hover:bg-stone-100/90 p-2.5 rounded-lg border border-stone-200/60 font-medium transition-colors flex items-center justify-between gap-2"
                >
                  <span className="line-clamp-1 italic text-stone-600">
                    &ldquo;{card.exampleQuestions[0]}&rdquo;
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Methodology Micro-Callout */}
      <div className="w-full max-w-xl text-center py-2">
        <p className="text-xs text-stone-400">
          DecideAI uses transparent trade-off modeling and Gemini 3.8 Flash to outline benefits, risks, and next steps. All data is kept locally on your device.
        </p>
      </div>
    </div>
  );
};
