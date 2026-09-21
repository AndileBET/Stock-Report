from backend.app.config import PROCESSED_DATA_DIR
from backend.app.reporting.report_service import build_reports_from_transactions, load_saved_transactions, write_reports


def main() -> None:
    transactions = load_saved_transactions()
    if not transactions:
        print("No uploaded stock dataset is loaded. Start the API and upload a stock file from the dashboard.")
        return
    reports = build_reports_from_transactions(transactions)
    write_reports(reports)
    for output_file in sorted(PROCESSED_DATA_DIR.glob("*.json")):
        print(f"Wrote {output_file}")


if __name__ == "__main__":
    main()
