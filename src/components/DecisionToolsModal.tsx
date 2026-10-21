/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Gauge,
  Sliders,
  ShieldCheck,
  Scale,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { DecisionCardData } from '../types/decisionCard.ts';
import { calculateDecisionClarity } from '../services/decisionClarity.ts';
import { analyzeRegretFactors } from '../services/regretCheck.ts';
import { runWhatIfSimulation, WhatIfParameters } from '../services/whatIfEngine.ts';
import { calculatePriorityRanking, PriorityWeights } from '../services/priorityEngine.ts';

interface DecisionToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionData: DecisionCardData;
  onApplyPrompt: (prompt: string) => void;
}

type ToolTab = 'clarity' | 'whatif' | 'priority' | 'regret';

export const DecisionToolsModal: React.FC<DecisionToolsModalProps> = ({
  isOpen,
  onClose,
  decisionData,
  onApplyPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<ToolTab>('clarity');

  // What-If Simulator state
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParameters>({
    budgetDeltaPercent: 0,
    timeCommitmentHoursPerWeek: 15,
    priorityFocus: 'cost',
    timeHorizonMonths: 6,
  });

  // Priority Weights state
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>({
    costSavings: 4,
    speedOfOutcome: 3,
    peaceOfMind: 4,
    growthUpside: 3,
  });

  if (!isOpen) return null;

  // Compute reports deterministically
  const clarityReport = calculateDecisionClarity(decisionData);
  const regretReport = analyzeRegretFactors(decisionData);
  const simulationResult = runWhatIfSimulation(whatIfParams, decisionData.options);
  const priorityRanking = calculatePriorityRanking(priorityWeights, decisionData.options);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden text-stone-900"
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Decision Tools"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
                Decision Laboratory & Tools
              </h2>
              <p className="text-xs text-stone-500">
                Deterministic simulations, completeness analysis & regret checks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            aria-label="Close tools"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-4 pt-2 gap-1 overflow-x-auto text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('clarity')}
            className={`px-3 py-2 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'clarity'
                ? 'bg-white border-stone-200 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-600" />
            <span>Clarity Score ({clarityReport.score}%)</span>
          </button>

          <button
            onClick={() => setActiveTab('whatif')}
            className={`px-3 py-2 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'whatif'
                ? 'bg-white border-stone-200 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>What-If Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`px-3 py-2 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'priority'
                ? 'bg-white border-stone-200 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Priority Scorer</span>
          </button>

          <button
            onClick={() => setActiveTab('regret')}
            className={`px-3 py-2 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'regret'
                ? 'bg-white border-stone-200 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Regret & Reversibility</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: CLARITY SCORE */}
          {activeTab === 'clarity' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 flex items-start gap-3">
                <div className="text-3xl font-serif font-bold text-indigo-900">
                  {clarityReport.score}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                      Information Completeness:
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                      {clarityReport.rating}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
                    {clarityReport.disclaimer}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Completeness Checklist
                </h4>
                <div className="space-y-2">
                  {clarityReport.criteria.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start gap-3"
                    >
                      {c.isSatisfied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-stone-900">
                          <span>{c.label}</span>
                          <span className={c.isSatisfied ? 'text-emerald-700' : 'text-stone-400'}>
                            {c.points} / {c.maxPoints} pts
                          </span>
                        </div>
                        <p className="text-stone-500 mt-0.5">{c.description}</p>
                        {!c.isSatisfied && (
                          <p className="text-amber-800 font-medium mt-1">
                            Tip: {c.recommendationIfMissing}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WHAT-IF SIMULATOR */}
          {activeTab === 'whatif' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold">Interactive Sensitivity Test: </span>
                Adjust the sliders below to see which path is favored when budget or time constraints change.
              </div>

              {/* Sliders */}
              <div className="space-y-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                {/* Budget Delta */}
                <div>
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>Budget Variance:</span>
                    <span className="text-amber-700 font-mono">
                      {whatIfParams.budgetDeltaPercent > 0 ? `+${whatIfParams.budgetDeltaPercent}%` : `${whatIfParams.budgetDeltaPercent}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="10"
                    value={whatIfParams.budgetDeltaPercent}
                    onChange={(e) =>
                      setWhatIfParams({ ...whatIfParams, budgetDeltaPercent: Number(e.target.value) })
                    }
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                    <span>-50% (Strict austerity)</span>
                    <span>Baseline (0%)</span>
                    <span>+50% (Generous cushion)</span>
                  </div>
                </div>

                {/* Time Commitment */}
                <div className="pt-2 border-t border-stone-200/60">
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>Available Dedicated Time:</span>
                    <span className="text-amber-700 font-mono">
                      {whatIfParams.timeCommitmentHoursPerWeek} hrs/week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="5"
                    value={whatIfParams.timeCommitmentHoursPerWeek}
                    onChange={(e) =>
                      setWhatIfParams({ ...whatIfParams, timeCommitmentHoursPerWeek: Number(e.target.value) })
                    }
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                    <span>5 hrs (Side project)</span>
                    <span>20 hrs (Part-time)</span>
                    <span>40 hrs (Full-time)</span>
                  </div>
                </div>
              </div>

              {/* Simulation Result */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Projected Optimal Path:
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    {simulationResult.fragilityRating}
                  </span>
                </div>
                <h4 className="text-base font-bold text-emerald-950">
                  {simulationResult.preferredOptionName}
                </h4>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {simulationResult.rationalSummary}
                </p>
                <div className="text-[11px] text-emerald-800/80 pt-1 border-t border-emerald-200/80">
                  <strong>Estimated time investment:</strong> {simulationResult.projectedTimeImpact}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRIORITY SCORER */}
          {activeTab === 'priority' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <span className="font-semibold">Transparent Multi-Criteria Scoring (MCDA): </span>
                Adjust the relative importance (1 to 5) of your values to see how the mathematics shifts the ranking.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>💰 Cost & Savings</span>
                    <span className="font-mono text-emerald-700">Weight: {priorityWeights.costSavings}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={priorityWeights.costSavings}
                    onChange={(e) =>
                      setPriorityWeights({ ...priorityWeights, costSavings: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>⚡ Speed & Quickness</span>
                    <span className="font-mono text-emerald-700">Weight: {priorityWeights.speedOfOutcome}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={priorityWeights.speedOfOutcome}
                    onChange={(e) =>
                      setPriorityWeights({ ...priorityWeights, speedOfOutcome: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>🛡️ Peace of Mind</span>
                    <span className="font-mono text-emerald-700">Weight: {priorityWeights.peaceOfMind}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={priorityWeights.peaceOfMind}
                    onChange={(e) =>
                      setPriorityWeights({ ...priorityWeights, peaceOfMind: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-stone-800 mb-1">
                    <span>🚀 Long-Term Growth</span>
                    <span className="font-mono text-emerald-700">Weight: {priorityWeights.growthUpside}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={priorityWeights.growthUpside}
                    onChange={(e) =>
                      setPriorityWeights({ ...priorityWeights, growthUpside: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              {/* Priority Rankings Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Calculated Option Rankings
                </h4>
                <div className="space-y-2">
                  {priorityRanking.rankings.map((r, idx) => (
                    <div
                      key={r.optionId}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        idx === 0
                          ? 'bg-emerald-50 border-emerald-300 font-semibold'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="text-stone-900">{r.optionName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-stone-600">
                          {r.totalScore} / {r.maxPossibleScore} pts ({r.percentage}%)
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-950 font-bold uppercase">
                            Top Match
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGRET CHECK */}
          {activeTab === 'regret' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Reversibility Classification:
                </span>
                <h4 className="text-base font-bold text-teal-950">
                  {regretReport.reversibilityLabel}
                </h4>
                <p className="text-teal-900/90 leading-relaxed">
                  {regretReport.reversibilityExplanation}
                </p>
              </div>

              {/* 10/10/10 Rule */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>The 10/10/10 Rule Perspective</span>
                </h4>
                <ul className="space-y-1.5 text-stone-700 leading-relaxed">
                  <li>
                    <strong>In 10 Minutes: </strong> {regretReport.tenTenTenPerspective.tenMinutes}
                  </li>
                  <li>
                    <strong>In 10 Months: </strong> {regretReport.tenTenTenPerspective.tenMonths}
                  </li>
                  <li>
                    <strong>In 10 Years: </strong> {regretReport.tenTenTenPerspective.tenYears}
                  </li>
                </ul>
              </div>

              {/* Low-Risk Pilots */}
              <div className="space-y-2">
                <h4 className="font-bold text-stone-900">
                  Lower-Risk Ways to Test Before Full Commitment:
                </h4>
                <ul className="space-y-1.5 list-disc pl-5 text-stone-700">
                  {regretReport.lowRiskPilotOptions.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              if (activeTab === 'whatif') {
                onApplyPrompt(
                  `If my budget is adjusted by ${whatIfParams.budgetDeltaPercent}% and I commit ${whatIfParams.timeCommitmentHoursPerWeek} hours a week, what adjustments should we make?`
                );
              } else if (activeTab === 'priority') {
                onApplyPrompt(
                  `My updated priority weights are: Cost (${priorityWeights.costSavings}/5), Speed (${priorityWeights.speedOfOutcome}/5), Peace of Mind (${priorityWeights.peaceOfMind}/5), Growth (${priorityWeights.growthUpside}/5). Re-evaluate the options accordingly.`
                );
              } else {
                onApplyPrompt(
                  `Can we review the reversibility of this decision and brainstorm a small, low-risk way to test it first?`
                );
              }
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <span>Ask AI to incorporate this insight</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-200/60 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
