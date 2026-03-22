<p align="center">
  <img src="public/logo.svg" width="180" alt="Grace Chatbot Logo" />
</p>

<h1 align="center">Grace Chatbot v3</h1>

<p align="center">
  <strong>AI-powered alcohol prevention training platform for academic research</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#testing">Testing</a>
</p>

---

> **Evolution:** This project evolved from grace-chatbot-v2 (Sep 2025), which established the core chatbot architecture and CSV logging system. v3 is a complete rebuild with enhanced scenario simulations, AI-powered response evaluation, production-grade security, and GCP deployment.

## Research Context

| | |
|---|---|
| **Timeline** | Jan 29, 2025 &rarr; Feb 10, 2026 |
| **Purpose** | Ph.D dissertation research support |
| **Principal Investigator** | [Grace Jeonghyun Kim, Ph.D](https://communication.umd.edu/directory/grace-jeonghyun-kim) &mdash; UMD |
| **Topic** | APT (Alcohol Prevention Training) |

## Key Features

- **Role-based chatbots** &mdash; Medical Professional, Student, and General AI interfaces
- **Scenario simulations** &mdash; Interactive alcohol awareness training with AI evaluation
- **Real-time data collection** &mdash; All user actions logged as structured CSV (1 user = 1 row)
- **Admin dashboard** &mdash; Secure CSV/ZIP download at `/downloadit`
- **Security hardened** &mdash; Rate limiting, session-based auth, prompt injection protection, input sanitization

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in required values (see below)

# 3. Run dev server
npm run dev
# => http://localhost:3001
```

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for chat & evaluation |
| `ADMIN_USERNAME` | Yes | Admin login username for `/downloadit` |
| `ADMIN_PASSWORD` | Yes | Admin login password for `/downloadit` |
| `OPENAI_DEFAULT_MODEL` | No | Default: `gpt-4o-mini-2024-07-18` |
| `DOWNLOAD_TOKEN` | No | Static token for API/script CSV access |

## Architecture

```
grace-chatbot-v3/
  app/
    [role]/              # Role-based chatbot pages (medical, student, ai)
      components/        # Chatbot UI components
      hooks/             # State management (chat, questionnaire, simulation)
    api/
      admin-auth/        # Session-based authentication (env credentials)
      chat/              # OpenAI chat proxy (server-side prompt selection)
      completion-code/   # Crypto-secure completion code generation
      download-csv/      # Aggregated CSV download
      download-all-csv/  # Individual CSV ZIP download
      evaluate-response/ # AI-powered response evaluation
      log-action/        # Action logging with queue & batch writes
    downloadit/          # Admin dashboard for CSV downloads
  utils/
    csvLogger.js         # CSV persistence with file locking
    logQueue.js          # Batched write queue with cross-process locks
    downloadAuth.js      # Shared auth & CSV sanitization utilities
    clientLogger.js      # Client-side action logger
  middleware.js          # IP-based rate limiting per API route
  tests/                 # Jest (unit/integration/load) + Playwright (e2e)
```

### Data Flow

```
Participant                        Server                          Admin
    |                                |                               |
    |-- Visit / + enter code ------->|                               |
    |-- Complete questionnaire ----->|-- log-action --> logQueue     |
    |-- Scenario simulation -------->|-- evaluate-response (OpenAI)  |
    |-- Free chat ------------------>|-- chat (OpenAI)               |
    |<-- Completion code ------------|-- completion-code (crypto)    |
    |                                |                               |
    |                                |<-- /downloadit login ---------|
    |                                |-- admin-auth (session token)-->|
    |                                |<-- download-csv / ZIP --------|
```

## Participant Flow

1. Visit `/`, click **Get Started**, enter participant ID
2. Navigate to role-specific chatbot: `/ai-chatbot`, `/medical-professional`, or `/student`
3. Complete questionnaires, scenario learning, and simulations
4. Receive a **completion code** at the end
5. Return to the original survey and enter the code

## API Reference

### Chat & Evaluation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | None | AI chat (server selects prompt by `promptKey`) |
| POST | `/api/evaluate-response` | None | AI evaluation of scenario responses |
| POST | `/api/completion-code` | None | Generate crypto-secure 6-char completion code |
| POST | `/api/log-action` | None | Log user action to CSV queue |

### Admin & Downloads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin-auth` | Credentials | Login, returns session token (4hr TTL) |
| GET | `/api/download-csv` | Session/Token | Download aggregated CSV |
| GET | `/api/download-all-csv` | Session/Token | Download individual CSVs as ZIP |

**Authentication:** Login at `/downloadit` to get a session token, or use `Authorization: Bearer <DOWNLOAD_TOKEN>` for API/script access.

### Rate Limits (per IP, per minute)

| Endpoint | Limit |
|----------|-------|
| `/api/chat`, `/api/evaluate-response` | 20 |
| `/api/admin-auth` | 5 |
| `/api/log-action` | 100 |
| `/api/download-csv`, `/api/download-all-csv` | 10 |
| `/api/completion-code` | 10 |

## CSV Data Structure

Each user's data is accumulated into **a single CSV row**:

**Fixed columns:** `user_key`, `user_identifier`, `chatbot_type`, `risk_level`, `risk_description`, `risk_recommendation`, `total_score`, `action_count`, `completion_code`

**Dynamic columns:** Each action expands as `action_N_timestamp`, `action_N_action_type`, `action_N_response`, `action_N_score`, etc.

### Concurrency & Integrity

- **File locking** via `proper-lockfile` prevents write collisions
- **Atomic writes** via temp file + `rename` prevents corruption
- **Batched queue** buffers writes in-process, flushes with single cross-process lock
- **Late-arriving identifiers** stored under `__session__` prefix, merged when user is identified

## Security

| Layer | Protection |
|-------|------------|
| **Authentication** | Env-based credentials, crypto session tokens (4hr TTL), timing-safe comparison |
| **Rate Limiting** | IP-based sliding window per API route |
| **Prompt Injection** | Server-side prompt selection, input sanitization, anti-injection framing |
| **Input Validation** | Message count/length limits, body size checks, role filtering |
| **CSV Security** | Formula injection sanitization (`=`, `+`, `-`, `@` prefix protection) |
| **Completion Codes** | Server-generated via `crypto.randomBytes`, never exposed in client console |

## Testing

```bash
npm run lint              # ESLint
npm test                  # All Jest tests with coverage
npm run test:frontend     # Frontend tests only
npm run test:backend      # Backend tests only
npm run test:db           # CSV persistence tests
npm run test:e2e          # Playwright E2E tests

# Load test: 300 concurrent users
RUN_LOAD_TESTS=1 npm run test:backend -- tests/load/csvLoad300.loadtest.test.js
```

## Deployment

### Production Build

```bash
npm run build
PORT=3001 npm run start
```

### GCP Compute Engine + PM2

<details>
<summary>Click to expand full GCP deployment guide</summary>

#### Prerequisites

- GCP Project with billing enabled
- Compute Engine VM (Ubuntu, `e2-standard-2` recommended for ~300 users)
- Node.js LTS via NVM

#### Setup

```bash
# SSH into VM
sudo apt-get update && sudo apt-get install -y git curl build-essential

# Install Node.js
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc && nvm install --lts

# Clone & install
git clone <REPO_URL> grace-chatbot-v3 && cd grace-chatbot-v3
npm ci

# Configure
cp .env.example .env && nano .env

# Build & run
npm run build
sudo npm i -g pm2
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

#### Nginx + HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

```nginx
# /etc/nginx/sites-available/grace-chatbot
server {
  listen 80;
  server_name YOUR_DOMAIN;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/grace-chatbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

#### CSV Backups (Recommended)

```cron
*/5 * * * * cd /home/USER/grace-chatbot-v3 && gsutil cp -n user_logs/user_actions.csv gs://BUCKET/backups/user_actions_$(date +\%Y\%m\%d_\%H\%M\%S).csv >/dev/null 2>&1
```

#### Safe Deploy Flow

```bash
cd /home/USER/grace-chatbot-v3
git pull && npm ci && npm run build
pm2 restart grace-chatbot
```

</details>

## Troubleshooting

| Problem | Solution |
|---------|----------|
| OpenAI calls fail | Check `OPENAI_API_KEY` in `.env` |
| Login returns 500 | Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` |
| CSV persistence fails | Check disk permissions/space, tune `CSV_LOCK_RETRIES` |
| Port conflict | Default is 3001, adjust via `PORT` env var |

---

<p align="center">
  <sub>Built for academic research at the University of Maryland</sub>
</p>
