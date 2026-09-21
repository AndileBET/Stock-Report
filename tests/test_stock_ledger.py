from datetime import datetime
from decimal import Decimal
from backend.app.domain.models import StockTransaction
from backend.app.domain.stock_ledger import build_stock_ledgers


def tx(kind, qty, date, *, region="FS", team="FS Team 07", code="ITEM"):
    return StockTransaction(datetime.fromisoformat(date), "", "", team, "Op", "", code, "Item", "Cat", "", "Unit", kind, Decimal(str(qty)), Decimal(str(qty * 10)), "batch", False, region, team)


def test_opening_is_snapshot_not_additive():
    rows=[tx("Stock Opening",4,"2026-08-18T08:00:00"),tx("Stock Used",1,"2026-08-18T12:00:00"),tx("Stock Opening",3,"2026-08-19T08:00:00")]
    ledger=next(iter(build_stock_ledgers(rows).values()))
    assert ledger.period_opening_quantity == Decimal("4")
    assert ledger.latest_opening_quantity == Decimal("3")
    assert ledger.closing_quantity == Decimal("3")


def test_movements_and_usage_build_current_cycle():
    rows=[tx("Stock Opening",3,"2026-08-18T08:00:00"),tx("Movement In",1,"2026-08-18T10:00:00"),tx("Movement Out",1,"2026-08-18T11:00:00"),tx("Stock Used",1,"2026-08-18T12:00:00")]
    ledger=next(iter(build_stock_ledgers(rows).values()))
    assert ledger.expected_quantity == Decimal("3")
    assert ledger.closing_quantity == Decimal("2")


def test_count_is_ignored():
    rows=[tx("Stock Opening",10,"2026-08-18T08:00:00"),tx("Count",999,"2026-08-18T09:00:00")]
    ledger=next(iter(build_stock_ledgers(rows).values()))
    assert ledger.closing_quantity == Decimal("10")
    assert ledger.transaction_count == 1
