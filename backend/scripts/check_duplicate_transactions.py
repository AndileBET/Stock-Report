from pathlib import Path
import argparse

from backend.app.ingestion.file_reader import read_uploaded_path
from backend.app.ingestion.normalize import normalize_rows_with_stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect duplicate stock transactions in a local workbook.")
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    rows = read_uploaded_path(args.file)
    transactions, stats = normalize_rows_with_stats(rows)
    print(f"Input rows: {stats.input_rows}")
    print(f"Accepted logical transactions: {stats.accepted_transactions}")
    print(f"Duplicates removed: {stats.duplicates_removed}")


if __name__ == "__main__":
    main()
