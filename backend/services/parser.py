import io
import re
import unicodedata
import pandas as pd
from typing import Optional
from .sheet_detector import (
    detect_sheet_type,
    find_header_row,
    SHEET_TYPE_BRED,
    SHEET_TYPE_HSBC,
    SHEET_TYPE_COMPTE_MAPPING,
)

# Cardholder name aliases — map alternate names to canonical name.
# Cardholder name aliases for consolidating different spellings of the same person.
# Keys are matched AFTER normalization (title case, honorific period added).
# Add entries as needed: "Alias Name": "Canonical Name"
# Example: {"Bob": "Robert Smith"}
CARDHOLDER_ALIASES: dict[str, str] = {}

# Fallback category map for Compte codes not in Feuil1
FALLBACK_COMPTE_CATEGORIES: dict[str, str] = {
    "625700": "접대비",
    "625100": "시내교통비",
    "606150": "주유비",
    "606330": "복리후생비",
    "626100": "우편비",
    "606400": "소모품",
    "651000": "소프트웨어 구독",
    "623100": "채용공고",
    "625120": "해외출장비",
    "615601": "시스템유지비",
    "622700": "공증비용",
    "618000": "구독료",
    "615500": "차량 수리유지비",
    "623400": "고객 선물",
    "625600": "이벤트",
    "627800": "기타 비용",
    "628100": "기타 대회",
    "626300": "웹 서비스",
    "647201": "직원 선물",
    "618100": "소프트웨어 구독료",
    "618300": "인쇄비",
    "615200": "사무실 보수유지",
    "671210": "차량 벌금",
    "606110": "전기세",
}

# HSBC column mapping (column index or name)
HSBC_COL_MAP = {
    "cardholder": 0,
    "date": "Date",
    "merchant": "Commerçant",
    "amount": "Amount",
    "receipt": "Receipt?",
    "comptabilise": "Comptabilisé",
    "month": "Month",
    "type": "Type",
    "compte": "Compte",
    "libelle_col": "Libellé",
    "net": "Net ",
    "vat": "Vat",
    "gross": "Gross",
    "details": "Details",
    "invoice_number": "invoice number",
}

# BRED column mapping
BRED_COL_MAP = {
    "cardholder": "Card",
    "date": "Date",
    "merchant": "Name",
    "amount": "Amount",
    "receipt": "Receipt?",
    "releve": "Releve",
    "month": "Month.1",
    "type": "Type",
    "compte": "N/L",
    "net": "Net ",
    "vat": "Vat Jr",
    "gross": "Gross",
    "details": "Details",
    "sold": "SOLD",
}


def parse_excel_bytes(
    file_bytes: bytes,
    filename: str,
    mapping_override: Optional[dict] = None,
) -> pd.DataFrame:
    """Parse all transaction sheets from an Excel file and return a unified DataFrame."""
    xl = pd.ExcelFile(io.BytesIO(file_bytes))

    compte_map: dict[str, str] = {}
    frames: list[pd.DataFrame] = []

    # Pass 1: load Compte mapping sheet first
    for sheet_name in xl.sheet_names:
        if detect_sheet_type(xl, sheet_name) == SHEET_TYPE_COMPTE_MAPPING:
            compte_map = _load_compte_mapping(xl, sheet_name)
            break

    # Pass 2: parse transaction sheets
    for sheet_name in xl.sheet_names:
        sheet_type = detect_sheet_type(xl, sheet_name)
        if sheet_type == SHEET_TYPE_BRED:
            df = _parse_bred_sheet(xl, sheet_name)
            df["bank"] = "BRED"
            frames.append(df)
        elif sheet_type == SHEET_TYPE_HSBC:
            df = _parse_hsbc_sheet(xl, sheet_name)
            df["bank"] = "HSBC"
            frames.append(df)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    combined = _clean_transactions(combined, compte_map)
    return combined


