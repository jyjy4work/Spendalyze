import json
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from services.parser import parse_excel_bytes, get_sheet_preview
from services.analyzer import (
    compute_summary,
    compute_trends,
    compute_categories,
    compute_users,
    compute_merchants,
    df_to_records,
)
from services.anomaly import detect_anomalies
from models.schemas import AnalyzeResponse, PreviewResponse

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB per file


def _ensure_xlsx_and_size(filename: str, content: bytes) -> None:
    if not filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail=f"{filename} is not an .xlsx file")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"{filename} exceeds {MAX_FILE_SIZE // (1024 * 1024)}MB limit",
        )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    files: list[UploadFile] = File(...),
    mapping: str = Form(default="{}"),
):
    mapping_override = json.loads(mapping)
    import pandas as pd

    frames = []
    for f in files:
        content = await f.read()
        _ensure_xlsx_and_size(f.filename, content)
        df = parse_excel_bytes(content, f.filename, mapping_override)
        if not df.empty:
            frames.append(df)

    if not frames:
        raise HTTPException(status_code=422, detail="No valid transaction data found")

    combined = pd.concat(frames, ignore_index=True)

    return AnalyzeResponse(
        summary=compute_summary(combined),
        transactions=df_to_records(combined),
        trends=compute_trends(combined),
        categories=compute_categories(combined),
        users=compute_users(combined),
        merchants=compute_merchants(combined),
        anomalies=detect_anomalies(combined),
    )


@router.post("/analyze/preview", response_model=PreviewResponse)
async def preview(files: list[UploadFile] = File(...)):
    result = []
    for f in files:
        content = await f.read()
        _ensure_xlsx_and_size(f.filename, content)
        sheets = get_sheet_preview(content, f.filename)
        result.append({"filename": f.filename, "sheets": sheets})
    return PreviewResponse(files=result)
