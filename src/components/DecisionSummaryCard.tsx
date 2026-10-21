/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  ListChecks,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Edit3,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckSquare,
  Square,
  Sliders,
} from 'lucide-react';
import { DecisionCardData, DecisionOptionItem } from '../types/decisionCard.ts';
import { DecisionToolsModal } from './DecisionToolsModal.tsx';

interface DecisionSummaryCardProps {
  data: DecisionCardData;
  onFollowUp: (prompt: string) => void;
  onCorrectAssumption: (initialText: string) => void;
}

export const DecisionSummaryCard: React.FC<DecisionSummaryCardProps> = ({
  data,
  onFollowUp,
  onCorrectAssumption,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    data.options.find((o) => o.isRecommended)?.id || data.options[0]?.id || ''
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    data.nextSteps.forEach((s) => {
      if (s.completed) initial[s.id] = true;
    });
    return initial;
  });

  const selectedOption: DecisionOptionItem | undefined =
    data.options.find((o) => o.id === selectedOptionId) || data.options[0];

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden my-4 text-stone-900 transition-all">
      {/* 1. Header & Status Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-50 via-white to-stone-50 border-b border-stone-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-stone-100 text-stone-700">
              <Scale className="w-4 h-4 text-amber-600" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {data.mode === 'comparison'
                ? 'Option Comparison'
                : data.mode === 'action_plan'
                ? 'Action Plan'
                : 'Smart Decision Mode'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsToolsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 shadow-2xs transition-colors"
              title="Open What-If Simulator, Priority Scorer, and Regret Check"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Decision Tools</span>
            </button>

            {/* Status Badge */}
            {data.status === 'recommended' && data.recommendedOption ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recommendation Justified</span>
              </div>
            ) : data.status === 'uncertain' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Close Call / Subjective Trade-off</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>More Context Helpful</span>
              </div>
            )}
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 tracking-tight leading-snug">
          {data.title}
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
          {data.summary}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* 2. Recommended Option Spotlight OR Uncertainty Notice */}
        {data.recommendedOption ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Primary Recommendation
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-emerald-950 mb-1">
                  {data.recommendedOption.name}
                </h4>
                <p className="text-sm text-emerald-900/90 leading-relaxed">
                  {data.recommendedOption.shortWhy}
                </p>
              </div>
            </div>
          </div>
        ) : data.uncertaintyReason ? (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Uncertainty Notice: No Single Winner Justified
                </p>
                <p className="text-sm text-amber-900 mt-1 leading-relaxed">
                  {data.uncertaintyReason}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 9. Missing-Information Indicator */}
        {data.missingInformation && data.missingInformation.length > 0 && (
          <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 text-sky-950 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-semibold text-sky-900 mb-1.5">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>Missing Information That Could Tip The Scale:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sky-900/90">
              {data.missingInformation.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 4 & 5. Compare Available Options (Tabs + Pros & Cons) */}
        {data.options.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-stone-600" />
                <span>Explore Options & Trade-Offs</span>
              </h4>
              <span className="text-xs text-stone-400">Select an option to view details</span>
            </div>

            {/* Option selector pills */}
            <div className="flex flex-wrap gap-2">
              {data.options.map((opt) => {
                const isSelected = opt.id === selectedOptionId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200'
                    }`}
                  >
                    <span>{opt.name}</span>
                    {opt.isRecommended && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-emerald-200 text-emerald-950">
                        Top Fit
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active option card */}
            {selectedOption && (
              <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200 transition-all">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-semibold text-stone-900 text-base">
                      {selectedOption.name}
                    </h5>
                    <span className="text-xs text-stone-500 font-medium">
                      Best When: <span className="text-stone-800">{selectedOption.bestWhen}</span>
                    </span>
                  </div>
                  {selectedOption.description && (
                    <p className="text-xs text-stone-600">{selectedOption.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
                  {/* Pros */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                      Advantages (Pros)
                    </p>
                    <ul className="space-y-1 text-xs text-stone-700">
                      {selectedOption.pros.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">&check;</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                      Disadvantages & Risks (Cons)
                    </p>
                    <ul className="space-y-1 text-xs text-stone-700">
                      {selectedOption.cons.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">&bull;</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Comparison Table (Responsive & Accessible) */}
        {data.tableData && data.tableData.rows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span>Side-by-Side Comparison Matrix</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse bg-white">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    {data.tableData.headers.map((h, idx) => (
                      <th
                        key={idx}
                        className="px-3.5 py-2.5 font-semibold text-stone-900 border-r border-stone-200 last:border-r-0 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.tableData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50 hover:bg-stone-50'}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 text-stone-700 align-top border-r border-stone-100 last:border-r-0"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Important Risks Callout */}
        {data.risks.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Important Risks & Trade-Offs</span>
            </p>
            <ul className="space-y-1.5 text-xs text-amber-950">
              {data.risks.map((r, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-600">&bull;</span>
                  <div>
                    <span className="font-semibold">{r.title}</span>
                    {r.mitigation && (
                      <span className="text-amber-800 ml-1">({r.mitigation})</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. Actionable Next Steps (Interactive Checklist) */}
        {data.nextSteps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-teal-600" />
              <span>Actionable Next Steps</span>
            </h4>
            <div className="space-y-1.5">
              {data.nextSteps.map((step) => {
                const isDone = Boolean(checkedSteps[step.id]);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-start gap-2.5 transition-colors group"
                  >
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5 group-hover:text-stone-600" />
                    )}
                    <span
                      className={`text-xs sm:text-sm leading-snug ${
                        isDone ? 'line-through text-stone-400' : 'text-stone-800'
                      }`}
                    >
                      {step.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 10. Expandable Detailed Explanation */}
        {data.detailedExplanation && (
          <div className="pt-2 border-t border-stone-200/80">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="w-full flex items-center justify-between text-xs font-semibold text-stone-600 hover:text-stone-900 py-1"
            >
              <span>{isDetailsExpanded ? 'Hide in-depth notes' : 'Show in-depth notes'}</span>
              {isDetailsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {isDetailsExpanded && (
              <div className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
                {data.detailedExplanation}
              </div>
            )}
          </div>
        )}

        {/* INTERACTION: Alternative Priority Prompts & Follow-ups */}
        <div className="pt-3 border-t border-stone-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">
              Test with a different priority:
            </span>
            <button
              onClick={() => onCorrectAssumption('Actually, let me clarify an assumption: ')}
              className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 hover:underline"
            >
              <Edit3 className="w-3 h-3 text-stone-500" />
              <span>Correct an assumption</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {data.alternativePriorities?.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUp(p.prompt)}
                className="text-xs text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1 rounded-lg border border-stone-200 font-medium transition-colors shadow-2xs"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() =>
                onFollowUp(
                  `Can you explain why ${
                    data.recommendedOption?.name || 'Option A'
                  } is better than the alternatives for me?`
                )
              }
              className="text-xs text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1 rounded-lg border border-stone-200 font-medium transition-colors shadow-2xs"
            >
              ❓ Why this recommendation?
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Decision Laboratory & Tools Modal */}
      <DecisionToolsModal
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        decisionData={data}
        onApplyPrompt={onFollowUp}
      />
    </div>
  );
};
