# Stock Intelligence 2.1 — Project Walkthrough

## Runtime flow

The backend is upload-driven. It does not require a hard-coded source workbook to start.

1. FastAPI starts on `127.0.0.1:8010`.
2. React/Vite starts on `localhost:5173`.
3. The user uploads one or more supported stock files or a folder.
4. The ingestion layer scans every workbook sheet, detects a header row, normalizes header aliases and converts rows into `StockTransaction` records.
5. Logical duplicate transactions are removed before any report is calculated.
6. The stock ledger processes transactions chronologically and treats daily Stock Opening as a snapshot/reset.
7. Reports are generated and served through the API.
8. The dashboard can apply all-data, latest-7-day, latest-month or custom date windows.

## Supported uploads

`.ods`, `.xlsx`, `.xlsm`, `.xls`, `.csv`, and `.zip` containers containing supported files.

## Stock rules

`Stock Opening` resets the balance and is never added as an inflow. `Intake` and `Movement In` add stock. `Movement Out` and `Stock Used` remove stock. `Count` is ignored.

## Reporting

The API exposes current reports, metadata and generated executive summaries. The dashboard includes global search, region/team/item drill-down, regionalized item-usage charts, variance/risk analysis, request comparisons, and report-generation controls.


### Executive report exports

Executive Summary is a server-generated reporting workflow. Users can select multiple provinces, teams and items, specify a date window, generate the on-screen summary, and export the same selection to PDF, Word or text. The backend uses one shared summary payload for all three formats so the numbers remain consistent.
