from decimal import Decimal
from backend.app.domain.models import StockTransaction
from backend.app.domain.stock_ledger import StockLedgerEntry, build_stock_ledgers

ZERO = Decimal("0")


def build_variance_report(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    ledgers = build_stock_ledgers(transactions)
    return [_serialize_ledger(ledger) for _, ledger in sorted(ledgers.items(), key=lambda entry: (entry[1].region, entry[1].team, entry[1].item_name, entry[1].item_code))]


def _serialize_ledger(ledger: StockLedgerEntry) -> dict[str, object]:
    expected = ledger.expected_quantity
    expected_value = ledger.expected_value
    closing = ledger.closing_quantity
    closing_value = ledger.closing_value
    return {
        "region": ledger.region, "team": ledger.team, "item_code": ledger.item_code, "item_name": ledger.item_name, "category": ledger.category, "sub_category": ledger.sub_category, "unit": ledger.unit,
        "opening_events": ledger.opening_events, "period_opening_quantity": float(ledger.period_opening_quantity), "period_opening_value": float(ledger.period_opening_value), "latest_opening_quantity": float(ledger.latest_opening_quantity), "latest_opening_value": float(ledger.latest_opening_value),
        "intake_quantity": float(ledger.intake_quantity), "intake_value": float(ledger.intake_value), "movement_in_quantity": float(ledger.movement_in_quantity), "movement_in_value": float(ledger.movement_in_value), "movement_out_quantity": float(ledger.movement_out_quantity), "movement_out_value": float(ledger.movement_out_value), "used_quantity": float(ledger.used_quantity), "usage_value": float(ledger.usage_value),
        "current_intake_quantity": float(ledger.current_intake_quantity), "current_movement_in_quantity": float(ledger.current_movement_in_quantity), "current_movement_out_quantity": float(ledger.current_movement_out_quantity), "current_used_quantity": float(ledger.current_used_quantity),
        "expected_quantity": float(expected), "expected_value": float(expected_value), "closing_quantity": float(closing), "closing_value": float(closing_value), "remaining_quantity": float(closing), "remaining_value": float(closing_value),
        "shortage_quantity": float(ledger.shortage_quantity), "shortage_value": float(ledger.shortage_value), "variance_quantity": float(closing), "variance_value": float(closing_value),
        "variance_percentage": float((closing / expected) * Decimal("100")) if expected else 0.0, "variance_status": _variance_status(closing),
    }


def _variance_status(quantity: Decimal) -> str:
    if quantity < ZERO:
        return "Shortage"
    if quantity > ZERO:
        return "Remaining"
    return "Balanced"
