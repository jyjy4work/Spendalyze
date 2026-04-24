import pandas as pd


def detect_anomalies(df: pd.DataFrame) -> list[dict]:
    """
    Detect 4 types of anomalies:
      1. high_amount  — exceeds category mean + 2σ
      2. no_receipt   — Receipt? != YES
      3. duplicate    — same date + amount + merchant
      4. weekend      — transaction on Saturday or Sunday
    """
    if df.empty:
        return []

    seen_ids: set[int] = set()
    anomalies: list[dict] = []

    def _add(idx: int, row: pd.Series, reason: str, severity: str):
        if idx in seen_ids and reason != "duplicate":
            return
        seen_ids.add(idx)
        record = {
            "id": int(idx),
            "reason": reason,
            "severity": severity,
            "cardholder": row["cardholder"],
            "date": row["date"].strftime("%Y-%m-%d"),
            "merchant": row["merchant"],
            "amount": round(float(row["amount"]), 2),
            "compte": row["compte"],
            "libelle": row["libelle"],
            "details": row["details"],
            "receipt": bool(row["receipt"]),
            "bank": row["bank"],
            "invoice_number": str(row.get("invoice_number", "")),
        }
        anomalies.append(record)

    # 1. High amount per category (mean + 2σ)
    for compte, group in df.groupby("compte"):
        if len(group) < 3:
            continue
        mean = group["amount"].mean()
        std = group["amount"].std()
        if std == 0 or pd.isna(std):
            continue
        threshold = mean + 2 * std
        for idx, row in group[group["amount"] > threshold].iterrows():
            _add(idx, row, "high_amount", "high")

    # 2. No receipt
    no_receipt = df[~df["receipt"]]
    for idx, row in no_receipt.iterrows():
        _add(idx, row, "no_receipt", "medium")

    # 3. Duplicate suspicion (same date + amount + merchant)
    dup_mask = df.duplicated(subset=["date", "amount", "merchant"], keep=False)
    for idx, row in df[dup_mask].iterrows():
        _add(idx, row, "duplicate", "medium")

    # 4. Weekend transactions
    weekend = df[df["date"].dt.dayofweek >= 5]
    for idx, row in weekend.iterrows():
        _add(idx, row, "weekend", "low")

    return sorted(anomalies, key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["severity"]])
