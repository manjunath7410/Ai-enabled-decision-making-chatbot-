/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  MessageSquare,
  Calendar,
  Search,
  Edit2,
  Check,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { DecisionSession } from '../types/decision.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: DecisionSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(timestamp));
  };

  const startRename = (session: DecisionSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <aside
        className="relative z-10 w-full max-w-sm sm:max-w-md h-full bg-stone-50 border-l border-stone-200 shadow-xl flex flex-col justify-between"
        role="dialog"
        aria-modal="true"
        aria-label="Decision History"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-stone-700" />
            <h2 className="font-semibold text-stone-900 text-lg">
              Decision History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
            aria-label="Close history drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick New Decision Button & Search */}
        <div className="p-4 space-y-3 border-b border-stone-200 bg-white">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Start Fresh Decision</span>
          </button>

          {sessions.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search past decisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-stone-100 rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-stone-400"
              />
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-stone-500 px-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-stone-800">No saved decisions yet.</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto leading-relaxed">
                When you make decisions, they are saved locally on this browser so you can revisit them anytime.
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-8 text-center text-stone-500 text-sm">
              No decisions match &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const msgCount = session.messages.length;
              const isEditing = editingId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group relative flex items-start justify-between p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    {isEditing ? (
                      <form onSubmit={(e) => saveRename(session.id, e)} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1 bg-white border border-stone-300 rounded focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          autoFocus
                          onBlur={() => saveRename(session.id)}
                        />
                        <button
                          type="submit"
                          className="p-1 rounded bg-stone-900 text-white hover:bg-stone-800"
                          title="Save title"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectSession(session.id);
                          onClose();
                        }}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {session.title || 'Untitled Decision'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(session.updatedAt || session.createdAt)}
                          </span>
                          <span>&bull;</span>
                          <span>{msgCount} message{msgCount === 1 ? '' : 's'}</span>
                        </div>
                      </button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(session, e)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        title="Rename decision"
                        aria-label={`Rename decision ${session.title}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete decision"
                        aria-label={`Delete decision ${session.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Privacy Note & Footer */}
        <div className="border-t border-stone-200 bg-white p-4 space-y-3">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] text-stone-600 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-800">100% Local Storage: </span>
              Your decisions are saved solely in this browser. Deleting removes them permanently. No external copies or shadow backups exist.
            </div>
          </div>

          {sessions.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 font-medium">
                    Are you sure? This will delete all {sessions.length} local decisions.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClearAll();
                        setConfirmClear(false);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      Yes, delete all
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="py-1.5 px-3 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-stone-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Local History</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
