# grace-chatbot-v3

Next.js 기반 챗봇 서비스(프론트+백엔드 API 동일 서버)이며, 유저 행동을 **raw data**로 CSV에 누적 저장합니다.

## 빠른 시작 (로컬)

### 1) 의존성 설치

```bash
npm install
```

### 2) `.env` 생성 (필수)

이 프로젝트는 `.env.local`이 아니라 **루트의 `.env`**를 기준으로 설정합니다.

```bash
cp .env.example .env
```

`.env`에 최소한 아래 값을 채워주세요:

- `OPENAI_API_KEY` (필수: `/api/chat`, `/api/evaluate-response`에서 사용)
- `OPENAI_DEFAULT_MODEL` (선택)
- `DOWNLOAD_TOKEN` (선택이지만 권장: CSV 다운로드 API 보호)

### 3) 개발 서버 실행 (프론트+백엔드 같이 실행)

```bash
npm run dev
```

- 접속: `http://localhost:3001`
- `app/`의 페이지와 `app/api/*` API 라우트가 동일 서버에서 동작합니다.

## 운영 실행 (프로덕션)

```bash
npm run build
PORT=3001 npm run start
```

## 실험/운영 진행 흐름 (권장)

1. 참가자는 `/` 접속 후 `Get Started` → 임의의 코드 입력(참가자 ID)  
   - 이 값이 `userIdentifier`로 저장되고, CSV의 `user_identifier`에 사용됩니다.
2. 역할별 챗봇으로 이동
   - 일반: `/ai-chatbot`
   - 의료인: `/medical-professional`
   - 학생: `/student`
3. 참가자가 설문/시나리오/대화/시뮬레이션을 진행(모든 행동이 raw data로 CSV 누적)
4. 마지막에 제공되는 completion code가 `completion_code`로 CSV에 저장됨
5. 관리자는 `/downloadit`에서 로그인 후 CSV/ZIP 다운로드(또는 API로 직접 다운로드)

## CSV 로깅 (핵심)

### 데이터 수집 sub-url (CSV)

- **POST** `"/api/log-action"`  
  클라이언트에서 `utils/clientLogger.js`가 호출하며, 서버에서 CSV로 저장합니다.
  - 최소 요구값: `actionType` + (`userIdentifier` 또는 `sessionId`)

### 저장 위치

- 기본: `user_logs/user_actions.csv`
- 변경(선택): `.env`에 `CSV_LOG_FILE` 또는 `CSV_LOG_DIR`로 경로 지정 가능  
  (예: 로드테스트/서버별 경로 분리)

### CSV 형태 (1유저 = 1행)

- **1명의 유저 데이터는 CSV 1행에 누적**됩니다.
- 기본 컬럼(행 고정):
  - `user_key`, `user_identifier`, `chatbot_type`, `risk_level`, `risk_description`, `risk_recommendation`, `total_score`, `action_count`, `completion_code`
- 행동(액션) raw data 컬럼(행 확장):
  - 각 액션은 `action_1_*`, `action_2_*` … 형태로 컬럼이 늘어납니다.
  - 기본 액션 필드: `timestamp`, `session_id`, `action_type`, `action_details`, `question_id`, `response`, `score`, `scenario_type`, `message_content`, `option_selected`, `page_visited`
  - 추가로 payload에 들어온 커스텀 필드는 자동으로 `snake_case` 변환되어 해당 액션의 컬럼으로 저장됩니다.

### completion code 저장 (가장 중요)

- 최종 완료 시 payload에 `completionCode`(또는 `completion_code`)를 넣으면, 유저 행의 `completion_code` 컬럼에 저장됩니다.
- 시뮬레이션 완료(`SIMULATION_COMPLETED`) 시점의 completion code도 동일하게 `completion_code`로 누적됩니다.

### 동시성/무결성

- CSV는 **파일 락(proper-lockfile)** 으로 동시 write 충돌을 방지하고,
- 저장은 temp 파일로 쓴 뒤 `rename` 하는 방식(atomic)으로 깨진 CSV가 남지 않도록 처리합니다.
- `userIdentifier`가 늦게 도착하는 경우를 위해 `sessionId` 기반 임시 행(`__session__...`)에 저장 후, 유저가 식별되면 해당 행을 유저 행으로 **merge**합니다.

## CSV 다운로드 (관리용)

> 아래 API는 `DOWNLOAD_TOKEN`으로 보호됩니다(헤더 또는 쿼리). `DOWNLOAD_TOKEN`을 설정하지 않으면 기본값은 `admin` 입니다.

### 전체 CSV (aggregated) 다운로드

- **GET** `"/api/download-csv?token=YOUR_TOKEN"`
- Authorization 헤더도 가능: `Authorization: Bearer YOUR_TOKEN`

### 특정 유저 1행만 다운로드

- **GET** `"/api/download-csv?token=YOUR_TOKEN&userId=USER_ID"`

### 여러 챗봇 CSV ZIP 다운로드(있을 때만)

- **GET** `"/api/download-all-csv?token=YOUR_TOKEN"`

## 관리자 페이지(`/downloadit`)

- 경로: `"/downloadit"`
- 로그인 검증: **POST** `"/api/admin-auth"`
- CSV 다운로드는 내부적으로 `"/api/download-csv"`, `"/api/download-all-csv"`를 호출합니다.
- 관리자 로그인 기본값(하드코딩):
  - ID: `admin`
  - PW: `grace2024!@#`

## 테스트

### 린트

```bash
npm run lint
```

### 유닛/통합 테스트(Jest)

```bash
npm test
```

### 프론트만 테스트(Jest)

```bash
npm run test:frontend
```

### 백엔드만 테스트(Jest)

```bash
npm run test:backend
```

### DB(CSV)만 테스트(Jest)

```bash
npm run test:db
```

### 300명 동시 CSV 로드 테스트 (실제 형식 시뮬레이션)

> 300명이 거의 동시에 행동 로그를 쌓는 상황을 가정하고, 최종 CSV가 **300행(1유저=1행)** 유지되며 `completion_code`가 모두 채워지는지 검증합니다.

```bash
RUN_LOAD_TESTS=1 npm run test:backend -- tests/load/csvLoad300.loadtest.test.js
```

### 빌드 검증

```bash
npm run build
```

### (선택) E2E 테스트(Playwright)

```bash
npm run test:e2e
```

## 주요 폴더 구조

- `app/`: Next.js App Router(페이지/컴포넌트)
- `app/api/`: API 라우트(로그 수집, CSV 다운로드 등)
- `utils/`: CSV 로깅/클라이언트 로깅/설문 등 유틸
- `tests/`: Jest 테스트(유닛/통합/로드)
- `user_logs/`: 런타임 CSV 출력(기본 경로, git ignore)

## 운영/문제 해결 체크리스트

- OpenAI 호출이 실패하면: `.env`의 `OPENAI_API_KEY` 확인
- CSV 저장이 실패하면: 디스크 권한/용량 확인, 락 대기값 조정(`CSV_LOCK_RETRIES`, `CSV_LOCK_STALE_MS`)
- 포트 충돌이면: `npm run dev`는 3001 사용(스크립트 수정 또는 `PORT` 조정)

## 보안 참고(선택)

- `.env`는 git에 커밋되지 않습니다(`.gitignore`).
- `DOWNLOAD_TOKEN`을 설정하지 않으면 기본값이 `admin`이라 운영에서는 설정을 권장합니다.

---

## GCP Deployment Guide (Compute Engine + PM2) (English)

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
