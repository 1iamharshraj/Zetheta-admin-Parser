# Zetheta Admin

Bulk report generator admin panel for Zetheta candidates.

## Features

- **Dashboard**: Real-time stats, success rate, 7-day activity chart
- **Jobs**: Create filtered bulk jobs (tech / non-tech), start/stop/retry/delete
- **Calls**: View every API call with full request/response payload, retry individual failures
- **Candidates**: Sync and browse candidates from Zetheta with filtering

## Quick Start (Local)

### Backend
```bash
cd backend
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # Windows
# source venv/bin/pip install -r requirements.txt  # Linux/Mac
venv/Scripts/uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deploy on GCP

1. **Provision VM**: GCP Compute Engine e2-medium, Ubuntu 22.04, allow HTTP/HTTPS traffic
2. **Install Docker**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   ```
3. **Clone & Run**:
   ```bash
   git clone <repo>
   cd zetheta-admin
   sudo docker-compose up -d --build
   ```
4. **Access**: Open `http://<VM_EXTERNAL_IP>` in browser

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./zetheta_admin.db` | Database connection |
| `TARGET_URL_TECH` | `http://3.111.11.130/api/zetheta/analyze` | Tech report API |
| `TARGET_URL_NONTECH` | `http://3.111.11.130/api/v2/zetheta/analyze/document` | Non-tech report API |
| `MAX_CONCURRENT_CALLS` | `3` | Parallel API calls |
| `CALL_DELAY_SECONDS` | `1.0` | Delay between calls |
| `MAX_RETRIES` | `3` | Retry attempts for failures |

## API Endpoints

- `GET /api/dashboard/stats` — Dashboard statistics
- `GET /api/dashboard/chart?days=7` — Activity chart data
- `GET /api/jobs` — List all jobs
- `POST /api/jobs` — Create a new job
- `POST /api/jobs/{id}/start` — Start a job
- `POST /api/jobs/{id}/stop` — Stop a running job
- `POST /api/jobs/{id}/retry-failed` — Retry failed calls
- `GET /api/calls?job_id=&status=&page=&limit=` — List API calls
- `POST /api/calls/{id}/retry` — Retry a single call
- `GET /api/candidates?type=&role=&course=&college=&search=` — List candidates
- `POST /api/candidates/sync?submission_type=` — Sync from Zetheta

## Monitoring

Production metrics and logs for the Zetheta API/backend are available in Grafana at `http://<your-host>/grafana`. See the centralized [`MONITORING.md`](../MONITORING.md) for details.
