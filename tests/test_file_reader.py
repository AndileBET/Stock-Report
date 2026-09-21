import pandas as pd

from backend.app.ingestion.file_reader import _detect_header


def test_source_export_qunatity_typo_is_supported():
    frame = pd.DataFrame(
        [
            [
                "Date",
                "Job Reference",
                "Source Site",
                "Destination Site",
                "Operator",
                "Classification",
                "Code",
                "Name",
                "Category",
                "Sub Category",
                "Unit",
                "Transaction",
                "qunatity",
                "Value",
                "Batch",
                "Actioned",
                "Comment",
            ],
            [
                "2026-05-01 07:55:21",
                "REF-001",
                "",
                "MPU Team 09",
                "Operator A",
                "Stock",
                "HWPR062",
                "MOBI TSHIRT",
                "HWM Stock",
                "",
                "Unit",
                "Stock Opening",
                "3",
                "209.76",
                "",
                "FALSE",
                "",
            ],
        ]
    )

    header_index, mapping = _detect_header(frame)

    assert header_index == 0
    assert mapping[6] == "Code"
    assert mapping[11] == "Transaction"
    assert mapping[12] == "Quantity"