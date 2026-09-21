from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
import re

from backend.app.domain.models import StockTransaction
from backend.app.domain.transaction_rules import normalize_transaction_type

REGIONAL_OFFICE_CODES = {
    "eastern cape": "ECP",
    "free state": "FS",
    "gauteng": "GAU",
    "kzn": "KZN",
    "kwa zulu natal": "KZN",
    "limpopo": "LIM",
    "north west": "NW",
    "northern cape": "NC",
    "western cape": "WCP",
}

DATETIME_FORMATS = (
    "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
    "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M:%S", "%d-%m-%Y %H:%M",
)


@dataclass(frozen=True)
class NormalizationStats:
    input_rows: int
    accepted_transactions: int
    duplicates_removed: int


def normalize_rows(rows: list[dict[str, str]]) -> list[StockTransaction]:
    transactions, _ = normalize_rows_with_stats(rows)
    return transactions


def normalize_rows_with_stats(rows: list[dict[str, str]]) -> tuple[list[StockTransaction], NormalizationStats]:
    transactions: list[StockTransaction] = []
    seen: set[tuple[object, ...]] = set()
    candidate_rows = 0

    for row in rows:
        transaction_type = normalize_transaction_type(row.get("Transaction", ""))
        if not transaction_type:
            continue

        source_site = _clean(row.get("Source Site"))
        destination_site = _clean(row.get("Destination Site"))
        attribution_site = _site_for_transaction(transaction_type, source_site, destination_site)

        transaction = StockTransaction(
            date=_parse_datetime(row.get("Date", "")),
            job_reference=_clean(row.get("Job Reference")),
            source_site=source_site,
            destination_site=destination_site,
            operator=_clean(row.get("Operator")),
            classification=_clean(row.get("Classification")),
            item_code=_clean(row.get("Code")) or _clean(row.get("Item Code")),
            item_name=_clean(row.get("Name")) or _clean(row.get("Item Name")),
            category=_clean(row.get("Category")),
            sub_category=_clean(row.get("Sub Category")),
            unit=_clean(row.get("Unit")),
            transaction_type=transaction_type,
            quantity=_parse_decimal(row.get("Quantity", "")),
            value=_parse_decimal(row.get("Value", "")),
            batch=_clean(row.get("Batch")),
            actioned=_parse_bool(row.get("Actioned", "")),
            region=_extract_region(attribution_site),
            team=_extract_team(attribution_site),
        )

        if not transaction.item_code:
            continue
        if transaction.quantity == 0:
            continue

        candidate_rows += 1
        key = _duplicate_key(transaction)
        if key in seen:
            continue
        seen.add(key)
        transactions.append(transaction)

    return transactions, NormalizationStats(
        input_rows=len(rows),
        accepted_transactions=len(transactions),
        duplicates_removed=max(0, candidate_rows - len(transactions)),
    )


def _duplicate_key(transaction: StockTransaction) -> tuple[object, ...]:
    return (
        transaction.date,
        _key_text(transaction.job_reference),
        _key_text(transaction.source_site),
        _key_text(transaction.destination_site),
        _key_text(transaction.operator),
        _key_text(transaction.classification),
        _key_text(transaction.item_code),
        _key_text(transaction.item_name),
        _key_text(transaction.transaction_type),
        transaction.quantity,
        transaction.value,
    )


def _key_text(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _clean(value: object) -> str:
    return " ".join(str(value or "").strip().split())


def _site_for_transaction(transaction_type: str, source_site: str, destination_site: str) -> str:
    if transaction_type == "Movement Out":
        return source_site or destination_site
    return destination_site or source_site


def _parse_datetime(value: object) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if hasattr(value, "to_pydatetime"):
        try:
            return value.to_pydatetime()
        except Exception:
            pass
    raw = _clean(value)
    if not raw:
        return None
    try:
        serial = float(raw)
        if 1 <= serial < 100000:
            return datetime(1899, 12, 30) + timedelta(days=serial)
    except (TypeError, ValueError):
        pass
    for fmt in DATETIME_FORMATS:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _parse_decimal(value: object) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        raw = str(value).strip().replace("R", "").replace(" ", "")
        if not raw:
            return Decimal("0")
        if "," in raw and "." in raw:
            raw = raw.replace(".", "").replace(",", ".") if raw.rfind(",") > raw.rfind(".") else raw.replace(",", "")
        else:
            raw = raw.replace(",", ".")
        return Decimal(raw)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _parse_bool(value: object) -> bool:
    return str(value or "").strip().lower() in {"true", "1", "yes"}


def _extract_region(site: str) -> str:
    site = _clean(site)
    if not site:
        return "Unknown"
    office = re.search(r"regional\s+(?:off|office)\s+(.+?)(?:\s+-\s+|$)", site, re.IGNORECASE)
    if office:
        return _regional_code_from_name(office.group(1))
    team_match = re.search(r"\b([A-Z]{2,4})\s+Team\b", site, re.IGNORECASE)
    if team_match:
        return team_match.group(1).upper()
    for prefix in ("Park", "Boxer", "Vryburg", "Potchefstroom", "Zeerust", "Mhluzi"):
        if site.lower().startswith(prefix.lower()):
            return prefix
    return site.split(" ", 1)[0]


def _regional_code_from_name(name: str) -> str:
    lowered = _clean(name).lower()
    for office_name, code in REGIONAL_OFFICE_CODES.items():
        if office_name in lowered:
            return code
    return lowered.split(" ", 1)[0].upper()


def _extract_team(site: str) -> str:
    site = _clean(site)
    if not site:
        return "Unknown"
    if " - " in site:
        left, right = site.rsplit(" - ", 1)
        if left.strip() and right.strip() and left.strip() != right.strip():
            if "team" in right.lower() or "regional office" in right.lower():
                return right.strip()
    return site