def get_sheet_preview(file_bytes: bytes, filename: str) -> list[dict]:
    """Return per-sheet metadata for column mapping preview."""
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    result = []
    for sheet_name in xl.sheet_names:
        sheet_type = detect_sheet_type(xl, sheet_name)
        header_row = find_header_row(xl, sheet_name)
        df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row, nrows=3)
        row_count = len(pd.read_excel(xl, sheet_name=sheet_name, header=header_row))
        result.append(
            {
                "name": sheet_name,
                "type": sheet_type,
                "bank": _bank_from_type(sheet_type),
                "row_count": row_count,
                "detected_header_row": header_row,
                "columns": [str(c) for c in df.columns.tolist()],
            }
        )
    return result


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_compte_mapping(xl: pd.ExcelFile, sheet_name: str) -> dict[str, str]:
    header_row = find_header_row(xl, sheet_name)
    df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)

    # Auto-detect the "Compte" column: look for a column whose values look like
    # 6-digit account codes (numeric strings like "625700").
    compte_col = None
    libelle_col = None

    # First try exact / normalised name match
    for c in df.columns:
        c_norm = str(c).strip().lower()
        if c_norm in ("compte", "compte n°", "n° compte", "code"):
            compte_col = c
        if c_norm in ("libellé", "libelle", "label", "description", "intitulé", "intitule"):
            libelle_col = c

    # Fallback: scan column values for 6-digit numeric codes
    if compte_col is None:
        for c in df.columns:
            sample = df[c].dropna().astype(str).str.strip()
            # A compte column has many 6-digit numeric-looking values
            digit_ratio = sample.str.match(r"^\d{4,7}$").mean()
            if digit_ratio > 0.4:
                compte_col = c
                break

    # Fallback: first non-compte string column is the label
    if libelle_col is None and compte_col is not None:
        for c in df.columns:
            if c == compte_col:
                continue
            sample = df[c].dropna().astype(str)
            if sample.str.len().mean() > 3:
                libelle_col = c
                break

    if compte_col is None:
        return {}

    mapping_df = df[[compte_col] + ([libelle_col] if libelle_col else [])].copy()
    mapping_df = mapping_df.dropna(subset=[compte_col])
    mapping_df[compte_col] = mapping_df[compte_col].astype(str).str.strip()

    if libelle_col:
        mapping_df[libelle_col] = mapping_df[libelle_col].fillna("").astype(str).str.strip()
        return dict(zip(mapping_df[compte_col], mapping_df[libelle_col]))
    else:
        return {k: "" for k in mapping_df[compte_col]}


def _parse_hsbc_sheet(xl: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
    header_row = find_header_row(xl, sheet_name)
    df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)

    m = HSBC_COL_MAP
    out = pd.DataFrame()
    out["cardholder"] = _col(df, m["cardholder"])
    out["date"] = pd.to_datetime(_col(df, m["date"]), errors="coerce")
    out["merchant"] = _col(df, m["merchant"]).astype(str).str.strip()
    out["amount"] = pd.to_numeric(_col(df, m["amount"]), errors="coerce")
    out["receipt"] = _col(df, m["receipt"]).astype(str).str.strip().str.upper() == "YES"
    out["comptabilise"] = _col(df, m["comptabilise"]).astype(str).str.strip().str.upper() == "YES"
    out["month"] = pd.to_datetime(_col(df, m["month"]), errors="coerce")
    out["type"] = _col(df, m["type"]).astype(str).str.strip()
    out["compte"] = _col(df, m["compte"]).astype(str).str.strip()
    out["libelle_raw"] = _col(df, m["libelle_col"]).astype(str).str.strip()
    out["net"] = pd.to_numeric(_col(df, m["net"]), errors="coerce").fillna(0)
    out["vat"] = pd.to_numeric(_col(df, m["vat"]), errors="coerce").fillna(0)
    out["gross"] = pd.to_numeric(_col(df, m["gross"]), errors="coerce").fillna(0)
    out["details"] = _col(df, m["details"]).astype(str).str.strip()
    out["invoice_number"] = _col(df, m["invoice_number"]).astype(str).str.strip()
    out["releve"] = None
    out["sold"] = None
    return out


def _parse_bred_sheet(xl: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
    header_row = find_header_row(xl, sheet_name)
    df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)

    m = BRED_COL_MAP
    out = pd.DataFrame()
    out["cardholder"] = _col(df, m["cardholder"]).astype(str).str.strip()
    out["date"] = pd.to_datetime(_col(df, m["date"]), errors="coerce")
    out["merchant"] = _col(df, m["merchant"]).astype(str).str.strip()
    out["amount"] = pd.to_numeric(_col(df, m["amount"]), errors="coerce")
    out["receipt"] = _col(df, m["receipt"]).astype(str).str.strip().str.upper() == "YES"
    out["comptabilise"] = False
    out["month"] = pd.to_datetime(_col(df, m["month"]), errors="coerce")
    out["type"] = _col(df, m["type"]).astype(str).str.strip()
    out["compte"] = _col(df, m["compte"]).astype(str).str.strip()
    out["libelle_raw"] = ""
    out["net"] = pd.to_numeric(_col(df, m["net"]), errors="coerce").fillna(0)
    out["vat"] = pd.to_numeric(_col(df, m["vat"]), errors="coerce").fillna(0)
    out["gross"] = pd.to_numeric(_col(df, m["gross"]), errors="coerce").fillna(0)
    out["details"] = _col(df, m["details"]).astype(str).str.strip()
    out["invoice_number"] = ""
    out["releve"] = pd.to_numeric(_col(df, m["releve"]), errors="coerce")
    out["sold"] = pd.to_numeric(_col(df, m["sold"]), errors="coerce").fillna(0)
    return out


