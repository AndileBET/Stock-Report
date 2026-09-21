from collections import defaultdict
from decimal import Decimal
from backend.app.domain.models import StockTransaction
from backend.app.domain.stock_ledger import build_transaction_balances
from backend.app.domain.transaction_rules import is_usage

ZERO = Decimal("0")


def build_request_comparison_report(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    grouped = defaultdict(list)
    for balance in build_transaction_balances(transactions):
        tx = balance.transaction
        if is_usage(tx.transaction_type) and tx.job_reference:
            grouped[(tx.region, tx.team, tx.item_code, tx.job_reference)].append(balance)
    per_item = defaultdict(list)
    for key, rows in grouped.items():
        request = _build_request(rows)
        per_item[key[:3]].append(request)
    comparisons = []
    for requests in per_item.values():
        requests.sort(key=lambda x: (x["request_date_sort_key"] is None, x["request_date_sort_key"], x["job_reference"]))
        for previous, current in zip(requests, requests[1:]):
            comparisons.append(_compare(previous, current))
    return sorted(comparisons, key=lambda x: (x["region"], x["team"], x["item_name"], x["current_request_date"] or ""))


def _build_request(rows) -> dict[str, object]:
    first = rows[0].transaction
    qty = sum((r.transaction.quantity for r in rows), ZERO)
    value = sum((r.transaction.value for r in rows), ZERO)
    date = min((r.transaction.date for r in rows if r.transaction.date), default=None)
    last = max(rows, key=lambda r: r.transaction.date or 0)
    return {"region": first.region, "team": first.team, "item_code": first.item_code, "item_name": first.item_name, "category": first.category, "sub_category": first.sub_category, "unit": first.unit, "transaction_type": "Stock Used", "job_reference": first.job_reference, "request_date": date.isoformat() if date else None, "request_date_sort_key": date, "quantity": qty, "value": value, "remaining_quantity": last.balance_quantity, "remaining_value": last.balance_value}


def _compare(previous, current) -> dict[str, object]:
    qty_diff = current["quantity"] - previous["quantity"]
    value_diff = current["value"] - previous["value"]
    remain_diff = current["remaining_quantity"] - previous["remaining_quantity"]
    return {"region": current["region"], "team": current["team"], "item_code": current["item_code"], "item_name": current["item_name"], "category": current["category"], "sub_category": current["sub_category"], "unit": current["unit"], "transaction_type": "Stock Used", "previous_job_reference": previous["job_reference"], "previous_request_date": previous["request_date"], "previous_quantity": float(previous["quantity"]), "previous_value": float(previous["value"]), "previous_remaining_quantity": float(previous["remaining_quantity"]), "previous_remaining_value": float(previous["remaining_value"]), "current_job_reference": current["job_reference"], "current_request_date": current["request_date"], "current_quantity": float(current["quantity"]), "current_value": float(current["value"]), "current_remaining_quantity": float(current["remaining_quantity"]), "current_remaining_value": float(current["remaining_value"]), "quantity_difference": float(qty_diff), "quantity_percentage_change": float(_pct(previous["quantity"], qty_diff)), "value_difference": float(value_diff), "value_percentage_change": float(_pct(previous["value"], value_diff)), "remaining_difference": float(remain_diff)}


def _pct(previous: Decimal, difference: Decimal) -> Decimal:
    return ZERO if previous == ZERO else (difference / previous) * Decimal("100")
