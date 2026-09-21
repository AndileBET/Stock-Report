from collections import defaultdict
from decimal import Decimal

from backend.app.domain.models import StockTransaction
from backend.app.domain.stock_ledger import StockLedgerEntry, build_stock_ledgers

ZERO = Decimal("0")


def build_region_team_item_summary(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    ledgers = build_stock_ledgers(transactions)
    regions = defaultdict(_empty_region)
    for ledger in ledgers.values():
        region = regions[ledger.region]
        team = region["teams"][ledger.team]
        item = team["items"][ledger.item_code]
        item.update({
            "item_code": ledger.item_code,
            "item_name": ledger.item_name,
            "category": ledger.category,
            "sub_category": ledger.sub_category,
            "unit": ledger.unit,
        })
        _apply_ledger_totals(region, ledger)
        _apply_ledger_totals(team, ledger)
        _apply_ledger_totals(item, ledger)
    return [_serialize_region(name, region) for name, region in sorted(regions.items())]


def _empty_region() -> dict[str, object]:
    return {**_empty_totals(), "teams": defaultdict(_empty_team)}


def _empty_team() -> dict[str, object]:
    return {**_empty_totals(), "items": defaultdict(_empty_item)}


def _empty_item() -> dict[str, object]:
    return {"item_code": "", "item_name": "", "category": "", "sub_category": "", "unit": "", **_empty_totals()}


def _empty_totals() -> dict[str, object]:
    return {
        "transaction_count": 0, "opening_events": 0,
        "opening_quantity": ZERO, "opening_value": ZERO,
        "latest_opening_quantity": ZERO, "latest_opening_value": ZERO,
        "intake_quantity": ZERO, "intake_value": ZERO,
        "movement_in_quantity": ZERO, "movement_in_value": ZERO,
        "movement_out_quantity": ZERO, "movement_out_value": ZERO,
        "used_quantity": ZERO, "usage_value": ZERO,
        "expected_quantity": ZERO, "expected_value": ZERO,
        "closing_quantity": ZERO, "closing_value": ZERO,
        "shortage_quantity": ZERO, "shortage_value": ZERO,
    }


def _apply_ledger_totals(summary: dict[str, object], ledger: StockLedgerEntry) -> None:
    summary["transaction_count"] += ledger.transaction_count
    summary["opening_events"] += ledger.opening_events
    summary["opening_quantity"] += ledger.period_opening_quantity
    summary["opening_value"] += ledger.period_opening_value
    summary["latest_opening_quantity"] += ledger.latest_opening_quantity
    summary["latest_opening_value"] += ledger.latest_opening_value
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


def _serialize_region(region_name: str, region: dict[str, object]) -> dict[str, object]:
    return {"region": region_name, **_serialize_totals(region), "teams": [
        _serialize_team(name, team) for name, team in sorted(region["teams"].items())
    ]}


def _serialize_team(team_name: str, team: dict[str, object]) -> dict[str, object]:
    return {"team": team_name, **_serialize_totals(team), "items": [
        _serialize_item(item) for _, item in sorted(team["items"].items())
    ]}


def _serialize_item(item: dict[str, object]) -> dict[str, object]:
    return {"item_code": item["item_code"], "item_name": item["item_name"], "category": item["category"], "sub_category": item["sub_category"], "unit": item["unit"], **_serialize_totals(item)}


def _serialize_totals(summary: dict[str, object]) -> dict[str, object]:
    expected = Decimal(str(summary["expected_quantity"]))
    expected_value = Decimal(str(summary["expected_value"]))
    closing = Decimal(str(summary["closing_quantity"]))
    closing_value = Decimal(str(summary["closing_value"]))
    shortage = Decimal(str(summary["shortage_quantity"]))
    shortage_value = Decimal(str(summary["shortage_value"]))
    return {
        "transaction_count": summary["transaction_count"],
        "opening_events": summary["opening_events"],
        "opening_quantity": float(summary["opening_quantity"]),
        "opening_value": float(summary["opening_value"]),
        "latest_opening_quantity": float(summary["latest_opening_quantity"]),
        "latest_opening_value": float(summary["latest_opening_value"]),
        "intake_quantity": float(summary["intake_quantity"]),
        "intake_value": float(summary["intake_value"]),
        "movement_in_quantity": float(summary["movement_in_quantity"]),
        "movement_in_value": float(summary["movement_in_value"]),
        "movement_out_quantity": float(summary["movement_out_quantity"]),
        "movement_out_value": float(summary["movement_out_value"]),
        "used_quantity": float(summary["used_quantity"]),
        "usage_value": float(summary["usage_value"]),
        "expected_quantity": float(expected),
        "expected_value": float(expected_value),
        "closing_quantity": float(closing),
        "closing_value": float(closing_value),
        "remaining_quantity": float(closing),
        "remaining_value": float(closing_value),
        "shortage_quantity": float(shortage),
        "shortage_value": float(shortage_value),
        "variance_quantity": float(closing),
        "variance_value": float(closing_value),
        "variance_status": "Shortage" if shortage > ZERO else ("Remaining" if closing > ZERO else "Balanced"),
    }
