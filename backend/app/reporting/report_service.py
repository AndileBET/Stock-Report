import json
from datetime import datetime, date, time
from pathlib import Path

from backend.app.config import PROCESSED_DATA_DIR, RUNTIME_TRANSACTIONS_FILE
from backend.app.domain.models import StockTransaction
from backend.app.ingestion.file_reader import read_uploaded_path
from backend.app.ingestion.normalize import NormalizationStats, normalize_rows_with_stats
from backend.app.reporting.item_usage import build_item_usage_report
from backend.app.reporting.region_team_item_summary import build_region_team_item_summary
from backend.app.reporting.regional_summary import build_regional_summary
from backend.app.reporting.request_comparison import build_request_comparison_report
from backend.app.reporting.variance_report import build_variance_report

REPORT_FILE_NAMES = {
    "regionalSummary": "regional_summary.json",
    "regionTeamItemSummary": "region_team_item_summary.json",
    "itemUsage": "item_usage.json",
    "varianceReport": "variance_report.json",
    "requestComparison": "request_comparison.json",
}


def build_reports_from_transactions(transactions: list[StockTransaction]) -> dict[str, list[dict[str, object]]]:
    return {
        "regionalSummary": build_regional_summary(transactions),
        "regionTeamItemSummary": build_region_team_item_summary(transactions),
        "itemUsage": build_item_usage_report(transactions),
        "varianceReport": build_variance_report(transactions),
        "requestComparison": build_request_comparison_report(transactions),
    }


def write_reports(reports: dict[str, list[dict[str, object]]], output_dir: Path = PROCESSED_DATA_DIR) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for key, name in REPORT_FILE_NAMES.items():
        (output_dir / name).write_text(json.dumps(reports[key], indent=2), encoding="utf-8")


def ingest_files(paths: list[Path]) -> tuple[list[StockTransaction], NormalizationStats, list[str]]:
    all_rows: list[dict[str, str]] = []
    errors: list[str] = []
    for path in paths:
        try:
            all_rows.extend(read_uploaded_path(path))
        except Exception as exc:
            errors.append(f"{path.name}: {exc}")
    transactions, stats = normalize_rows_with_stats(all_rows)
    return transactions, stats, errors


def filter_transactions_for_period(transactions: list[StockTransaction], start_date: date | None, end_date: date | None) -> list[StockTransaction]:
    if start_date is None and end_date is None:
        return transactions
    start_dt = datetime.combine(start_date, time.min) if start_date else datetime.min
    end_dt = datetime.combine(end_date, time.max) if end_date else datetime.max
    by_key: dict[tuple[str, str, str], list[StockTransaction]] = {}
    for tx in transactions:
        by_key.setdefault((tx.region, tx.team, tx.item_code), []).append(tx)
    selected: list[StockTransaction] = []
    for group in by_key.values():
        baseline = [tx for tx in group if tx.transaction_type == "Stock Opening" and tx.date and tx.date <= start_dt]
        if baseline:
            selected.append(max(baseline, key=lambda tx: tx.date or datetime.min))
        selected.extend(tx for tx in group if tx.date and start_dt <= tx.date <= end_dt)
    return _dedupe_objects(selected)


def save_transactions(transactions: list[StockTransaction]) -> None:
    RUNTIME_TRANSACTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = []
    for tx in transactions:
        row = tx.__dict__.copy()
        row["date"] = tx.date.isoformat() if tx.date else None
        row["quantity"] = str(tx.quantity)
        row["value"] = str(tx.value)
        payload.append(row)
    RUNTIME_TRANSACTIONS_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_saved_transactions() -> list[StockTransaction]:
    if not RUNTIME_TRANSACTIONS_FILE.exists():
        return []
    payload = json.loads(RUNTIME_TRANSACTIONS_FILE.read_text(encoding="utf-8"))
    rows: list[StockTransaction] = []
    for row in payload:
        row["date"] = datetime.fromisoformat(row["date"]) if row.get("date") else None
        from decimal import Decimal
        row["quantity"] = Decimal(row["quantity"])
        row["value"] = Decimal(row["value"])
        rows.append(StockTransaction(**row))
    return rows


def _dedupe_objects(transactions: list[StockTransaction]) -> list[StockTransaction]:
    seen = set()
    result = []
    for tx in transactions:
        key = (tx.date, tx.job_reference, tx.source_site, tx.destination_site, tx.operator, tx.classification, tx.item_code, tx.item_name, tx.transaction_type, tx.quantity, tx.value)
        if key in seen:
            continue
        seen.add(key)
        result.append(tx)
    return result
