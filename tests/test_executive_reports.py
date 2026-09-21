from datetime import datetime
from decimal import Decimal

from backend.app.api import _build_executive_summary
from backend.app.domain.models import StockTransaction
from backend.app.reporting.executive_report import (
    build_docx_report,
    build_pdf_report,
    build_text_report,
)
from backend.app.reporting.report_service import save_transactions


def make_tx(region, team, item_code, item_name, tx_type, qty, value, job, dt):
    return StockTransaction(
        date=dt,
        job_reference=job,
        source_site="",
        destination_site=f"{region} Team",
        operator="Tester",
        classification="Stock",
        item_code=item_code,
        item_name=item_name,
        category="HWM - Stock",
        sub_category="",
        unit="Unit",
        transaction_type=tx_type,
        quantity=Decimal(str(qty)),
        value=Decimal(str(value)),
        batch="B1",
        actioned=True,
        region=region,
        team=team,
    )


def test_executive_summary_supports_multiple_regions_and_teams(monkeypatch):
    txs = [
        make_tx("FS", "FS Team 07", "A", "Book", "Stock Opening", 20, 200, "O1", datetime(2026, 5, 1, 8)),
        make_tx("FS", "FS Team 07", "A", "Book", "Stock Used", 4, 40, "R1", datetime(2026, 5, 2, 9)),
        make_tx("KZN", "KZN Team 02", "B", "Pen", "Stock Opening", 10, 100, "O2", datetime(2026, 5, 1, 8)),
        make_tx("KZN", "KZN Team 02", "B", "Pen", "Stock Used", 3, 30, "R2", datetime(2026, 5, 3, 9)),
    ]
    monkeypatch.setattr("backend.app.api._current_transactions", lambda: txs)

    summary = _build_executive_summary(
        scope="team",
        regions=["FS", "KZN"],
        teams=["FS Team 07", "KZN Team 02"],
        item_codes=[],
        from_date=None,
        to_date=None,
    )

    assert summary["metrics"]["teams"] == 2
    assert summary["metrics"]["regions"] == 2
    assert summary["metrics"]["used_quantity"] == 7
    assert len(summary["usage_by_item"]) == 2
    assert len(summary["usage_by_region"]) == 2


def test_executive_report_exports_are_nonempty(monkeypatch):
    txs = [
        make_tx("FS", "FS Team 07", "A", "Book", "Stock Opening", 20, 200, "O1", datetime(2026, 5, 1, 8)),
        make_tx("FS", "FS Team 07", "A", "Book", "Stock Used", 4, 40, "R1", datetime(2026, 5, 2, 9)),
    ]
    monkeypatch.setattr("backend.app.api._current_transactions", lambda: txs)

    summary = _build_executive_summary(
        scope="team",
        regions=["FS"],
        teams=["FS Team 07"],
        item_codes=[],
        from_date=None,
        to_date=None,
    )

    text = build_text_report(summary)
    pdf = build_pdf_report(summary).getvalue()
    docx = build_docx_report(summary).getvalue()

    assert "STOCK INTELLIGENCE - EXECUTIVE REPORT" in text
    assert len(pdf) > 1000
    assert pdf.startswith(b"%PDF")
    assert len(docx) > 1000
    assert docx[:2] == b"PK"
