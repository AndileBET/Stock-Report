from backend.app.reporting.item_usage import build_item_usage_report
from backend.app.reporting.region_team_item_summary import build_region_team_item_summary
from backend.app.reporting.request_comparison import build_request_comparison_report
from backend.app.reporting.variance_report import build_variance_report
from tests.conftest import make_transaction


def test_item_usage_only_counts_stock_used_and_unique_requests():
    rows = [
        make_transaction("Stock Opening", "10"),
        make_transaction("Stock Used", "3", "75", job_reference="REQ-001"),
        make_transaction("Stock Used", "2", "50", job_reference="REQ-001"),
        make_transaction("Intake", "20"),
    ]
    report = build_item_usage_report(rows)[0]
    assert report["request_count"] == 1
    assert report["used_quantity"] == 5.0
    assert report["usage_value"] == 125.0


def test_variance_report_ignores_count_and_reports_shortage():
    rows = [
        make_transaction("Stock Opening", "10", item_code="SHORT", item_name="Short Item"),
        make_transaction("Stock Used", "12", item_code="SHORT", item_name="Short Item"),
        make_transaction("Count", "999", item_code="SHORT", item_name="Short Item"),
    ]
    report = build_variance_report(rows)[0]
    assert report["expected_quantity"] == 10.0
    assert report["used_quantity"] == 12.0
    assert report["remaining_quantity"] == -2.0
    assert report["shortage_quantity"] == 2.0
    assert report["variance_status"] == "Shortage"


def test_region_team_item_summary_builds_consistent_hierarchy():
    rows = [
        make_transaction("Stock Opening", "10", region="LIM", team="LIM Team 05", item_code="HWPR001"),
        make_transaction("Stock Used", "3", "75", region="LIM", team="LIM Team 05", item_code="HWPR001"),
    ]
    report = build_region_team_item_summary(rows)[0]
    team = report["teams"][0]
    item = team["items"][0]
    assert report["expected_quantity"] == 10.0
    assert team["expected_quantity"] == 10.0
    assert item["expected_quantity"] == 10.0
    assert report["closing_quantity"] == 7.0


def test_request_comparison_compares_consecutive_usage_jobs():
    from datetime import datetime
    previous = make_transaction("Stock Used", "10", "200", job_reference="REQ-001", date=datetime(2026, 8, 9, 8, 0))
    current = make_transaction("Stock Used", "15", "300", job_reference="REQ-002", date=datetime(2026, 8, 10, 8, 0))
    report = build_request_comparison_report([previous, current])[0]
    assert report["previous_job_reference"] == "REQ-001"
    assert report["current_job_reference"] == "REQ-002"
    assert report["previous_quantity"] == 10.0
    assert report["current_quantity"] == 15.0
    assert report["quantity_difference"] == 5.0
    assert report["quantity_percentage_change"] == 50.0
