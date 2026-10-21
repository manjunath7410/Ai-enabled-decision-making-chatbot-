/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DecisionOptionItem {
  id: string;
  name: string;
  description: string;
  isRecommended?: boolean;
  pros: string[];
  cons: string[];
  bestWhen: string;
}

export interface DecisionRiskItem {
  title: string;
  mitigation: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface DecisionNextStepItem {
  id: string;
  text: string;
  completed?: boolean;
}

export type DecisionStatus = 'recommended' | 'uncertain' | 'needs_clarification';

export type DecisionMode =
  | 'conversational'
  | 'clarification'
  | 'comparison'
  | 'decision_analysis'
  | 'action_plan';

export interface DecisionCardData {
  title: string;
  summary: string;
  status: DecisionStatus;
  mode?: DecisionMode;
  recommendedOption?: {
    name: string;
    shortWhy: string;
  };
  uncertaintyReason?: string;
  missingInformation?: string[];
  options: DecisionOptionItem[];
  risks: DecisionRiskItem[];
  nextSteps: DecisionNextStepItem[];
  detailedExplanation?: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  alternativePriorities?: Array<{
    label: string;
    prompt: string;
  }>;
}
