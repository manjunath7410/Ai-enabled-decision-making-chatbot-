# DecideAI — Structured Decision-Support Application

DecideAI is a structured, AI-enabled decision-support web application powered by **Google Gemini 3.8 Flash**. It helps everyday people reason through complex life, career, financial, and personal dilemmas by clarifying core problems, comparing realistic options, evaluating trade-offs, and recommending practical next steps.

---

## 🌟 Key Product Features

1. **Clear Welcome Screen & Zero-Config Onboarding:** First-time users immediately see curated decision domains (Career, Learning, Budget, Life) and can ask a question instantly without filling out tedious questionnaires.
2. **7-Step Core Decision Workflow:** 
   - **Understand:** Identifies dilemma, constraints, and priorities.
   - **Clarify:** Asks up to 3 concise, high-leverage questions only when missing information materially changes the advice.
   - **Identify Options:** Formulates 2–4 realistic choices, including low-risk pilots and the status quo.
   - **Compare:** Evaluates alternatives across benefits, trade-offs, financial cost, time, and practicality.
   - **Recommend:** Delivers grounded primary recommendations with transparent reasoning.
   - **Identify Risks:** Outlines downside conditions and explains how changing user priorities alters the recommendation.
   - **Next Steps:** Actionable, low-friction checklist.
3. **Reusable Decision Summary Interface:** Renders complex recommendations into structured cards featuring option tabs, responsive comparison matrices, uncertainty notices, and interactive checklists.
4. **Beginner-Friendly Natural English:** Replaces intimidating technical terminology with plain, approachable words and real-world analogies.
5. **Real-Time Streaming Responses:** Implements Server-Sent Events (SSE) with heartbeat keepalives and user cancellation controls.
6. **Local-First Privacy Architecture:** 100% client-side persistence in `localStorage` with in-memory fallback. Zero server profiling, zero shadow backups, and zero third-party telemetry.
7. **Accessibility & Optional Voice Input:**
   - Microphone voice transcription using the browser-native Web Speech API.
   - Never records silently; requires explicit click with live status and cancel controls.
   - Fully keyboard-navigable (`Tab`, `Enter`, `Shift+Enter`, `Escape`) and WCAG 2.1 AA compliant.
8. **Native Multilingual Capabilities:** Fluently understands and responds in **English**, **Hindi (हिन्दी)**, and **Kannada (ಕನ್ನಡ)**.

---

## 🏗️ Technical Architecture & Security

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│  - React 19 SPA (Vite + Tailwind CSS)                       │
│  - Web Speech API (Voice Input - Optional)                  │
│  - LocalStorage / MemoryStore (100% Local Message History)  │
│  - Zero API Keys in Client Bundle                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE (/api/*)
┌──────────────────────────────▼──────────────────────────────┐
│                   Express Backend Server                    │
│  - Server-Side Proxy (Port 3000)                            │
│  - Abuse-Control Rate Limiter (30 req/min per IP)           │
│  - 128KB Payload Size Ceiling & Input Validation            │
│  - 12-Turn Bounded Context Window                           │
│  - Request Cancellation (res.on('close') -> AbortController)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (@google/genai SDK)
┌──────────────────────────────▼──────────────────────────────┐
│                    Google Gemini API                        │
│  - Stable Model: gemini-3.8-flash                           │
│  - Secure Server-Side GEMINI_API_KEY                        │
│  - Temperature: 0.65 (Grounded, Objective Reasoning)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Environment Variables

Define the following environment variables (see `.env.example`):

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for `gemini-3.8-flash`. In AI Studio, this is automatically injected from user secrets. | None |
| `PORT` | No | Port on which the Express server listens. | `3000` |
| `NODE_ENV` | No | Environment mode (`development` or `production`). | `development` |
| `APP_URL` | No | Public host URL used for self-referential links or callbacks. | `http://localhost:3000` |

> **Security Rule:** Never commit `.env` or paste actual API secrets into source code or Git history.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js version 20.x or 22.x+
- npm version 10.x+
- A valid Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Installation
```bash
git clone <repository-url>
cd decideai
npm install
```

### 2. Configure Environment
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` and set your `GEMINI_API_KEY`:
```ini
GEMINI_API_KEY="your-actual-api-key-here"
PORT=3000
```

### 3. Run in Development Mode
Starts the Express server with Vite middleware mounted on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build & Deployment

### 1. Compile Production Assets
Runs TypeScript type-checking and Vite production asset bundling:
```bash
npm run build
```
This produces an optimized, static client bundle in the `/dist` directory.

### 2. Run Production Server
```bash
NODE_ENV=production npm start
```
The server serves the pre-compiled `/dist` static files and proxies `/api/*` endpoints with compression and security headers.

### 3. Container / Cloud Run Deployment
The application is pre-configured for containerized hosting (e.g. Google Cloud Run, AWS App Runner, or Docker):
- **Container Port:** `3000`
- **Host Binding:** `0.0.0.0`
- **Health Check Route:** `GET /api/health`
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

---

## 🧪 Automated Test Suites

DecideAI includes 39 automated tests covering security, AI reliability, conversational UX, structured summaries, and conversation management.

Run all tests:
```bash
npm test
```

Or run individual suites:
- `npm run test:summary` — Validates the 10-point Decision Summary parser, corrupt input handling, and XSS safety.
- `npm run test:decisions` — Verifies the 7-step Core Decision Workflow and safety boundaries.
- `npm run test:conversations` — Tests beginner-friendly conversation rules and clarifying dialogue.
- `npm run test:management` — Tests local storage persistence, session creation, renaming, and deletion.
- `npm run test:a11y` — Verifies multilingual support (English, Hindi, Kannada) and voice recognition fallbacks.
- `npm run audit` — Performs full-stack security and prompt-injection audit.

---

## ⚠️ Known Limitations & Current Boundaries

1. **Free-Tier Quota Resilience:** The Gemini Free Tier enforces a strict quota on `gemini-3.8-flash`. When rate limits are reached, DecideAI automatically detects `HTTP 429` and surfaces a structured decision fallback along with instructions to attach a paid key in Settings > Secrets.
2. **Browser-Specific Speech Recognition:** Voice transcription relies on the standard Web Speech API, which is natively supported in Google Chrome, Microsoft Edge, and Safari. For other browsers (e.g. Firefox), the microphone icon displays a friendly notice and standard keyboard typing is used.
3. **Local Storage Scoping:** Stored decision history is scoped strictly to the current browser and device. Cross-device cloud sync is intentionally omitted to protect user privacy in MVP without requiring accounts or database tracking.

---

## 📄 License
Apache-2.0
