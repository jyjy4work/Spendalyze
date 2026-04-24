# Spendalyze

Corporate credit card expense analyzer. Upload Excel files, get interactive dashboards with trends, category breakdowns, user comparisons, merchant rankings, and anomaly detection.

## Stack

- **Backend**: FastAPI + pandas + openpyxl (Python 3.12)
- **Frontend**: Next.js 16 + React 19 + Recharts + Tailwind CSS

## Quick start (Docker)

```bash
docker compose up --build
```

Then open http://localhost:3000

## Quick start (manual, Windows)

```powershell
.\start.ps1
```

## Features

- Multi-file Excel upload (BRED / HSBC bank formats)
- In-memory parsing (no file persistence)
- Trends by month/quarter/year
- Category breakdown with drill-down
- User and merchant rankings
- Rule-based anomaly detection

## Security notes

- No authentication (intended for local / internal network use)
- Max upload size: 20 MB per file
- Files are processed in memory and never saved to disk
- CORS locked to `http://localhost:3000`

## License

Private / internal use.
