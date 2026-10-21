/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
}

export interface DecisionOption {
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}

export interface RiskItem {
  risk: string;
  level: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface DecisionActionStep {
  id: string;
  step: string;
  timeframe: string;
  completed?: boolean;
}

export interface DecisionAnalysis {
  coreDilemma: string;
  keyFactors: string[];
  options: DecisionOption[];
  recommendation: {
    recommendedOption: string;
    reasoning: string;
    contingencies: string;
  };
  risks: RiskItem[];
  nextSteps: DecisionActionStep[];
}

export interface DecisionSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  category?: DecisionCategory;
  summary?: DecisionAnalysis;
}

export type DecisionCategory = 'career' | 'education' | 'finance' | 'everyday';

export interface CategoryCardData {
  id: DecisionCategory;
  title: string;
  subtitle: string;
  description: string;
  exampleQuestions: string[];
  icon: 'briefcase' | 'graduation-cap' | 'wallet' | 'compass';
}
