from pydantic import BaseModel
from typing import Optional


class DateRange(BaseModel):
    start: str
    end: str


class Summary(BaseModel):
    totalAmount: float
    totalCount: int
    uniqueUsers: list[str]
    banks: list[str]
    years: list[int]
    dateRange: DateRange


class AnalyzeResponse(BaseModel):
    summary: Summary
    transactions: list[dict]
    trends: list[dict]
    categories: list[dict]
    users: list[dict]
    merchants: list[dict]
    anomalies: list[dict]


class SheetInfo(BaseModel):
    name: str
    type: str
    bank: str
    row_count: int
    detected_header_row: int
    columns: list[str]


class FilePreview(BaseModel):
    filename: str
    sheets: list[SheetInfo]


class PreviewResponse(BaseModel):
    files: list[FilePreview]
