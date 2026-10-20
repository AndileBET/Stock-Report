from pathlib import Path
from typing import Iterable
import re
import tempfile
import zipfile

import pandas as pd

HEADER_ALIASES = {
    "Date": {
        "date", "transaction date", "datetime", "timestamp", "date time",
        "date/time", "action date", "actioned date", "created date",
        "entry date", "transaction datetime",
    },
    "Job Reference": {
        "job reference", "job ref", "jobreference", "reference",
        "request reference", "request ref", "job number", "request number",
    },
    "Source Site": {
        "source site", "source", "from site", "from", "origin site",
    },
    "Destination Site": {
        "destination site", "destination", "to site", "to", "site",
    },
    "Operator": {
        "operator", "user", "actioned by", "logged by", "employee",
        "processed by", "staff member",
    },
    "Classification": {"classification", "class"},
    "Code": {
        "code", "item code", "product code", "stock code", "sku",
        "item number", "product id", "product number", "stock number",
    },
    "Name": {
        "name", "item name", "product name", "description", "item",
        "item description", "product description",
    },
    "Category": {"category", "item category", "product category"},
    "Sub Category": {
        "sub category", "subcategory", "sub-category", "subclass",
    },
    "Unit": {"unit", "uom", "unit of measure", "measure"},
    "Transaction": {
        "transaction", "transaction type", "transactiontype", "type",
        "transaction name", "stock transaction", "movement type",
    },
   "Quantity": {
    "quantity",
    "qunatity",      # known typo in the source export
    "qty",
    "amount",
    "units",
    "quantity used",
    "qty used",
    "stock quantity",
    "qty.",
},
    "Value": {
        "value", "amount value", "monetary value", "cost", "total value",
        "stock value", "value incl vat", "value excluding vat",
    },
    "Batch": {"batch", "batch id", "batch number", "lot", "lot number"},
    "Actioned": {"actioned", "processed", "complete", "completed"},
}

# These three fields are sufficient to recognise a transaction table.
# Date is strongly preferred but is allowed to be absent so a workbook
# can still be ingested and reviewed as an all-data dataset.
REQUIRED_CANONICAL = {"Code", "Transaction", "Quantity"}
SUPPORTED_EXTENSIONS = {".xlsx", ".xlsm", ".xls", ".ods", ".csv", ".zip"}
MAX_HEADER_SCAN_ROWS = 150

def _cell_text(value: object) -> str:
    if value is None:
        return ""
    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass
    return str(value).strip()


