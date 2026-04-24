import pandas as pd


SHEET_TYPE_COMPTE_MAPPING = "compte_mapping"
SHEET_TYPE_BRED = "bred_transactions"
SHEET_TYPE_HSBC = "hsbc_transactions"
SHEET_TYPE_UNKNOWN = "unknown"


def detect_sheet_type(xl: pd.ExcelFile, sheet_name: str) -> str:
    """Detect whether a sheet is BRED transactions, HSBC transactions, or a Compte mapping table."""
    df_raw = pd.read_excel(xl, sheet_name=sheet_name, header=None, nrows=6)
    headers_flat = set(df_raw.astype(str).values.flatten())

    # Compte mapping sheet: has 'Compte' and 'Libellé' columns and is narrow
    if "Compte" in headers_flat and "Libellé" in headers_flat:
        if df_raw.shape[1] <= 4:
            return SHEET_TYPE_COMPTE_MAPPING

    # BRED: has 'Card' and 'Releve' in headers
    if "Card" in headers_flat and "Releve" in headers_flat:
        return SHEET_TYPE_BRED

    # HSBC: has 'Commerçant' or 'Comptabilisé'
    if any(h in headers_flat for h in ["Commerçant", "Comptabilisé", "Commerçant"]):
        return SHEET_TYPE_HSBC

    # Fallback: check for Amount + Date columns (generic transaction sheet)
    if "Amount" in headers_flat and "Date" in headers_flat:
        if "Card" in headers_flat:
            return SHEET_TYPE_BRED
        return SHEET_TYPE_HSBC

    return SHEET_TYPE_UNKNOWN


def find_header_row(xl: pd.ExcelFile, sheet_name: str, max_scan: int = 6) -> int:
    """Find the row index of the actual header (skipping title/blank rows)."""
    df_raw = pd.read_excel(xl, sheet_name=sheet_name, header=None, nrows=max_scan)
    for i, row in df_raw.iterrows():
        non_null = row.dropna()
        str_values = [str(v) for v in non_null.values]
        # Header row has multiple string-like values (not all numeric/dates)
        str_count = sum(1 for v in str_values if not _is_numeric_or_date(v))
        if str_count >= 4:
            return i
    return 0


def _is_numeric_or_date(val: str) -> bool:
    try:
        float(val)
        return True
    except ValueError:
        pass
    # Simple date check
    if len(val) >= 8 and ("-" in val or "/" in val):
        return True
    return False