def _normalize_text(s: str) -> str:
    """Strip, collapse internal whitespace, and NFC-normalize unicode."""
    s = unicodedata.normalize("NFC", str(s))
    return re.sub(r"\s+", " ", s).strip()


def _normalize_cardholder(s: str) -> str:
    """Normalize cardholder name to standard form with period after honorific.
    Mr Smith -> Mr. Smith | Mr.Smith -> Mr. Smith | MR.SMITH -> Mr. Smith
    """
    s = unicodedata.normalize("NFC", str(s))
    # Strip any existing period+space after honorific, then re-add ". "
    s = re.sub(r"\b(Mr|Mrs|Ms|Miss|Dr|Prof|Mme|Mlle)\b\.?\s*", r"\1. ", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s.title()


def _clean_transactions(df: pd.DataFrame, compte_map: dict[str, str]) -> pd.DataFrame:
    total_before = len(df)

    # Remove rows without date or amount
    df = df.dropna(subset=["date", "amount"])

    # Filter zero / negative amounts (refunds are kept; only exact 0 dropped)
    df = df[df["amount"] != 0]

    # Filter invalid dates (before year 2000)
    df = df[df["date"].dt.year >= 2000]

    dropped = total_before - len(df)
    if dropped:
        print(f"[parser] Dropped {dropped} rows (no date/amount or pre-2000)")

    # Normalize cardholder names (remove honorific periods, title case)
    df["cardholder"] = df["cardholder"].apply(_normalize_cardholder)
    df = df[df["cardholder"].str.len() > 0]
    df = df[df["cardholder"] != "Nan"]

    # Apply alias mapping (merge alternate names to canonical)
    df["cardholder"] = df["cardholder"].replace(CARDHOLDER_ALIASES)

    # Normalize merchant names: collapse whitespace + unicode NFC
    # This prevents "EUN-KEUNG KIM" vs "EUN-KEUNG KIM " being counted separately
    df["merchant"] = df["merchant"].apply(_normalize_text)
    df = df[df["merchant"].str.len() > 0]
    df = df[df["merchant"] != "Nan"]

    # Resolve Compte label: prefer Feuil1 mapping, then HSBC Libellé column, then fallback
    def resolve_libelle(row):
        compte_str = str(row["compte"]).strip()
        # 401* accounts → 현업 기타항목
        if compte_str.startswith("401"):
            return "현업 기타항목"
        if compte_str in compte_map and compte_map[compte_str]:
            return compte_map[compte_str]
        if str(row.get("libelle_raw", "")) not in ("", "nan", "0"):
            return str(row["libelle_raw"])
        return FALLBACK_COMPTE_CATEGORIES.get(compte_str, "기타")

    df["libelle"] = df.apply(resolve_libelle, axis=1)

    # Derived time fields
    df["year"] = df["date"].dt.year
    df["quarter"] = df["date"].dt.quarter
    df["month_str"] = df["date"].dt.to_period("M").astype(str)

    # Drop internal raw column
    df = df.drop(columns=["libelle_raw"], errors="ignore")

    return df.reset_index(drop=True)


def _col(df: pd.DataFrame, key):
    """Safe column accessor: accepts column name (str) or index (int)."""
    if isinstance(key, int):
        if key < len(df.columns):
            return df.iloc[:, key]
        return pd.Series([""] * len(df))
    if key in df.columns:
        return df[key]
    # Try partial match for columns with trailing spaces
    matches = [c for c in df.columns if str(c).strip() == str(key).strip()]
    if matches:
        return df[matches[0]]
    return pd.Series([""] * len(df))


def _bank_from_type(sheet_type: str) -> str:
    if sheet_type == SHEET_TYPE_BRED:
        return "BRED"
    if sheet_type == SHEET_TYPE_HSBC:
        return "HSBC"
    return ""
