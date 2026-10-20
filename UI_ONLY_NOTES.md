# Stock Report dashboard

The executive report filters use the regions, teams and item codes found in the loaded transactions. The backend returns complete team-by-region and item-by-team option maps. PDF, Excel and Word exports use the same 14-column stock movement table.

The backend environment needs `openpyxl` for Excel export, alongside the existing FastAPI, python-docx and ReportLab packages. Install it with `python -m pip install openpyxl` if necessary.

Run backend from project root: python -m uvicorn backend.app.api:app --reload --host 127.0.0.1 --port 8010
Run frontend: cd frontend-new && npm install && npm run dev
