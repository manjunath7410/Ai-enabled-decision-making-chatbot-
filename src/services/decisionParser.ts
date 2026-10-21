/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecisionCardData,
  DecisionOptionItem,
  DecisionRiskItem,
  DecisionNextStepItem,
  DecisionMode,
} from '../types/decisionCard.ts';

/**
 * Automatically detects which of the 5 Smart Decision Mode response formats applies:
 * 1. Simple Conversational / Factual Answer
 * 2. Problem Understanding & Smart Clarification
 * 3. Option Comparison
 * 4. Structured Decision Support (Full analysis)
 * 5. Practical Action Plan
 */
export function detectDecisionMode(rawContent: unknown): DecisionMode {
  if (typeof rawContent !== 'string') return 'conversational';
  const content = rawContent.trim();
  const lower = content.toLowerCase();

  // Mode 1 check: Very short, simple conversation or factual answers
  if (content.length < 90) return 'conversational';

  // Mode 2 check: Clarification questions (ends in a clarifying question or contains focused prompt)
  const isClarification =
    (lower.includes('to help you narrow this down') ||
      lower.includes('what will you mainly use it for') ||
      lower.includes('to give you a specific recommendation') ||
      lower.includes('could you tell me') ||
      lower.includes('one question to clarify') ||
      lower.includes('quick question:')) &&
    !content.includes('| :---') &&
    content.split('?').length >= 2;

  if (isClarification && !lower.includes('understanding your situation')) {
    return 'clarification';
  }

  // Mode 4 check: Full Structured Decision Support (Sections A-G or multiple deep markers)
  const structuredSectionMatches = [
    lower.includes('understanding your situation') || lower.includes('core choice') || lower.includes('the core choice'),
    lower.includes('available options') || lower.includes('alternatives'),
    lower.includes('comparison') || lower.includes('side-by-side'),
    lower.includes('advantages and disadvantages') || lower.includes('pros and cons'),
    lower.includes('risks and uncertainties') || lower.includes('what would change my mind') || lower.includes('important risks'),
    lower.includes('recommended option') || lower.includes('recommended approach') || lower.includes('best-fit option'),
    lower.includes('next steps') || lower.includes('helpful next steps') || lower.includes('action plan'),
  ].filter(Boolean).length;

  if (structuredSectionMatches >= 3) {
    return 'decision_analysis';
  }

  // Mode 3 check: Explicit Option Comparison
  if (
    (content.includes('| :---') || lower.includes('option a vs') || lower.includes('compare these two')) &&
    (lower.includes('comparison') || lower.includes('trade-off'))
  ) {
    return 'comparison';
  }

  // Mode 5 check: Practical Action Plan
  if (
    (lower.includes('action plan') || lower.includes('execution checklist') || lower.includes('next steps:')) &&
    (content.includes('- [ ]') || /^\d+\.\s+\*\*/m.test(content))
  ) {
    return 'action_plan';
  }

  // Default to conversational for general text
  return 'conversational';
}

/**
 * Validates and extracts structured decision data from markdown content.
 * Returns null if the content is an ordinary simple conversational response.
 */
