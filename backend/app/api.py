from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from shutil import copyfileobj
import tempfile

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.config import UPLOAD_DATA_DIR
from backend.app.reporting.executive_report import (
    build_docx_report,
    build_pdf_report,
    build_text_report,
)
from backend.app.reporting.report_service import (
    build_reports_from_transactions,
    filter_transactions_for_period,
    ingest_files,
    load_saved_transactions,
    save_transactions,
    write_reports,
)

app = FastAPI(title="Stock Intelligence API", version="2.4")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _current_transactions():
    return load_saved_transactions()


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "transactions": len(_current_transactions()),
    }


@app.get("/api/meta")
def meta() -> dict[str, object]:
    transactions = _current_transactions()
    dates = [tx.date for tx in transactions if tx.date]
    return {
        "loaded": bool(transactions),
        "transaction_count": len(transactions),
        "from_date": min(dates).date().isoformat() if dates else None,
        "to_date": max(dates).date().isoformat() if dates else None,
        "regions": sorted({tx.region for tx in transactions}),
        "teams": sorted({tx.team for tx in transactions}),
        "items": sorted({tx.item_code for tx in transactions}),
    }


@app.get("/api/reports")
def get_reports(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail="From date must be on or before To date.",
        )

    transactions = _current_transactions()
    selected = filter_transactions_for_period(
        transactions,
        from_date,
        to_date,
    )

    reports = build_reports_from_transactions(selected)

    return {
        "reports": reports,
        "meta": _period_meta(
            selected,
            from_date,
            to_date,
        ),
    }


@app.get("/api/reports/summary")
def executive_summary(
    scope: str = Query(default="team"),
    region: list[str] = Query(default=[]),
    team: list[str] = Query(default=[]),
    item_code: list[str] = Query(default=[]),
    from_date: date | None = None,
    to_date: date | None = None,
):
    return _build_executive_summary(
        scope=scope,
        regions=region,
        teams=team,
        item_codes=item_code,
        from_date=from_date,
        to_date=to_date,
    )


@app.get("/api/reports/summary/export/{file_format}")
def export_executive_summary(
    file_format: str,
    scope: str = Query(default="team"),
    region: list[str] = Query(default=[]),
    team: list[str] = Query(default=[]),
    item_code: list[str] = Query(default=[]),
    from_date: date | None = None,
    to_date: date | None = None,
):
    """
    Generate a polished executive report in PDF, DOCX or TXT.

    Filters are the same as /api/reports/summary and accept repeated query
    parameters, e.g. ?region=FS&region=KZN&team=FS%20Team%2007&team=KZN%20Team%2002
    """
    file_format = file_format.lower()
    if file_format not in {"pdf", "docx", "txt"}:
        raise HTTPException(
            status_code=400,
            detail="Format must be pdf, docx or txt.",
        )

    summary = _build_executive_summary(
        scope=scope,
        regions=region,
        teams=team,
        item_codes=item_code,
        from_date=from_date,
        to_date=to_date,
    )

    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    scope_name = summary["scope"]
    filename = f"stock_executive_report_{scope_name}_{stamp}.{file_format}"

    if file_format == "pdf":
        buffer = build_pdf_report(summary)
        media_type = "application/pdf"
    elif file_format == "docx":
        buffer = build_docx_report(summary)
        media_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    else:
        from io import BytesIO
        buffer = BytesIO(
            build_text_report(summary).encode(
                "utf-8"
            )
        )
        media_type = "text/plain; charset=utf-8"

    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


