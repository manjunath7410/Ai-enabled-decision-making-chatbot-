/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiService } from './server/aiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '128kb' }));

// Lightweight in-memory rate limiter for abuse control (max 30 requests per minute per IP)
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function rateLimitMiddleware(req: Request, res: Response, next: () => void): void {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = (ipRequestHistory.get(clientIp) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      error: 'You are making requests too quickly. Please wait a few seconds and try again.',
      code: 'CLIENT_RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  timestamps.push(now);
  ipRequestHistory.set(clientIp, timestamps);

  // Periodic cleanup to avoid memory leak
  if (ipRequestHistory.size > 1000) {
    for (const [ip, list] of ipRequestHistory.entries()) {
      const valid = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) ipRequestHistory.delete(ip);
      else ipRequestHistory.set(ip, valid);
    }
  }

  next();
}

// Health check endpoint displaying status and configured model
app.get('/api/health', (_req: Request, res: Response) => {
  const status = aiService.getStatus();
  res.json({
    status: 'ok',
    aiStatus: status.status,
    model: status.model,
    hasApiKey: status.hasApiKey,
    maxHistory: status.maxHistory,
    timestamp: Date.now(),
  });
});

// Streaming decision chat endpoint with Server-Sent Events (SSE) and abuse protection
app.post('/api/decision/chat', rateLimitMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body || {};

  // 1. Strict validation of payload
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: 'A non-empty array of messages is required to evaluate a decision.',
      code: 'INVALID_REQUEST_EMPTY',
    });
    return;
  }

  let preparedConversation;
  try {
    preparedConversation = aiService.prepareConversation(messages);
  } catch (err: any) {
    res.status(400).json({
      error: err.message || 'Invalid conversation messages.',
      code: 'INVALID_MESSAGES_FORMAT',
    });
    return;
  }

  // 2. Set up SSE Headers and initial keepalive
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(': keepalive\n\n');

  // 3. Client disconnect listener for request cancellation
  const clientAbortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      clientAbortController.abort();
    }
  });

  // 4. Stream response from Gemini 3.8 Flash via AIService
  await aiService.streamDecisionChat(
    preparedConversation,
    {
      onChunk: (chunk: string) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      },
      onError: (err) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: err.message, code: err.code })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      },
      onComplete: () => {
        if (!res.writableEnded) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      },
    },
    clientAbortController.signal
  );
});

// Full-stack Vite integration: dev mode vs production mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DecideAI server listening at http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