export function parseDecisionContent(rawContent: unknown): DecisionCardData | null {
  if (typeof rawContent !== 'string') return null;
  const content = rawContent.trim();

  // If content is too short, treat as simple conversational
  if (content.length < 80) return null;

  const mode = detectDecisionMode(content);

  // If mode is conversational or simple clarification without structured sections, do not force a card
  if (mode === 'conversational') {
    return null;
  }

  const hasTable = content.includes('|') && content.includes('---');
  const hasOptions =
    content.toLowerCase().includes('option a') ||
    content.toLowerCase().includes('best-fit') ||
    content.toLowerCase().includes('recommended option') ||
    content.toLowerCase().includes('available options') ||
    content.toLowerCase().includes('alternatives');
  const hasSteps =
    content.includes('- [ ]') ||
    content.includes('- [x]') ||
    content.toLowerCase().includes('next steps');

  const indicatorsCount = (hasTable ? 1 : 0) + (hasOptions ? 1 : 0) + (hasSteps ? 1 : 0);
  if (indicatorsCount < 2 && !content.toLowerCase().includes('understanding your situation') && mode !== 'decision_analysis') {
    return null;
  }

  try {
    const lines = content.split('\n');
    let title = 'Decision Analysis';
    let summary = '';
    let recommendedOption: { name: string; shortWhy: string } | undefined = undefined;
    let uncertaintyReason: string | undefined = undefined;
    const missingInfo: string[] = [];
    const options: DecisionOptionItem[] = [];
    const risks: DecisionRiskItem[] = [];
    const nextSteps: DecisionNextStepItem[] = [];
    let detailedExplanation = '';

    let currentSection = '';

    // Table parsing state
    let tableHeaders: string[] = [];
    const tableRows: string[][] = [];
    let inTable = false;

    // Bullet-list options tracking
    let currentBulletOption: Partial<DecisionOptionItem> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect Table rows
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
        if (isSeparator) {
          inTable = true;
          continue;
        }

        if (!inTable && tableHeaders.length === 0) {
          tableHeaders = cells;
        } else if (tableHeaders.length > 0) {
          tableRows.push(cells);
        }
        continue;
      } else {
        inTable = false;
      }

      // Detect Headings (### A. ..., ### 1. ..., ## ..., etc.)
      if (line.startsWith('### ') || line.startsWith('## ')) {
        // If we were parsing a bullet option, commit it
        if (currentBulletOption && currentBulletOption.name) {
          options.push({
            id: `opt-${options.length + 1}`,
            name: currentBulletOption.name,
            description: currentBulletOption.description || 'Realistic alternative option',
            isRecommended: currentBulletOption.isRecommended || false,
            pros: currentBulletOption.pros || ['Feasible path'],
            cons: currentBulletOption.cons || ['Trade-offs apply'],
            bestWhen: currentBulletOption.bestWhen || 'Alignment with specific priorities',
          });
          currentBulletOption = null;
        }

        const headerText = line.replace(/^#{2,3}\s+/, '').trim();
        const lowerHeader = headerText.toLowerCase();

        if (
          lowerHeader.includes('understanding your situation') ||
          lowerHeader.includes('situation') ||
          lowerHeader.includes('problem') ||
          lowerHeader.includes('core choice')
        ) {
          currentSection = 'situation';
        } else if (
          lowerHeader.includes('available options') ||
          lowerHeader.includes('alternatives')
        ) {
          currentSection = 'options';
        } else if (lowerHeader.includes('comparison') || lowerHeader.includes('quick comparison')) {
          currentSection = 'comparison';
        } else if (
          lowerHeader.includes('advantages and disadvantages') ||
          lowerHeader.includes('pros and cons')
        ) {
          currentSection = 'adv_disadv';
        } else if (
          lowerHeader.includes('risks and uncertainties') ||
          lowerHeader.includes('risk') ||
          lowerHeader.includes('what would change my mind')
        ) {
          currentSection = 'risks';
        } else if (
          lowerHeader.includes('recommended option') ||
          lowerHeader.includes('recommended approach') ||
          lowerHeader.includes('best-fit') ||
          lowerHeader.includes('recommendation')
        ) {
          currentSection = 'recommendation';
        } else if (
          lowerHeader.includes('next steps') ||
          lowerHeader.includes('action plan') ||
          lowerHeader.includes('helpful next steps')
        ) {
          currentSection = 'steps';
        } else if (
          lowerHeader.includes('clarify') ||
          lowerHeader.includes('question') ||
          lowerHeader.includes('missing')
        ) {
          currentSection = 'missing';
        } else {
          currentSection = 'details';
        }
        continue;
      }

      if (!line) continue;

      // Section Content Extraction
      if (currentSection === 'situation' && !summary) {
        summary = line.replace(/^\*\*.*?\*\*:?\s*/, '').replace(/^You are evaluating:?\s*/i, '');
        if (!title || title === 'Decision Analysis') {
          title = summary.length > 60 ? summary.slice(0, 57) + '...' : summary;
        }
      } else if (currentSection === 'recommendation') {
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.includes('uncertain') ||
          lowerLine.includes('close call') ||
          lowerLine.includes('cannot justify') ||
          lowerLine.includes('inconclusive') ||
          lowerLine.includes('neither option') ||
          lowerLine.includes('tied') ||
          lowerLine.includes('evenly balanced')
        ) {
          uncertaintyReason = line.replace(/^\*\*.*?\*\*:?\s*/, '');
          recommendedOption = undefined;
        } else if (!recommendedOption && !uncertaintyReason) {
          const cleanLine = line.replace(/^\*\*(.*?)\*\*:?/, '$1');
          const parts = cleanLine.split(':');
          if (parts.length > 1) {
            recommendedOption = {
              name: parts[0].trim(),
              shortWhy: parts.slice(1).join(':').trim(),
            };
          } else {
            recommendedOption = {
              name: cleanLine,
              shortWhy: 'Strongest fit for your stated priorities and constraints.',
            };
          }
        }
      } else if (currentSection === 'options' || currentSection === 'adv_disadv') {
        // Bullet option extraction (e.g. 1. **Option A: ...** or - **Option A**: ...)
        const optMatch = line.match(/^(\d+\.|\*|-)\s+\*\*(Option\s+[A-Za-z0-9]+|[^*]+)\*\*:?(.*)/i);
        if (optMatch) {
          if (currentBulletOption && currentBulletOption.name) {
            options.push({
              id: `opt-${options.length + 1}`,
              name: currentBulletOption.name,
              description: currentBulletOption.description || 'Realistic alternative option',
              isRecommended: currentBulletOption.isRecommended || false,
              pros: currentBulletOption.pros || ['Clear benefits'],
              cons: currentBulletOption.cons || ['Trade-offs apply'],
              bestWhen: currentBulletOption.bestWhen || 'Best fit when this alignment matters most',
            });
          }
          const optName = optMatch[2].trim();
          const desc = optMatch[3].trim();
          currentBulletOption = {
            name: optName,
            description: desc,
            pros: [],
            cons: [],
          };
        } else if (currentBulletOption) {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('advantage') || lowerLine.includes('pro:') || lowerLine.includes('benefit')) {
            const proText = line.replace(/^[-*•]\s*(\*\*.*?\*\*:?)?/, '').trim();
            if (proText) currentBulletOption.pros?.push(proText);
          } else if (lowerLine.includes('disadvantage') || lowerLine.includes('con:') || lowerLine.includes('drawback')) {
            const conText = line.replace(/^[-*•]\s*(\*\*.*?\*\*:?)?/, '').trim();
            if (conText) currentBulletOption.cons?.push(conText);
          } else if (lowerLine.includes('best when') || lowerLine.includes('choose this if')) {
            currentBulletOption.bestWhen = line.replace(/^[-*•]\s*(\*\*.*?\*\*:?)?/, '').trim();
          }
        }
      } else if (currentSection === 'risks') {
        if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
          const riskText = line.replace(/^[-*]|\d+\.\s*/, '').trim();
          risks.push({
            title: riskText,
            mitigation: 'Consider your downside buffer and timeline flexibility before committing.',
            severity: riskText.toLowerCase().includes('high') ? 'high' : 'medium',
          });
        }
      } else if (currentSection === 'steps') {
        if (line.includes('[ ]') || line.includes('[x]') || line.startsWith('- ') || /^\d+\.\s+/.test(line)) {
          const stepText = line.replace(/^[-*]\s*(\[[ xX]\])?\s*|\d+\.\s*/, '').trim();
          if (stepText && nextSteps.length < 5) {
            nextSteps.push({
              id: `step-${nextSteps.length + 1}`,
              text: stepText,
              completed: line.includes('[x]') || line.includes('[X]'),
            });
          }
        }
      } else if (currentSection === 'missing') {
        if (line.startsWith('- ') || /^\d+\.\s+/.test(line)) {
          missingInfo.push(line.replace(/^[-*]|\d+\.\s*/, '').trim());
        }
      }
    }

    // Flush any pending bullet option
    if (currentBulletOption && currentBulletOption.name) {
      options.push({
        id: `opt-${options.length + 1}`,
        name: currentBulletOption.name,
        description: currentBulletOption.description || 'Realistic alternative option',
        isRecommended: currentBulletOption.isRecommended || false,
        pros: currentBulletOption.pros?.length ? currentBulletOption.pros : ['Clear advantages'],
        cons: currentBulletOption.cons?.length ? currentBulletOption.cons : ['Trade-offs apply'],
        bestWhen: currentBulletOption.bestWhen || 'Best fit when this alignment matters most',
      });
    }

    // Extract options from the table rows if available
    if (tableHeaders.length >= 2 && tableRows.length > 0 && options.length === 0) {
      for (let r = 0; r < tableRows.length; r++) {
        const row = tableRows[r];
        if (row.length < 2) continue;
        const optName = row[0].replace(/\*\*/g, '').trim();
        const benefits = row[1] ? [row[1].replace(/\*\*/g, '').trim()] : [];
        const tradeOffs = row[2] ? [row[2].replace(/\*\*/g, '').trim()] : [];
        const bestWhen = row[3] ? row[3].replace(/\*\*/g, '').trim() : 'General suitability';

        const isRec = Boolean(
          recommendedOption &&
            optName.toLowerCase().includes(recommendedOption.name.toLowerCase().slice(0, 8))
        );

        options.push({
          id: `opt-${r + 1}`,
          name: optName,
          description: row[1] || 'Realistic alternative option',
          isRecommended: isRec,
          pros: benefits,
          cons: tradeOffs,
          bestWhen: bestWhen,
        });
      }
    }

    // If still no options were parsed, provide safe fallback options
    if (options.length === 0) {
      options.push({
        id: 'opt-1',
        name: recommendedOption?.name || 'Primary Path',
        description: 'Recommended based on stated goals and constraints.',
        isRecommended: true,
        pros: ['Directly advances your goal', 'Higher upside leverage'],
        cons: ['Requires active implementation'],
        bestWhen: 'Your top priority is taking action.',
      });
      options.push({
        id: 'opt-2',
        name: 'Status Quo / Safe Baseline',
        description: 'Stay the course or maintain the current setup.',
        isRecommended: false,
        pros: ['Zero transition friction', 'No extra expense'],
        cons: ['Opportunity cost of delay'],
        bestWhen: 'Stability and risk avoidance matter most.',
      });
    }

    // Ensure next steps has at least sensible actions, capped at 5
    if (nextSteps.length === 0) {
      nextSteps.push(
        { id: 'step-1', text: 'Confirm your non-negotiable budget and deadline.' },
        { id: 'step-2', text: 'Consult 1 trusted person who has made a similar choice.' },
        { id: 'step-3', text: 'Set a decision deadline to execute step 1.' }
      );
    }

    // Determine status
    let status: 'recommended' | 'uncertain' | 'needs_clarification' = 'recommended';
    if (uncertaintyReason) {
      status = 'uncertain';
    } else if (missingInfo.length > 0 && !recommendedOption) {
      status = 'needs_clarification';
    }

    // Generate alternative priorities
    const alternativePriorities = [
      { label: '💰 Lowest Cost', prompt: 'What would you recommend if my #1 priority is saving money and minimizing cost?' },
      { label: '⚡ Fastest Timeline', prompt: 'What if my #1 priority is speed and getting this done as quickly as possible?' },
      { label: '🛡️ Lowest Stress', prompt: 'What if my #1 priority is avoiding stress and choosing the lowest-risk path?' },
    ];

    return {
      title: title || 'Decision Breakdown',
      summary: summary || 'A structured evaluation of your dilemma and alternatives.',
      status,
      mode,
      recommendedOption,
      uncertaintyReason,
      missingInformation: missingInfo.length > 0 ? missingInfo : undefined,
      options,
      risks,
      nextSteps: nextSteps.slice(0, 5), // Strictly up to five practical actions
      detailedExplanation: detailedExplanation || undefined,
      tableData: tableHeaders.length > 0 && tableRows.length > 0 ? { headers: tableHeaders, rows: tableRows } : undefined,
      alternativePriorities,
    };
  } catch (e) {
    console.warn('Failed to parse structured decision content safely:', e);
    return null;
  }
}