def _normalise_header_cell(value: object) -> str:
    text = _cell_text(value).casefold()
    text = text.replace("\ufeff", "")
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[\[\](){}#:/\\|]+", " ", text)
    text = re.sub(r"[_\-.]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


NORMALISED_ALIASES = {
    canonical: {_normalise_header_cell(alias) for alias in aliases}
    for canonical, aliases in HEADER_ALIASES.items()
}




def supported_extension(path: Path) -> bool:
    return path.suffix.lower() in SUPPORTED_EXTENSIONS


def read_uploaded_path(path: Path) -> list[dict[str, str]]:
    extension = path.suffix.lower()
    if extension == ".csv":
        return _read_csv(path)
    if extension == ".zip":
        return _read_zip(path)
    if extension in {".xlsx", ".xlsm", ".xls", ".ods"}:
        return _read_excel_like(path)
    raise ValueError(f"Unsupported file type: {extension or 'unknown'}")


def read_uploaded_paths(paths: Iterable[Path]) -> tuple[list[dict[str, str]], list[str]]:
    all_rows: list[dict[str, str]] = []
    errors: list[str] = []
    for path in paths:
        try:
            all_rows.extend(read_uploaded_path(path))
        except Exception as exc:
            errors.append(f"{path.name}: {exc}")
    return all_rows, errors


def _read_zip(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with zipfile.ZipFile(path) as archive, tempfile.TemporaryDirectory() as temp_dir:
        for member_index, member in enumerate(archive.infolist()):
            if member.is_dir():
                continue
            suffix = Path(member.filename).suffix.lower()
            if suffix not in {".xlsx", ".xlsm", ".xls", ".ods", ".csv"}:
                continue

            # Use a collision-proof filename for archives containing files with
            # identical basenames in different directories.
            original_name = Path(member.filename).name
            target = Path(temp_dir) / f"{member_index}_{original_name}"

            with archive.open(member) as src, target.open("wb") as dst:
                dst.write(src.read())

            try:
                rows.extend(read_uploaded_path(target))
            except Exception as exc:
                raise ValueError(
                    f"{original_name}: {exc}"
                ) from exc

    if not rows:
        raise ValueError("The ZIP file contained no usable spreadsheet files.")

    return rows


def _read_csv(path: Path) -> list[dict[str, str]]:
    last_error: Exception | None = None
    for kwargs in (
        {"encoding": "utf-8-sig", "sep": None, "engine": "python"},
        {"encoding": "cp1252", "sep": None, "engine": "python"},
    ):
        try:
            frame = pd.read_csv(
                path,
                header=None,
                dtype=object,
                keep_default_na=False,
                **kwargs,
            )
            return _frame_to_records(frame, path.name)
        except Exception as exc:
            last_error = exc

    raise ValueError(f"Could not read CSV file: {last_error}")


def _read_excel_like(path: Path) -> list[dict[str, str]]:
    engine = None
    if path.suffix.lower() == ".ods":
        engine = "odf"
    elif path.suffix.lower() == ".xls":
        engine = "xlrd"
    elif path.suffix.lower() in {".xlsx", ".xlsm"}:
        engine = "openpyxl"

    collected: list[dict[str, str]] = []
    sheet_errors: list[str] = []

    # IMPORTANT: explicitly close the ExcelFile. On Windows an openpyxl
    # workbook can otherwise keep the uploaded temporary file locked,
    # causing TemporaryDirectory cleanup to fail with WinError 32.
    with pd.ExcelFile(path, engine=engine) as workbook:
        for sheet_name in workbook.sheet_names:
            try:
                frame = workbook.parse(
                    sheet_name=sheet_name,
                    header=None,
                    dtype=object,
                    keep_default_na=False,
                )
                rows = _frame_to_records(
                    frame,
                    f"{path.name} [{sheet_name}]",
                )
                if rows:
                    collected.extend(rows)
            except Exception as exc:
                sheet_errors.append(f"{sheet_name}: {exc}")

    if not collected:
        detail = "; ".join(sheet_errors[:5])
        raise ValueError(
            "Could not find a usable transaction sheet with recognised headers. "
            f"{detail}".strip()
        )

    return collected


def _frame_to_records(
    frame: pd.DataFrame,
    source_name: str,
) -> list[dict[str, str]]:
    if frame.empty:
        return []

    header_index, mapping = _detect_header(frame)
    if header_index is None:
        raise ValueError(
            "Could not find a transaction header row. "
            "Expected at least Code, Transaction and Quantity columns; Date is recommended."
        )

    records: list[dict[str, str]] = []

    for row_index in range(header_index + 1, len(frame)):
        raw = frame.iloc[row_index].tolist()
        if not any(_cell_text(value) for value in raw):
            continue

        record: dict[str, str] = {}
        for column_position, canonical in mapping.items():
            record[canonical] = (
                _cell_text(raw[column_position])
                if column_position < len(raw)
                else ""
            )

        if _looks_like_header_or_title(record):
            continue

        record["_source_sheet"] = source_name
        records.append(record)

    if not records:
        raise ValueError(f"The detected transaction table in {source_name} contains no data rows.")

    return records


def _looks_like_header_or_title(record: dict[str, str]) -> bool:
    transaction = _normalise_header_cell(record.get("Transaction", ""))
    code = _normalise_header_cell(record.get("Code", ""))
    quantity = _normalise_header_cell(record.get("Quantity", ""))

    # Protect against a second repeated header in the middle of a sheet.
    return (
        transaction in NORMALISED_ALIASES["Transaction"]
        and code in NORMALISED_ALIASES["Code"]
        and quantity in NORMALISED_ALIASES["Quantity"]
    )


def _detect_header(
    frame: pd.DataFrame,
    source_name: str = "spreadsheet",
) -> tuple[int | None, dict[int, str]]:
    scan_limit = min(len(frame), MAX_HEADER_SCAN_ROWS)
    best_index: int | None = None
    best_mapping: dict[int, str] = {}
    best_score = -1
    best_required_hits = -1
    best_has_date = False

    for row_index in range(scan_limit):
        cells = [
            _normalise_header_cell(value)
            for value in frame.iloc[row_index].tolist()
        ]

        mapping: dict[int, str] = {}
        used_canonical: set[str] = set()

        for position, cell in enumerate(cells):
            if not cell:
                continue

            canonical = _canonical_for_header(cell)
            if canonical and canonical not in used_canonical:
                mapping[position] = canonical
                used_canonical.add(canonical)

        required_hits = len(REQUIRED_CANONICAL & used_canonical)
        has_date = "Date" in used_canonical
        score = len(mapping)

        # Accept required transaction columns. Prefer rows that also contain
        # Date and/or more recognised fields.
        if required_hits < len(REQUIRED_CANONICAL):
            continue

        rank = (
            has_date,
            required_hits,
            score,
        )

        best_rank = (
            best_has_date,
            best_required_hits,
            best_score,
        )

        if best_index is None or rank > best_rank:
            best_index = row_index
            best_mapping = mapping
            best_score = score
            best_required_hits = required_hits
            best_has_date = has_date

    return best_index, best_mapping


def _canonical_for_header(cell: str) -> str | None:
    # First use exact normalized aliases.
    for canonical, aliases in NORMALISED_ALIASES.items():
        if cell in aliases:
            return canonical

    # Then use cautious token/substring matching for common export headers.
    # The longest/most specific patterns win.
    patterns = (
        ("Job Reference", ("job reference", "job ref", "request reference", "request ref")),
        ("Destination Site", ("destination site", "destination")),
        ("Source Site", ("source site", "source")),
        ("Transaction", ("transaction type", "transaction", "movement type")),
        ("Quantity", ("quantity", "qty", "units")),
        ("Code", ("item code", "product code", "stock code", "sku")),
        ("Name", ("item name", "product name", "description")),
        ("Date", ("transaction date", "action date", "created date", "date")),
    )

    for canonical, needles in patterns:
        if any(needle in cell for needle in needles):
            return canonical

    return None


def _cell_text(value: object) -> str:
    if value is None:
        return ""
    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass
    return str(value).strip()
