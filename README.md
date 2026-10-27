# Spendalyze

Corporate credit card expense analyzer. Upload the bank's Excel statements and get interactive dashboards: trends, category breakdowns, spend by cardholder and merchant, and rule-based checks for unusual transactions.

## What · Why · Result

| | |
|---|---|
| **What** | A local web app that reads corporate-card Excel statements and builds an expense dashboard in Korean, English or French. |
| **Why** | Monthly expense reporting was compiled by hand from several bank files. |
| **Result** | Adopted by the team for monthly reporting: preparation time went from **~10 minutes to ~10 seconds**. |

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

- Multi-file Excel upload
- In-memory parsing (no file persistence)
- Trends by month/quarter/year
- Category breakdown with drill-down
- Spend by cardholder and by merchant
- Rule-based checks for unusual transactions (possible duplicates, unusually high amounts, missing receipts, weekend spend)

## Security notes

- No authentication (intended for local / internal network use)
- Max upload size: 20 MB per file
- Files are processed in memory and never saved to disk
- CORS locked to `http://localhost:3000`

## Note

Shared as a portfolio project. **No company or employee data is included in this repository.**
