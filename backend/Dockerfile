# Spendalyze Backend - FastAPI
FROM python:3.12-slim

WORKDIR /app

# System deps for pandas/openpyxl (none needed on slim, but keep pip fresh)
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
