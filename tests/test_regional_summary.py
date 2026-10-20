from backend.app.reporting.regional_summary import build_regional_summary
from tests.conftest import make_transaction


def test_regional_summary_uses_expected_stock_before_usage():
    rows = [
        make_transaction("Stock Opening", "10", "100"),
        make_transaction("Intake", "5", "50"),
        make_transaction("Movement In", "3", "30"),
        make_transaction("Movement Out", "2", "20"),
        make_transaction("Stock Used", "4", "40"),
        make_transaction("Count", "999", "99999"),
    ]
    summary = build_regional_summary(rows)[0]
    assert summary["opening_quantity"] == 10.0
    assert summary["expected_quantity"] == 16.0
    assert summary["used_quantity"] == 4.0
    assert summary["closing_quantity"] == 12.0
    assert summary["shortage_quantity"] == 0.0


def test_regional_summary_preserves_shortage_as_negative_remaining():
    rows = [
        make_transaction("Stock Opening", "10"),
        make_transaction("Stock Used", "13", "130"),
    ]
    summary = build_regional_summary(rows)[0]
    assert summary["expected_quantity"] == 10.0
    assert summary["used_quantity"] == 13.0
    assert summary["remaining_quantity"] == -3.0
    assert summary["shortage_quantity"] == 3.0
    assert summary["variance_status"] == "Shortage"
