/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  Compass,
  CheckCircle2,
  Scale,
  AlertTriangle,
  ListChecks,
  HelpCircle,
} from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * A lightweight, accessible, zero-dependency Markdown renderer
 * tailored specifically for structured decision artifacts (options tables,
 * trade-off breakdowns, callouts, and checklists).
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentList: { type: 'ul' | 'ol'; items: Array<{ text: string; isChecked?: boolean }> } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listKey = `list-${blocks.length}`;

    blocks.push(
      <ListTag
        key={listKey}
        className={`my-3 space-y-2 pl-5 ${
          currentList.type === 'ol' ? 'list-decimal' : 'list-none pl-0'
        } text-stone-800 text-sm sm:text-base leading-relaxed`}
      >
        {currentList.items.map((item, idx) => (
          <li key={idx} className={item.isChecked !== undefined ? 'flex items-start gap-2.5 my-1.5' : 'pl-1'}>
            {item.isChecked !== undefined ? (
              <span className="inline-flex items-center gap-2">
                {item.isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                )}
                <span>{renderInline(item.text)}</span>
              </span>
            ) : (
              renderInline(item.text)
            )}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  const flushTable = () => {
    if (!inTable) return;
    const tableKey = `table-${blocks.length}`;

    blocks.push(
      <div key={tableKey} className="my-4 overflow-x-auto rounded-xl border border-stone-200/90 shadow-2xs">
        <table className="w-full text-left text-sm border-collapse bg-white">
          {tableHeader.length > 0 && (
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {tableHeader.map((th, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 font-semibold text-stone-900 border-r border-stone-200 last:border-r-0 whitespace-nowrap"
                  >
                    {renderInline(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-stone-100">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50 hover:bg-stone-50 transition-colors'}>
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-4 py-3 text-stone-700 align-top border-r border-stone-100 last:border-r-0 text-xs sm:text-sm leading-relaxed"
                  >
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  const getHeadingIconAndStyle = (titleText: string) => {
    const lower = titleText.toLowerCase();
    if (lower.includes('situation') || lower.includes('problem')) {
      return {
        icon: <Compass className="w-4 h-4 text-indigo-600 shrink-0" />,
        badgeClass: 'text-indigo-950 bg-indigo-50/70 border-indigo-200',
      };
    }
    if (lower.includes('best-fit') || lower.includes('recommendation') || lower.includes('best fit')) {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
        badgeClass: 'text-emerald-950 bg-emerald-50/80 border-emerald-200',
      };
    }
    if (lower.includes('why it may work') || lower.includes('rationale')) {
      return {
        icon: <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />,
        badgeClass: 'text-amber-950 bg-amber-50/80 border-amber-200',
      };
    }
    if (lower.includes('comparison') || lower.includes('alternatives') || lower.includes('options')) {
      return {
        icon: <Scale className="w-4 h-4 text-stone-700 shrink-0" />,
        badgeClass: 'text-stone-900 bg-stone-100 border-stone-200',
      };
    }
    if (lower.includes('risk') || lower.includes('uncertaint') || lower.includes('trade-off')) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
        badgeClass: 'text-amber-950 bg-amber-50/80 border-amber-200',
      };
    }
    if (lower.includes('step') || lower.includes('action')) {
      return {
        icon: <ListChecks className="w-4 h-4 text-teal-600 shrink-0" />,
        badgeClass: 'text-teal-950 bg-teal-50/80 border-teal-200',
      };
    }
    if (lower.includes('clarify') || lower.includes('question')) {
      return {
        icon: <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />,
        badgeClass: 'text-sky-950 bg-sky-50/80 border-sky-200',
      };
    }
    return {
      icon: <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />,
      badgeClass: 'text-stone-900 bg-stone-50 border-stone-200',
    };
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Table detection: starts and ends with '|' or contains multiple '|'
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        inTable = true;
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) {
      flushList();
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      const headingText = line.slice(4);
      const { icon, badgeClass } = getHeadingIconAndStyle(headingText);

      blocks.push(
        <div
          key={`h3-${i}`}
          className={`mt-6 mb-2.5 px-3 py-1.5 rounded-lg border flex items-center gap-2.5 font-semibold text-sm sm:text-base ${badgeClass}`}
        >
          {icon}
          <span className="tracking-tight">{renderInline(headingText)}</span>
        </div>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="text-lg sm:text-xl font-bold text-stone-900 mt-6 mb-2.5 pb-1 border-b border-stone-200"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-bold text-stone-900 mt-6 mb-3">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      blocks.push(
        <div
          key={`quote-${i}`}
          className="my-3 pl-3.5 pr-4 py-2.5 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-md text-amber-950 text-sm sm:text-base flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">{renderInline(line.slice(2))}</div>
        </div>
      );
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line)) {
      flushList();
      blocks.push(<hr key={`hr-${i}`} className="my-4 border-stone-200" />);
      continue;
    }

    // Checklist or bullet list
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1];
      let isChecked: boolean | undefined = undefined;
      let text = itemContent;

      if (itemContent.startsWith('[ ] ')) {
        isChecked = false;
        text = itemContent.slice(4);
      } else if (itemContent.startsWith('[x] ') || itemContent.startsWith('[X] ')) {
        isChecked = true;
        text = itemContent.slice(4);
      }

      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({ text, isChecked });
      continue;
    }

    // Ordered list
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({ text: orderedMatch[2] });
      continue;
    }

    // Regular paragraph
    flushList();
    blocks.push(
      <p key={`p-${i}`} className="my-2 text-stone-800 text-sm sm:text-base leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className="space-y-1">{blocks}</div>;
};

/**
 * Parses bold, italics, inline code, and links within text
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-stone-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-stone-800">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-stone-100 text-stone-800 text-xs font-mono border border-stone-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