def _build_executive_summary(
    *,
    scope: str,
    regions: list[str],
    teams: list[str],
    item_codes: list[str],
    from_date: date | None,
    to_date: date | None,
) -> dict[str, object]:
    scope = scope.lower()
    if scope not in {
        "team",
        "province",
        "item",
    }:
        raise HTTPException(
            status_code=400,
            detail="Scope must be team, province or item.",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail="From date must be on or before To date.",
        )

    transactions = filter_transactions_for_period(
        _current_transactions(),
        from_date,
        to_date,
    )

    regions = _unique_nonempty(regions)
    teams = _unique_nonempty(teams)
    item_codes = _unique_nonempty(item_codes)

    # ---------------------------------------------------------
    # MULTI-FILTER LOGIC
    # ---------------------------------------------------------
    # Every supplied filter narrows the dataset. Empty means "all".
    if regions:
        transactions = [
            tx for tx in transactions
            if tx.region in regions
        ]

    if teams:
        transactions = [
            tx for tx in transactions
            if tx.team in teams
        ]

    if item_codes:
        transactions = [
            tx for tx in transactions
            if tx.item_code in item_codes
        ]

    # A scope must have at least one selection relevant to that lens.
    if scope == "team" and not teams:
        raise HTTPException(
            status_code=400,
            detail="Select at least one team for a team summary.",
        )

    if scope == "province" and not regions:
        raise HTTPException(
            status_code=400,
            detail="Select at least one province for a province summary.",
        )

    if scope == "item" and not item_codes:
        raise HTTPException(
            status_code=400,
            detail="Select at least one item for an item summary.",
        )

    if not transactions:
        raise HTTPException(
            status_code=400,
            detail="No transactions match the selected filters and date range.",
        )

    reports = build_reports_from_transactions(
        transactions
    )

    regional = reports["regionalSummary"]
    usage = reports["itemUsage"]
    variance = reports["varianceReport"]

    expected = sum(
        row["expected_quantity"]
        for row in regional
    )

    used = sum(
        row["used_quantity"]
        for row in regional
    )

    usage_value = sum(
        row["usage_value"]
        for row in regional
    )

    closing = sum(
        row["closing_quantity"]
        for row in regional
    )

    shortage = sum(
        row["shortage_quantity"]
        for row in regional
    )

    shortage_value = sum(
        row["shortage_value"]
        for row in regional
    )

    usage_by_region = _aggregate_usage(
        usage,
        "region",
    )

    usage_by_team = _aggregate_usage(
        usage,
        "team",
    )

    usage_by_item = sorted(
        usage,
        key=lambda row: (
            row["used_quantity"],
            row["usage_value"],
        ),
        reverse=True,
    )

    variance_records = sorted(
        variance,
        key=lambda row: (
            row["shortage_quantity"],
            row["variance_quantity"],
        ),
        reverse=True,
    )

    return {
        "scope": scope,
        "filters": {
            "regions": regions,
            "teams": teams,
            "item_codes": item_codes,
            "from_date": (
                from_date.isoformat()
                if from_date
                else None
            ),
            "to_date": (
                to_date.isoformat()
                if to_date
                else None
            ),
        },
        "metrics": {
            "expected_quantity": expected,
            "used_quantity": used,
            "usage_value": usage_value,
            "closing_quantity": closing,
            "shortage_quantity": shortage,
            "shortage_value": shortage_value,
            "teams": len({tx.team for tx in transactions}),
            "items": len({tx.item_code for tx in transactions}),
            "regions": len({tx.region for tx in transactions}),
        },
        "usage_by_item": usage_by_item,
        "usage_by_region": usage_by_region,
        "usage_by_team": usage_by_team,
        "variance_records": variance_records,
        "generated_at": datetime.now().isoformat(),
    }


def _aggregate_usage(
    rows: list[dict[str, object]],
    key: str,
) -> list[dict[str, object]]:
    totals: dict[str, dict[str, float]] = {}

    for row in rows:
        label = str(row[key])
        total = totals.setdefault(
            label,
            {
                "used_quantity": 0.0,
                "usage_value": 0.0,
                "request_count": 0.0,
            },
        )
        total["used_quantity"] += float(
            row["used_quantity"]
        )
        total["usage_value"] += float(
            row["usage_value"]
        )
        total["request_count"] += float(
            row["request_count"]
        )

    return [
        {
            key: label,
            **values,
        }
        for label, values in sorted(
            totals.items(),
            key=lambda pair: (
                pair[1]["used_quantity"],
                pair[0],
            ),
            reverse=True,
        )
    ]


