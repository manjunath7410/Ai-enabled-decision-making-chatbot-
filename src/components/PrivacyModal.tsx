/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldCheck, Lock, Database, Trash2, Cpu } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllData: () => void;
  savedDecisionsCount: number;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onClearAllData,
  savedDecisionsCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 id="privacy-modal-title" className="font-semibold text-stone-900 text-lg">
              Privacy & Data Transparency
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-sm text-stone-600 max-h-[75vh] overflow-y-auto">
          <div className="flex gap-3 items-start">
            <Lock className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-stone-900">Zero Account Tracking</p>
              <p className="mt-0.5 leading-relaxed">
                DecideAI does not require an account, email, or personal identifier. We don&apos;t track who you are or profile your choices.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Database className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-stone-900">Local-Only Conversation History</p>
              <p className="mt-0.5 leading-relaxed">
                Your decision history is saved exclusively in your web browser&apos;s local storage. None of your historical conversations are stored on remote servers or sold to third parties.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Cpu className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-stone-900">Gemini 3.8 Flash AI Processing</p>
              <p className="mt-0.5 leading-relaxed">
                When you submit a dilemma, the text of that active prompt is sent securely to Google&apos;s Gemini 3.8 Flash model via our server proxy to generate options and recommendations.
              </p>
            </div>
          </div>

          {/* Reset / Clear Data Block */}
          <div className="pt-4 mt-4 border-t border-stone-200">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <p className="font-medium text-stone-900 text-xs">
                  Locally stored decisions: <span className="font-bold">{savedDecisionsCount}</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Wipe all browser cache and decision history with one click.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Clear all locally saved decisions? This cannot be undone.')) {
                    onClearAllData();
                    onClose();
                  }
                }}
                disabled={savedDecisionsCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition-colors shadow-2xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
