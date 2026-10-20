from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = BACKEND_DIR / "data"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
UPLOAD_DATA_DIR = DATA_DIR / "uploads"
RUNTIME_DATA_DIR = DATA_DIR / "runtime"
RUNTIME_TRANSACTIONS_FILE = RUNTIME_DATA_DIR / "transactions.json"
