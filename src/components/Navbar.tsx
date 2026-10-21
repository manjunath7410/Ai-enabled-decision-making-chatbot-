/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, History, Shield, Scale } from 'lucide-react';

interface NavbarProps {
  onNewDecision: () => void;
  onOpenHistory: () => void;
  onOpenPrivacy: () => void;
  savedCount: number;
  currentTitle?: string;
  isChatActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewDecision,
  onOpenHistory,
  onOpenPrivacy,
  savedCount,
  currentTitle,
  isChatActive,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNewDecision}
            className="flex items-center gap-2.5 text-left group focus:outline-hidden focus:ring-2 focus:ring-stone-400 rounded-lg p-1 -m-1"
            title="DecideAI Home"
            aria-label="DecideAI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xs group-hover:bg-stone-800 transition-colors">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 tracking-tight text-base sm:text-lg">
                  DecideAI
                </span>
                <span className="hidden md:inline-block text-[11px] font-medium tracking-wide text-stone-500 uppercase px-2 py-0.5 rounded-sm bg-stone-200/60 border border-stone-300/60">
                  Decision Support
                </span>
              </div>
              {isChatActive && currentTitle && (
                <p className="text-xs text-stone-500 truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                  {currentTitle}
                </p>
              )}
            </div>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isChatActive && (
            <button
              onClick={onNewDecision}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100/80 hover:text-stone-900 active:bg-stone-200 shadow-2xs transition-all focus:outline-hidden focus:ring-2 focus:ring-stone-400"
              title="Start a new decision (Ctrl+N)"
              aria-label="Start a new decision"
            >
              <Plus className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">New Decision</span>
            </button>
          )}

          <button
            onClick={onOpenHistory}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 transition-colors focus:outline-hidden focus:ring-2 focus:ring-stone-400"
            title="View Decision History"
            aria-label={`View Decision History (${savedCount} saved)`}
          >
            <History className="w-4 h-4 text-stone-600" />
            <span className="hidden sm:inline">History</span>
            {savedCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenPrivacy}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors focus:outline-hidden focus:ring-2 focus:ring-stone-400"
            title="Privacy & Data Transparency"
            aria-label="Privacy & Data Transparency"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