def _unique_nonempty(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return result


@app.post("/api/reports/upload")
async def upload_stock_reports(
    files: list[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(
            status_code=400,
            detail="Select at least one stock report file.",
        )

    UPLOAD_DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    supported = {
        ".ods",
        ".xlsx",
        ".xlsm",
        ".xls",
        ".csv",
        ".zip",
    }

    names: list[str] = []
    rejected_files: list[str] = []
    temp_paths: list[Path] = []
    processed_file_names: list[str] = []
    processing_detail: str | None = None

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            for index, file in enumerate(files):
                original_name = Path(
                    file.filename
                    or f"upload-{index}"
                ).name

                extension = Path(
                    original_name
                ).suffix.lower()

                if (
                    original_name.startswith("~$")
                    or extension not in supported
                ):
                    rejected_files.append(
                        f"{original_name}: unsupported file type or temporary Office file"
                    )
                    await file.close()
                    continue

                target = (
                    Path(temp_dir)
                    / f"{index}_{original_name}"
                )

                try:
                    with target.open("wb") as output:
                        copyfileobj(
                            file.file,
                            output,
                        )
                finally:
                    await file.close()

                temp_paths.append(target)
                names.append(original_name)

            if not temp_paths:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "No supported stock files were uploaded. "
                        "Supported formats: .ods, .xlsx, .xlsm, .xls, .csv, .zip"
                    ),
                )

            transactions, stats, errors = ingest_files(
                temp_paths
            )

            all_errors = (
                rejected_files + errors
            )

            failed_names = {
                error.split(":", 1)[0].strip()
                for error in errors
            }

            processed_file_names = [
                name
                for name in names
                if name not in failed_names
            ]

            if not transactions:
                processing_detail = (
                    "No usable transactions were found. "
                    + " | ".join(
                        all_errors
                        or [
                            "The uploaded files did not contain a supported transaction table."
                        ]
                    )
                )
            else:
                save_transactions(
                    transactions
                )

                reports = build_reports_from_transactions(
                    transactions
                )

                write_reports(
                    reports
                )

                return {
                    "file_names": names,
                    "reports": reports,
                    "ingestion": {
                        "files_received": len(files),
                        "files_processed": len(
                            processed_file_names
                        ),
                        "files_skipped": all_errors,
                        "input_rows": stats.input_rows,
                        "transactions": stats.accepted_transactions,
                        "duplicates_removed": stats.duplicates_removed,
                    },
                    "meta": {
                        "loaded": True,
                        "transaction_count": len(
                            transactions
                        ),
                        "from_date": _min_date(
                            transactions
                        ),
                        "to_date": _max_date(
                            transactions
                        ),
                        "regions": sorted(
                            {
                                tx.region
                                for tx in transactions
                            }
                        ),
                        "teams": sorted(
                            {
                                tx.team
                                for tx in transactions
                            }
                        ),
                        "items": sorted(
                            {
                                tx.item_code
                                for tx in transactions
                            }
                        ),
                    },
                }

        except HTTPException:
            raise
        except Exception as exc:
            processing_detail = (
                f"Upload processing failed: {exc}"
            )

    raise HTTPException(
        status_code=400,
        detail=(
            processing_detail
            or "The upload could not be processed."
        ),
    )


def _min_date(transactions):
    dates = [
        tx.date
        for tx in transactions
        if tx.date
    ]
    return (
        min(dates).date().isoformat()
        if dates
        else None
    )


def _max_date(transactions):
    dates = [
        tx.date
        for tx in transactions
        if tx.date
    ]
    return (
        max(dates).date().isoformat()
        if dates
        else None
    )


def _period_meta(
    transactions,
    from_date,
    to_date,
):
    dates = [
        tx.date
        for tx in transactions
        if tx.date
    ]

    return {
        "loaded": bool(transactions),
        "transaction_count": len(
            transactions
        ),
        "from_date": (
            from_date.isoformat()
            if from_date
            else (
                min(dates).date().isoformat()
                if dates
                else None
            )
        ),
        "to_date": (
            to_date.isoformat()
            if to_date
            else (
                max(dates).date().isoformat()
                if dates
                else None
            )
        ),
        "regions": sorted(
            {tx.region for tx in transactions}
        ),
        "teams": sorted(
            {tx.team for tx in transactions}
        ),
        "items": sorted(
            {tx.item_code for tx in transactions}
        ),
    }
