import pandas as pd
from typing import Optional


def compute_summary(df: pd.DataFrame) -> dict:
    if df.empty:
        return {}
    return {
        "totalAmount": round(float(df["amount"].sum()), 2),
        "totalCount": len(df),
        "uniqueUsers": sorted(df["cardholder"].dropna().unique().tolist()),
        "banks": sorted(df["bank"].dropna().unique().tolist()),
        "years": sorted(df["year"].dropna().unique().astype(int).tolist()),
        "dateRange": {
            "start": df["date"].min().strftime("%Y-%m-%d"),
            "end": df["date"].max().strftime("%Y-%m-%d"),
        },
    }


def compute_trends(
    df: pd.DataFrame,
    granularity: str = "monthly",
    bank_filter: Optional[str] = None,
) -> list[dict]:
    """Return time-series data grouped by year + period + bank.

    bank_filter applied server-side to avoid large payloads on narrow views.
    """
    if df.empty:
        return []

    if bank_filter and bank_filter != "all":
        df = df[df["bank"] == bank_filter]
        if df.empty:
            return []

    if granularity == "quarterly":
        df = df.copy()
        df["period"] = df["date"].dt.to_period("Q").astype(str)
    elif granularity == "yearly":
        df = df.copy()
        df["period"] = df["year"].astype(str)
    else:
        df = df.copy()
        df["period"] = df["month_str"]

    grouped = (
        df.groupby(["year", "period", "bank"])
        .agg(amount=("amount", "sum"), count=("amount", "count"))
        .reset_index()
    )
    grouped["amount"] = grouped["amount"].round(2)
    grouped["year"] = grouped["year"].astype(int)
    grouped["count"] = grouped["count"].astype(int)
    return grouped.sort_values("period").to_dict("records")


def compute_categories(df: pd.DataFrame) -> list[dict]:
    """Aggregate by Compte + Libellé label."""
    if df.empty:
        return []

    total = df["amount"].sum()
    grouped = (
        df.groupby(["compte", "libelle"])
        .agg(amount=("amount", "sum"), count=("amount", "count"))
        .reset_index()
    )
    grouped["percentage"] = (grouped["amount"] / total * 100).round(1)
    grouped["amount"] = grouped["amount"].round(2)
    grouped["count"] = grouped["count"].astype(int)
    return grouped.sort_values("amount", ascending=False).to_dict("records")


def compute_users(df: pd.DataFrame) -> list[dict]:
    """Per-cardholder summary with monthly breakdown and top merchants."""
    if df.empty:
        return []

    result = []
    for user, group in df.groupby("cardholder"):
        monthly = (
            group.groupby("month_str")["amount"]
            .sum()
            .round(2)
            .reset_index()
            .rename(columns={"month_str": "month", "amount": "amount"})
            .to_dict("records")
        )
        top_merchants = (
            group.groupby("merchant")["amount"]
            .sum()
            .round(2)
            .reset_index()
            .rename(columns={"amount": "amount"})
            .sort_values("amount", ascending=False)
            .head(10)
            .to_dict("records")
        )
        result.append(
            {
                "cardholder": user,
                "totalAmount": round(float(group["amount"].sum()), 2),
                "totalCount": len(group),
                "monthlyAmounts": monthly,
                "topMerchants": top_merchants,
            }
        )
    return sorted(result, key=lambda x: x["totalAmount"], reverse=True)


def compute_merchants(df: pd.DataFrame, top_n: int = 20) -> list[dict]:
    """Top-N merchants by total spend."""
    if df.empty:
        return []

    grouped = (
        df.groupby("merchant")
        .agg(totalAmount=("amount", "sum"), count=("amount", "count"))
        .reset_index()
    )
    grouped["avgAmount"] = (grouped["totalAmount"] / grouped["count"]).round(2)
    grouped["totalAmount"] = grouped["totalAmount"].round(2)
    grouped["count"] = grouped["count"].astype(int)
    return grouped.sort_values("totalAmount", ascending=False).head(top_n).to_dict("records")


def df_to_records(df: pd.DataFrame) -> list[dict]:
    """Serialize DataFrame to JSON-safe list of dicts."""
    if df.empty:
        return []
    out = df.copy()
    out["date"] = out["date"].dt.strftime("%Y-%m-%d")
    out["month"] = out["month"].apply(
        lambda x: x.strftime("%Y-%m-%d") if pd.notna(x) else ""
    )
    # Convert numpy types to Python natives
    for col in out.select_dtypes(include=["int64", "int32"]).columns:
        out[col] = out[col].astype(int)
    for col in out.select_dtypes(include=["float64", "float32"]).columns:
        out[col] = out[col].round(2).astype(float)
    out = out.fillna("")
    return out.to_dict("records")
