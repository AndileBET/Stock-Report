import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.domain.models import StockTransaction


def make_transaction(
    transaction_type: str,
    quantity: str = "1",
    value: str = "10",
    *,
    region: str = "LIM",
    team: str = "LIM Team 05",
    item_code: str = "HWPR001",
    item_name: str = "Example Item",
    job_reference: str = "",
    date: datetime | None = None,
) -> StockTransaction:
    return StockTransaction(
        date=date,
        job_reference=job_reference,
        source_site="",
        destination_site=team,
        operator="Operator",
        classification="",
        item_code=item_code,
        item_name=item_name,
        category="HWM - Stock",
        sub_category="",
        unit="Unit",
        transaction_type=transaction_type,
        quantity=Decimal(quantity),
        value=Decimal(value),
        batch="B1",
        actioned=False,
        region=region,
        team=team,
    )
