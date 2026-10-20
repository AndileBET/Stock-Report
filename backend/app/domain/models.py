from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class StockTransaction:
    date: datetime | None
    job_reference: str
    source_site: str
    destination_site: str
    operator: str
    classification: str
    item_code: str
    item_name: str
    category: str
    sub_category: str
    unit: str
    transaction_type: str
    quantity: Decimal
    value: Decimal
    batch: str
    actioned: bool
    region: str
    team: str
