import pandas as pd
from datetime import datetime

from backend.app.ingestion.file_reader import _detect_header, _normalise_header_cell
from backend.app.reporting.report_service import filter_transactions_for_period
from tests.conftest import make_transaction


def test_header_detection_accepts_aliases_and_extra_rows():
    frame = pd.DataFrame([
        ["Stock Report", None, None, None],
        ["Date", "Job Ref", "Product Code", "Transaction Type", "Qty"],
        ["2026-08-19", "REQ-1", "A1", "Stock Used", 1],
    ])
    index, mapping = _detect_header(frame)
    assert index == 1
    assert set(mapping.values()) >= {"Job Reference", "Code", "Transaction", "Quantity"}


def test_period_filter_carries_latest_opening_into_selected_period():
    rows = [
        make_transaction("Stock Opening", "10", date=datetime(2026, 8, 1, 8, 0)),
        make_transaction("Stock Used", "2", date=datetime(2026, 8, 3, 8, 0)),
        make_transaction("Stock Used", "1", date=datetime(2026, 8, 5, 8, 0)),
    ]
    selected = filter_transactions_for_period(rows, datetime(2026,8,5).date(), datetime(2026,8,5).date())
    assert len(selected) == 2
    assert selected[0].transaction_type == "Stock Opening"
    assert selected[1].transaction_type == "Stock Used"


def test_upload_returns_client_error_instead_of_windows_tempfile_500():
    from io import BytesIO
    from fastapi.testclient import TestClient
    from openpyxl import Workbook
    from backend.app.api import app

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Transactions"
    sheet.append(["This workbook has no transaction headers"])
    payload = BytesIO()
    workbook.save(payload)
    payload.seek(0)

    client = TestClient(app)
    response = client.post(
        "/api/reports/upload",
        files={
            "files": (
                "bad-upload.xlsx",
                payload.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 400
    assert "No usable transactions were found" in response.json()["detail"]
