from collections import defaultdict
from decimal import Decimal

from backend.app.domain.models import StockTransaction
from backend.app.domain.stock_ledger import build_stock_ledgers

ZERO = Decimal("0")


def build_regional_summary(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    ledgers = build_stock_ledgers(transactions)
    summaries = defaultdict(_empty_summary)
    for ledger in ledgers.values():
        summary = summaries[ledger.region]
        summary["region"] = ledger.region
        summary["transaction_count"] += ledger.transaction_count
        summary["opening_quantity"] += ledger.period_opening_quantity
        summary["opening_value"] += ledger.period_opening_value
        summary["intake_quantity"] += ledger.intake_quantity
        summary["intake_value"] += ledger.intake_value
        summary["movement_in_quantity"] += ledger.movement_in_quantity
        summary["movement_in_value"] += ledger.movement_in_value
        summary["movement_out_quantity"] += ledger.movement_out_quantity
        summary["movement_out_value"] += ledger.movement_out_value
        summary["used_quantity"] += ledger.used_quantity
        summary["usage_value"] += ledger.usage_value
        summary["expected_quantity"] += ledger.expected_quantity
        summary["expected_value"] += ledger.expected_value
        summary["closing_quantity"] += ledger.closing_quantity
        summary["closing_value"] += ledger.closing_value
        summary["shortage_quantity"] += ledger.shortage_quantity
        summary["shortage_value"] += ledger.shortage_value
    return [_serialize_summary(summary) for _, summary in sorted(summaries.items())]


def _empty_summary() -> dict[str, Decimal | int | str]:
    return {
        "region": "", "transaction_count": 0,
        "opening_quantity": ZERO, "opening_value": ZERO,
        "intake_quantity": ZERO, "intake_value": ZERO,
        "movement_in_quantity": ZERO, "movement_in_value": ZERO,
        "movement_out_quantity": ZERO, "movement_out_value": ZERO,
        "used_quantity": ZERO, "usage_value": ZERO,
        "expected_quantity": ZERO, "expected_value": ZERO,
        "closing_quantity": ZERO, "closing_value": ZERO,
        "shortage_quantity": ZERO, "shortage_value": ZERO,
    }


def _serialize_summary(summary: dict[str, Decimal | int | str]) -> dict[str, object]:
    closing_quantity = Decimal(str(summary["closing_quantity"]))
    closing_value = Decimal(str(summary["closing_value"]))
    return {
        "region": summary["region"],
        "transaction_count": summary["transaction_count"],
        "opening_quantity": float(summary["opening_quantity"]),
        "opening_value": float(summary["opening_value"]),
        "intake_quantity": float(summary["intake_quantity"]),
        "intake_value": float(summary["intake_value"]),
        "movement_in_quantity": float(summary["movement_in_quantity"]),
        "movement_in_value": float(summary["movement_in_value"]),
        "movement_out_quantity": float(summary["movement_out_quantity"]),
        "movement_out_value": float(summary["movement_out_value"]),
        "used_quantity": float(summary["used_quantity"]),
        "usage_value": float(summary["usage_value"]),
        "expected_quantity": float(summary["expected_quantity"]),
        "expected_value": float(summary["expected_value"]),
        "closing_quantity": float(closing_quantity),
        "closing_value": float(closing_value),
        "remaining_quantity": float(closing_quantity),
        "remaining_value": float(closing_value),
        "shortage_quantity": float(summary["shortage_quantity"]),
        "shortage_value": float(summary["shortage_value"]),
        "variance_quantity": float(closing_quantity),
        "variance_value": float(closing_value),
        "variance_status": _variance_status(closing_quantity, Decimal(str(summary["shortage_quantity"]))),
    }


def _variance_status(closing_quantity: Decimal, shortage_quantity: Decimal) -> str:
    if shortage_quantity > ZERO:
        return "Shortage"
    if closing_quantity > ZERO:
        return "Remaining"
    return "Balanced"
