# Stock Report 2.0

An upload-driven stock intelligence dashboard for regional, team, item, usage, monetary and shortage reporting.

## Business rules

- Stock Opening is a daily starting-balance snapshot; it is never added to prior openings.
- Intake adds stock.
- Movement In adds stock.
- Movement Out removes stock.
- Stock Used removes stock.
- Count transactions are ignored for stock calculations.
- Duplicate logical transactions are removed during normalization.

Expected available stock is calculated as:

```text
Latest Opening + Intake + Movement In - Movement Out
```

Remaining stock is:

```text
Expected Available Stock - Stock Used
```

## Supported uploads

The application accepts `.ods`, `.xlsx`, `.xlsm`, `.xls`, `.csv`, and `.zip` files. A ZIP can contain multiple supported spreadsheets. Workbook sheets are scanned for recognizable transaction headers, including common aliases and extra title rows.

Invalid files do not invalidate otherwise usable uploads. The dashboard reports which files were processed and which were skipped.

## Run locally

From the project root:

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
python -m uvicorn backend.app.api:app --reload --host 127.0.0.1 --port 8010
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Upload stock data through the dashboard. No hard-coded source workbook and no JSON sync command are required.

## API

- `GET /api/health`
- `GET /api/meta`
- `GET /api/reports`
- `GET /api/reports/summary`
- `POST /api/reports/upload`


## Executive reporting

The Executive Summary studio supports multi-select province, team and item filters with custom date ranges. Generated summaries can be viewed in the browser and exported as polished PDF, Word (`.docx`) or plain-text reports.

The export endpoints are available under `/api/reports/summary/export/{pdf|docx|txt}` and accept repeated `region`, `team` and `item_code` query parameters.

## Interface refresh (Vetra-inspired)

The v3 interface uses a high-contrast, editorial enterprise design inspired by modern animated SaaS experiences: large typographic hierarchy, a dark command rail, light analytical surfaces, mint/lime operational accents, animated KPI cards, floating orbital status graphics, progressive table rows, responsive motion, and reduced-motion accessibility. The dashboard remains local-first and does not require external font or animation services at runtime.
