/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Message } from '../types/decision.ts';

export interface StreamChatCallbacks {
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

export const apiService = {
  /**
   * Check backend server health and API key readiness
   */
  async checkHealth(): Promise<{ status: string; hasApiKey: boolean; model: string }> {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`Health check returned status ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn('Backend health check error:', err);
      return { status: 'offline', hasApiKey: false, model: 'gemini-3.8-flash' };
    }
  },

  /**
   * Stream a decision conversation using SSE
   */
  async streamChat(
    messages: Message[],
    callbacks: StreamChatCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const payload = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    try {
      const response = await fetch('/api/decision/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataContent = trimmed.slice(5).trim();
          if (dataContent === '[DONE]') {
            callbacks.onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.error) {
              callbacks.onError(parsed.error);
              return;
            }
            if (parsed.text) {
              callbacks.onChunk(parsed.text);
            }
          } catch (e) {
            console.warn('Failed to parse SSE JSON chunk:', dataContent, e);
          }
        }
      }

      callbacks.onComplete();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onComplete();
        return;
      }
      callbacks.onError(error?.message || 'Failed to connect to decision server.');
    }
  },
};
