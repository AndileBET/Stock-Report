from datetime import datetime

from backend.app.reporting.data_quality import build_data_quality_issues
from tests.conftest import make_transaction


def test_flags_next_opening_that_differs_from_previous_closing():
    transactions = [
        make_transaction("Stock Opening", "10", date=datetime(2026, 9, 1, 8)),
        make_transaction("Stock Used", "3", date=datetime(2026, 9, 1, 15)),
        make_transaction("Stock Opening", "9", date=datetime(2026, 9, 2, 8)),
    ]

    issues = build_data_quality_issues(transactions)

    assert len(issues) == 1
    assert issues[0]["type"] == "stock_opening_mismatch"
    assert issues[0]["expected_quantity"] == 7.0
    assert issues[0]["actual_quantity"] == 9.0
    assert issues[0]["previous_date"] == "2026-09-01"
    assert issues[0]["date"] == "2026-09-02"


def test_does_not_flag_matching_daily_opening():
    transactions = [
        make_transaction("Stock Opening", "10", date=datetime(2026, 9, 1, 8)),
        make_transaction("Stock Used", "3", date=datetime(2026, 9, 1, 15)),
        make_transaction("Stock Opening", "7", date=datetime(2026, 9, 2, 8)),
    ]

    assert build_data_quality_issues(transactions) == []


def test_does_not_compare_opening_to_day_without_opening_baseline():
    transactions = [
        make_transaction("Stock Used", "3", date=datetime(2026, 9, 1, 15)),
        make_transaction("Stock Opening", "7", date=datetime(2026, 9, 2, 8)),
    ]

    assert build_data_quality_issues(transactions) == []


def test_flags_unrecognized_team_region_code_such_as_gaz():
    transaction = make_transaction(
        "Stock Used",
        region="GAZ",
        team="GAZ Team 04",
        date=datetime(2026, 9, 2, 8),
    )

    issues = build_data_quality_issues([transaction])

    assert len(issues) == 1
    assert issues[0]["type"] == "unrecognized_region_code"
    assert issues[0]["region"] == "GAZ"
    assert issues[0]["team"] == "GAZ Team 04"


def test_flags_region_that_disagrees_with_team_prefix():
    transaction = make_transaction(
        "Stock Used",
        region="GAU",
        team="KZN Team 03",
        date=datetime(2026, 9, 2, 8),
    )

    issues = build_data_quality_issues([transaction])

    assert len(issues) == 1
    assert issues[0]["type"] == "region_team_mismatch"
