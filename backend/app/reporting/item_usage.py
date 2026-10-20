from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from backend.app.domain.models import StockTransaction
from backend.app.domain.transaction_rules import is_usage

ZERO = Decimal("0")


def build_item_usage_report(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    usage_by_item = defaultdict(_empty_item_usage)
    for transaction in transactions:
        if not is_usage(transaction.transaction_type):
            continue
        key = (transaction.region, transaction.team, transaction.item_code)
        item = usage_by_item[key]
        item.update({"region": transaction.region, "team": transaction.team, "item_code": transaction.item_code, "item_name": transaction.item_name, "category": transaction.category, "sub_category": transaction.sub_category, "unit": transaction.unit})
        if transaction.job_reference:
            item["request_references"].add(transaction.job_reference)
        item["usage_transaction_count"] += 1
        item["used_quantity"] += transaction.quantity
        item["usage_value"] += transaction.value
        if transaction.date:
            item["first_usage_date"] = transaction.date if item["first_usage_date"] is None else min(item["first_usage_date"], transaction.date)
            item["last_usage_date"] = transaction.date if item["last_usage_date"] is None else max(item["last_usage_date"], transaction.date)
    return [_serialize_item_usage(item) for _, item in sorted(usage_by_item.items())]


def _empty_item_usage() -> dict[str, object]:
    return {"region": "", "team": "", "item_code": "", "item_name": "", "category": "", "sub_category": "", "unit": "", "request_references": set(), "usage_transaction_count": 0, "used_quantity": ZERO, "usage_value": ZERO, "first_usage_date": None, "last_usage_date": None}


def _serialize_item_usage(item: dict[str, object]) -> dict[str, object]:
    used = Decimal(str(item["used_quantity"]))
    value = Decimal(str(item["usage_value"]))
    requests = len(item["request_references"])
    return {
        "region": item["region"], "team": item["team"], "item_code": item["item_code"], "item_name": item["item_name"], "category": item["category"], "sub_category": item["sub_category"], "unit": item["unit"],
        "request_count": requests, "usage_transaction_count": item["usage_transaction_count"], "used_quantity": float(used), "usage_value": float(value),
        "average_quantity_per_request": float(used / Decimal(requests)) if requests else 0.0,
        "average_value_per_request": float(value / Decimal(requests)) if requests else 0.0,
        "first_usage_date": item["first_usage_date"].isoformat() if item["first_usage_date"] else None,
        "last_usage_date": item["last_usage_date"].isoformat() if item["last_usage_date"] else None,
    }
