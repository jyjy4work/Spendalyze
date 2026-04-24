# Spendalyze - How to Run (for coworkers)

## Prerequisites (one-time setup)

1. Install **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Start Docker Desktop (wait until the whale icon is stable)

That's it. No Python, no Node.js, no pip, no npm needed.

## Start the app

Open PowerShell or Terminal in this folder and run:

```powershell
docker compose up
```

First run takes **5-10 minutes** (downloads Python/Node images, installs deps, builds frontend).
Subsequent runs start in **~10 seconds**.

Then open your browser: **http://localhost:3000**

## Stop the app

Press `Ctrl + C` in the terminal, or run:

```powershell
docker compose down
```

## Update after code changes

```powershell
docker compose up --build
```

## Troubleshooting

- **Port 3000 or 8000 already in use**: Stop whatever is using those ports, or edit `docker-compose.yml` and change the left side of `"3000:3000"` to e.g. `"3001:3000"`.
- **"Cannot connect to Docker daemon"**: Docker Desktop is not running. Start it first.
- **Frontend shows "Backend unreachable"**: Wait ~20 seconds after start — backend takes a moment to boot on first run.
