# Prometheus, Grafana & Loki Playground

## Purpose
This repository packages a complete monitoring sandbox that demonstrates how a Node.js service can expose Prometheus-compatible metrics, emit structured logs, and how both signals can be explored in Grafana using Prometheus and Loki. It serves as a lightweight reference for learning the basics of instrumentation, scraping, log shipping, and dashboarding with modern tooling.

## Scope
- **Metrics Generator** – Node.js/Express service that emits default process metrics and several custom counters, gauges, and histograms via `/metrics`, plus structured JSON application logs.
- **Prometheus Server** – Scrapes the metrics generator on a short interval and stores the collected series.
- **Grafana Instance** – Pre-provisioned with Prometheus and Loki data sources, plus dashboards for both metrics and logs.
- **Loki** – Stores logs received from Promtail and serves them to Grafana.
- **Promtail** – Tails the Node.js application log file, enriches entries with labels, and forwards them to Loki.
- **Docker Compose Stack** – Single command workflow to bring all services up locally for experimentation or demos.

## Tech Stack
- Node.js 18 & Express
- prom-client
- Prometheus
- Grafana
- Grafana Loki
- Grafana Promtail
- Docker & Docker Compose
- npm (for local Node.js development)

## Repository Layout
```
.
├── app/
│   ├── app.js              # Express server with metrics + structured logging
│   ├── Dockerfile          # Container image for the metrics generator
│   ├── package.json        # Node.js scripts and dependencies
│   └── node_modules/       # Installed packages (not needed when using Docker)
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── datasource.yml                 # Prometheus & Loki data sources
│       └── dashboards/
│           ├── dashboard.yml                  # Dashboard provisioning manifest
│           ├── nodejs-logs-dashboard.json     # Pre-built log exploration panels
│           └── nodejs-metrics-dashboard.json  # Pre-built metrics visualisations
├── loki/
│   └── config.yml          # Loki single-binary configuration (filesystem storage)
├── prometheus/
│   └── prometheus.yml      # Prometheus scrape configuration
├── promtail/
│   ├── positions.yaml      # Promtail file offsets for log tailing
│   └── promtail-config.yml # Promtail scrape pipeline and Loki client
├── docker-compose.yml      # Orchestrates app, Prometheus, Grafana, Loki, Promtail
└── README.md               # Project documentation (this file)
```

## Prerequisites
- Docker Desktop (or compatible Docker Engine + Compose plugin)
- Alternatively, Node.js 18 and npm if you plan to run the metrics app outside containers

## Setup & Installation

### Option A: Run the Full Stack with Docker Compose
```bash
docker compose up --build
```
- Metrics API: http://localhost:3000 (health check at `/health`, metrics at `/metrics`)
- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3001 (login `admin` / `admin` on first run)
  - Dashboards: **Node.js Metrics Dashboard**, **Node.js Logs Dashboard**

Stop with `Ctrl+C`, and clean up containers and volumes via `docker compose down` (add `-v` to remove persisted Grafana/Prometheus data).

### Option B: Run Services Locally (for development)
1. Install dependencies for the metrics generator:
   ```bash
   cd app
   npm install
   npm start      # or: npm run dev
   ```
2. Run Prometheus and Grafana via Docker (recommended):
   ```bash
   docker compose up prometheus grafana
   ```
   Prometheus expects the Node app at `http://localhost:3000/metrics`; adjust `prometheus/prometheus.yml` if needed.
3. For Grafana data sources or dashboards to refresh after edits to provisioning files, restart the Grafana container.

## Usage
1. Start the services (Docker or local workflow above).
2. Generate traffic by letting the Node app run; it continuously produces synthetic metrics.
3. Explore metrics and logs:
   - Grafana dashboards: http://localhost:3001/dashboards → open **Node.js Metrics Dashboard** and **Node.js Logs Dashboard**.
   - Grafana Explore: choose the **Loki** datasource and run `{app="metrics-generator"}` for live logs.
   - Grafana data sources: http://localhost:3001/connections/datasources to verify Prometheus and Loki connectivity.
   - Prometheus targets: http://localhost:9090/targets to confirm scrape health.
4. Call the health or metrics endpoints directly if desired:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/metrics
   ```

## Testing
This sample does not ship with automated tests. You can add regression coverage (e.g., Jest for Node metrics generation or Docker-based integration smoke tests) as the stack evolves.

## Configuration
Key locations for tuning the stack:
- `app/app.js` – modify or extend the synthetic metrics generation.
- `app/logs/app.log` – JSON log file written by the app and tailed by Promtail.
- `prometheus/prometheus.yml` – adjust scrape intervals, targets, or add new jobs.
- `grafana/provisioning/dashboards/nodejs-metrics-dashboard.json` – expand or customize visualisations; restart Grafana to apply.
- `grafana/provisioning/dashboards/nodejs-logs-dashboard.json` – adjust log queries and presentation; restart Grafana to apply.
- `promtail/promtail-config.yml` – change log scrape paths or pipeline stages.
- `loki/config.yml` – tweak storage options or retention policies.
- Environment variables can be passed into services via `docker-compose.yml` if you need to externalize settings (e.g., different scrape endpoints).

## Support & Contributions
This project is intended as a reference implementation. Feel free to fork it, adapt it to your needs, and share improvements via pull requests or issues.
