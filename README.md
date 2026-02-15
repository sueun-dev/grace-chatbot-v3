# grace-chatbot-v3

A Next.js chatbot service (single server for both frontend pages and backend API routes) that stores user actions as **raw data** in aggregated CSV files.

## Research Context

- Project timeline: **Jan 29, 2025** → **Feb 10, 2026**
- Developed to support a **Ph.D dissertation** research project
- Grace Jeonghyun Kim, Ph.D – UMD Directory (https://communication.umd.edu/directory/grace-jeonghyun-kim)  
  Role: Project Manager & Research Lead
- Dissertation topic: **APT (Alcohol Prevention Training, 알코올 프리벤션 트레이닝)**

## Quick Start (Local)

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env` (required)

This project uses the repo-root **`.env`** file (not `.env.local`).

```bash
cp .env.example .env
```

Fill at least:

- `OPENAI_API_KEY` (required; used by `/api/chat`, `/api/evaluate-response`)
- `OPENAI_DEFAULT_MODEL` (optional)
- `DOWNLOAD_TOKEN` (optional but recommended; protects CSV download endpoints)

### 3) Run the dev server (frontend + backend together)

```bash
npm run dev
```

- URL: `http://localhost:3001`
- `app/` pages and `app/api/*` routes run on the same server process.

## Production Run

```bash
npm run build
PORT=3001 npm run start
```

## Recommended Study / Ops Flow

1. Participant visits `/`, clicks `Get Started`, then enters an arbitrary code (participant ID).  
   - This is stored as `userIdentifier` and written to the CSV column `user_identifier`.
2. Navigate to a role-specific chatbot:
   - General: `/ai-chatbot`
   - Medical professional: `/medical-professional`
   - Student: `/student`
3. Participant completes questionnaires / scenarios / conversation / simulation (all actions are appended to the aggregated CSV as raw data).
4. The completion code shown at the end is stored in the CSV column `completion_code`.
5. Admin logs in at `/downloadit` and downloads CSV/ZIP (or downloads via API).

## CSV Logging (Core)

### Data collection endpoint (CSV)

- **POST** `"/api/log-action"`  
  Called by `utils/clientLogger.js` on the client, and persisted as CSV on the server.
  - Minimum required: `actionType` + (`userIdentifier` or `sessionId`)

### Storage location

- Default: `user_logs/user_actions.csv`
- Optional override: set `CSV_LOG_FILE` or `CSV_LOG_DIR` in `.env`  
  (e.g., separate paths per server / load-test runs)

### CSV shape (1 user = 1 row)

- **Each user's data is accumulated into a single CSV row.**
- Fixed columns:
  - `user_key`, `user_identifier`, `chatbot_type`, `risk_level`, `risk_description`, `risk_recommendation`, `total_score`, `action_count`, `completion_code`
- Action raw-data columns (row expands):
  - Each action expands columns like `action_1_*`, `action_2_*`, ...
  - Base action fields: `timestamp`, `session_id`, `action_type`, `action_details`, `question_id`, `response`, `score`, `scenario_type`, `message_content`, `option_selected`, `page_visited`
  - Any additional custom fields in the payload are automatically converted to `snake_case` and stored as columns for that action.

### Completion code storage (most important)

- On final completion, include `completionCode` (or `completion_code`) in the payload; it will be stored in the user's `completion_code` column.
- The completion code at `SIMULATION_COMPLETED` is also accumulated into `completion_code`.

### Concurrency / integrity

- Uses file locking (**proper-lockfile**) to prevent concurrent write collisions.
- Writes to a temp file and then atomically `rename`s to avoid leaving corrupted CSV.
- If `userIdentifier` arrives late, logs are first stored under a temporary `sessionId`-based row (`__session__...`), then merged into the user row once the user is identified.

## CSV Downloads (Admin)

> These APIs are protected by `DOWNLOAD_TOKEN` (header or query). If `DOWNLOAD_TOKEN` is not set, the default is `admin`.

### Download full aggregated CSV

- **GET** `"/api/download-csv?token=YOUR_TOKEN"`
- Authorization header is also supported: `Authorization: Bearer YOUR_TOKEN`

### Download a single user's row

- **GET** `"/api/download-csv?token=YOUR_TOKEN&userId=USER_ID"`

### Download a ZIP for multiple chatbot CSVs (if available)

- **GET** `"/api/download-all-csv?token=YOUR_TOKEN"`

## Admin Page (`/downloadit`)

- Path: `"/downloadit"`
- Login verification: **POST** `"/api/admin-auth"`
- CSV downloads internally call `"/api/download-csv"` and `"/api/download-all-csv"`.
- Default admin credentials (hardcoded):
  - ID: `admin`
  - PW: `grace2024!@#`

## Tests

### Lint

```bash
npm run lint
```

### Unit/integration tests (Jest)

```bash
npm test
```

### Frontend-only tests (Jest)

```bash
npm run test:frontend
```

### Backend-only tests (Jest)

```bash
npm run test:backend
```

### DB (CSV) tests (Jest)

```bash
npm run test:db
```

### 300-user concurrent CSV load test (realistic simulation)

> Simulates ~300 users logging actions at nearly the same time. Verifies the final CSV stays at **300 rows (1 user = 1 row)** and that `completion_code` is populated for everyone.

```bash
RUN_LOAD_TESTS=1 npm run test:backend -- tests/load/csvLoad300.loadtest.test.js
```

### Build

```bash
npm run build
```

### (Optional) E2E tests (Playwright)

```bash
npm run test:e2e
```

## Key folders

- `app/`: Next.js App Router (pages/components)
- `app/api/`: API routes (action logging, CSV downloads, etc.)
- `utils/`: Utilities for CSV logging, client logging, questionnaires, etc.
- `tests/`: Jest tests (unit/integration/load)
- `user_logs/`: Runtime CSV outputs (default path; gitignored)

## Ops / Troubleshooting checklist

- If OpenAI calls fail: check `OPENAI_API_KEY` in `.env`
- If CSV persistence fails: check disk permissions/space, tune lock settings (`CSV_LOCK_RETRIES`, `CSV_LOCK_STALE_MS`)
- If you hit a port conflict: `npm run dev` uses port 3001 by default (edit scripts or adjust `PORT`)

## Security notes (optional)

- `.env` is not committed to git (via `.gitignore`).
- If `DOWNLOAD_TOKEN` is not set, it defaults to `admin`, so set it in production.

---

## GCP Deployment Guide (Compute Engine + PM2)

This project is a single Next.js server that serves **both frontend pages and backend API routes** (`app/` + `app/api/**`). In production, you run **one Node process** (kept alive by PM2).

### 0) Prerequisites / What you will set up

- A GCP Project with billing enabled
- A Compute Engine VM (Ubuntu recommended)
- Node.js (LTS) + npm on the VM
- The repository cloned on the VM
- A `.env` file in the repo root (not `.env.local`)
- Build output via `npm run build`
- A long-running service via PM2 (auto-start on reboot)
- (Recommended) Nginx reverse proxy + HTTPS (Let’s Encrypt)
- (Recommended) CSV backup strategy (Cloud Storage)

### 1) Create a VM (Compute Engine)

1. Open GCP Console → **Compute Engine** → **VM instances**
2. Click **Create instance**
3. Recommended baseline for ~300 concurrent users on a single VM:
   - Machine type: `e2-standard-2` (2 vCPU, 8 GB) or higher
   - Boot disk: Ubuntu 22.04 LTS, **Balanced persistent disk** (or SSD if you want faster I/O)
4. Firewall:
   - Check **Allow HTTP traffic** and **Allow HTTPS traffic** (recommended if using Nginx)
5. Create the instance

### 2) SSH into the VM and install system dependencies

In the VM SSH terminal:

```bash
sudo apt-get update
sudo apt-get install -y git curl build-essential
```

### 3) Install Node.js (recommended via NVM)

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install --lts
nvm use --lts
node -v
npm -v
```

### 4) Clone the repo and install dependencies

```bash
git clone <YOUR_REPO_URL> grace-chatbot-v3
cd grace-chatbot-v3

# deterministic installs (recommended)
npm ci
```

### 5) Create `.env` (IMPORTANT: uses `.env`, not `.env.local`)

```bash
cp .env.example .env
nano .env
```

Fill at least:

- `OPENAI_API_KEY=` (required for `/api/chat`, `/api/evaluate-response`)
- `OPENAI_DEFAULT_MODEL=` (optional)
- `DOWNLOAD_TOKEN=` (recommended; protects CSV download endpoints)

Optional CSV settings (only if you want to override defaults):

- `CSV_LOG_DIR=` or `CSV_LOG_FILE=`
- `CSV_LOCK_RETRIES=`
- `CSV_LOCK_STALE_MS=`

### 6) Build the production app

```bash
npm run build
```

### 7) Run the server with PM2 (keeps it running forever)

Install PM2 globally:

```bash
sudo npm i -g pm2
pm2 -v
```

Start the app (two equivalent options):

**Option A: Use `ecosystem.config.js` (recommended)**

```bash
pm2 start ecosystem.config.js --env production
pm2 status
```

**Option B: Start `npm start` directly**

```bash
PORT=3001 pm2 start npm --name grace-chatbot -- start
pm2 status
```

Enable auto-start on reboot:

```bash
pm2 save
pm2 startup
```

PM2 will print a `sudo ...` command. Copy/paste it once. Then:

```bash
pm2 save
```

View logs:

```bash
pm2 logs grace-chatbot
```

### 8) (Recommended) Put Nginx in front (HTTP/HTTPS on 80/443)

Install Nginx:

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Create an Nginx site config (replace `YOUR_DOMAIN`):

```bash
sudo nano /etc/nginx/sites-available/grace-chatbot
```

Example config:

```nginx
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

Enable it:

```bash
sudo ln -sf /etc/nginx/sites-available/grace-chatbot /etc/nginx/sites-enabled/grace-chatbot
sudo nginx -t
sudo systemctl reload nginx
```

### 9) (Recommended) HTTPS with Let’s Encrypt

1. Point your domain A record to the VM external IP.
2. Install certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

3. Issue a certificate:

```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

### 10) CSV(DB) persistence and backups (IMPORTANT)

This project stores raw data as a **single aggregated CSV file** (default `user_logs/user_actions.csv`) on the VM disk.

Key operational notes:

- This design assumes **one server instance** writing to the same file.
  - Do not autoscale to multiple VMs unless you redesign storage (shared DB/object store).
- Ensure the VM disk is a **persistent disk** and the process has write permissions.

Recommended backups to Cloud Storage:

1. Create a GCS bucket: `gs://YOUR_BUCKET`
2. Install gcloud / gsutil (on the VM) and authenticate
3. Add a cron backup (example: every 5 minutes):

```bash
crontab -e
```

Example cron entry:

```cron
*/5 * * * * cd /home/<YOUR_USER>/grace-chatbot-v3 && /usr/bin/gsutil cp -n user_logs/user_actions.csv gs://YOUR_BUCKET/backups/user_actions_$(date +\\%Y\\%m\\%d_\\%H\\%M\\%S).csv >/dev/null 2>&1
```

### 11) Updating the server (safe deploy flow)

```bash
cd /home/<YOUR_USER>/grace-chatbot-v3
git pull
npm ci
npm run build
pm2 restart grace-chatbot
pm2 status
```

### 12) Health checks

- App: `http://YOUR_DOMAIN/` (or `http://VM_EXTERNAL_IP:3001/` if no Nginx)
- CSV download (token required): `GET /api/download-csv?token=...`
- ZIP download (token required): `GET /api/download-all-csv?token=...`
