from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Iterable

from backend.app.domain.models import StockTransaction
from backend.app.domain.transaction_rules import is_usage, normalize_transaction_type

ZERO = Decimal("0")


@dataclass
class StockLedgerEntry:
    region: str
    team: str
    item_code: str
    item_name: str
    category: str
    sub_category: str
    unit: str
    period_opening_quantity: Decimal = ZERO
    period_opening_value: Decimal = ZERO
    latest_opening_quantity: Decimal = ZERO
    latest_opening_value: Decimal = ZERO
    closing_quantity: Decimal = ZERO
    closing_value: Decimal = ZERO
    intake_quantity: Decimal = ZERO
    intake_value: Decimal = ZERO
    movement_in_quantity: Decimal = ZERO
    movement_in_value: Decimal = ZERO
    movement_out_quantity: Decimal = ZERO
    movement_out_value: Decimal = ZERO
    used_quantity: Decimal = ZERO
    usage_value: Decimal = ZERO
    current_intake_quantity: Decimal = ZERO
    current_intake_value: Decimal = ZERO
    current_movement_in_quantity: Decimal = ZERO
    current_movement_in_value: Decimal = ZERO
    current_movement_out_quantity: Decimal = ZERO
    current_movement_out_value: Decimal = ZERO
    current_used_quantity: Decimal = ZERO
    current_usage_value: Decimal = ZERO
    opening_events: int = 0
    transaction_count: int = 0
    first_date: datetime | None = None
    last_date: datetime | None = None

    @property
    def expected_quantity(self) -> Decimal:
        return (
            self.latest_opening_quantity
            + self.current_intake_quantity
            + self.current_movement_in_quantity
            - self.current_movement_out_quantity
        )

    @property
    def expected_value(self) -> Decimal:
        return (
            self.latest_opening_value
            + self.current_intake_value
            + self.current_movement_in_value
            - self.current_movement_out_value
        )

    @property
    def shortage_quantity(self) -> Decimal:
        return max(ZERO, -self.closing_quantity)

    @property
    def shortage_value(self) -> Decimal:
        return max(ZERO, -self.closing_value)

    @property
    def remaining_quantity(self) -> Decimal:
        return self.closing_quantity

    @property
    def remaining_value(self) -> Decimal:
        return self.closing_value

    @property
    def variance_quantity(self) -> Decimal:
        return self.closing_quantity

    @property
    def variance_value(self) -> Decimal:
        return self.closing_value


@dataclass(frozen=True)
class TransactionBalance:
    transaction: StockTransaction
    balance_quantity: Decimal
    balance_value: Decimal


def build_stock_ledgers(transactions: list[StockTransaction]) -> dict[tuple[str, str, str], StockLedgerEntry]:
    ledgers: dict[tuple[str, str, str], StockLedgerEntry] = {}
    opening_seen: set[tuple[str, str, str]] = set()

    for _, transaction in _ordered_transactions(transactions):
        transaction_type = normalize_transaction_type(transaction.transaction_type)
        if transaction_type == "Count":
            continue

        key = (transaction.region, transaction.team, transaction.item_code)
        ledger = ledgers.get(key)
        if ledger is None:
            ledger = StockLedgerEntry(
                region=transaction.region,
                team=transaction.team,
                item_code=transaction.item_code,
                item_name=transaction.item_name,
                category=transaction.category,
                sub_category=transaction.sub_category,
                unit=transaction.unit,
            )
            ledgers[key] = ledger

        ledger.transaction_count += 1
        _update_dates(ledger, transaction.date)

        if transaction_type == "Stock Opening":
            ledger.opening_events += 1
            if key not in opening_seen:
                ledger.period_opening_quantity = transaction.quantity
                ledger.period_opening_value = transaction.value
                opening_seen.add(key)

            ledger.latest_opening_quantity = transaction.quantity
            ledger.latest_opening_value = transaction.value
            ledger.closing_quantity = transaction.quantity
            ledger.closing_value = transaction.value
            ledger.current_intake_quantity = ZERO
            ledger.current_intake_value = ZERO
            ledger.current_movement_in_quantity = ZERO
            ledger.current_movement_in_value = ZERO
            ledger.current_movement_out_quantity = ZERO
            ledger.current_movement_out_value = ZERO
            ledger.current_used_quantity = ZERO
            ledger.current_usage_value = ZERO
            continue

        if transaction_type == "Intake":
            ledger.intake_quantity += transaction.quantity
            ledger.intake_value += transaction.value
            ledger.current_intake_quantity += transaction.quantity
            ledger.current_intake_value += transaction.value
            ledger.closing_quantity += transaction.quantity
            ledger.closing_value += transaction.value
            continue

        if transaction_type == "Movement In":
            ledger.movement_in_quantity += transaction.quantity
            ledger.movement_in_value += transaction.value
            ledger.current_movement_in_quantity += transaction.quantity
            ledger.current_movement_in_value += transaction.value
            ledger.closing_quantity += transaction.quantity
            ledger.closing_value += transaction.value
            continue

        if transaction_type == "Movement Out":
            ledger.movement_out_quantity += transaction.quantity
            ledger.movement_out_value += transaction.value
            ledger.current_movement_out_quantity += transaction.quantity
            ledger.current_movement_out_value += transaction.value
            ledger.closing_quantity -= transaction.quantity
            ledger.closing_value -= transaction.value
            continue

        if is_usage(transaction_type):
            ledger.used_quantity += transaction.quantity
            ledger.usage_value += transaction.value
            ledger.current_used_quantity += transaction.quantity
            ledger.current_usage_value += transaction.value
            ledger.closing_quantity -= transaction.quantity
            ledger.closing_value -= transaction.value

    return ledgers


def build_transaction_balances(transactions: list[StockTransaction]) -> list[TransactionBalance]:
    balances: dict[tuple[str, str, str], tuple[Decimal, Decimal]] = defaultdict(lambda: (ZERO, ZERO))
    result: list[TransactionBalance] = []
    for _, transaction in _ordered_transactions(transactions):
        transaction_type = normalize_transaction_type(transaction.transaction_type)
        if transaction_type == "Count":
            continue
        key = (transaction.region, transaction.team, transaction.item_code)
        quantity, value = balances[key]
        if transaction_type == "Stock Opening":
            quantity = transaction.quantity
            value = transaction.value
        elif transaction_type == "Intake" or transaction_type == "Movement In":
            quantity += transaction.quantity
            value += transaction.value
        elif transaction_type == "Movement Out" or is_usage(transaction_type):
            quantity -= transaction.quantity
            value -= transaction.value
        balances[key] = (quantity, value)
        result.append(TransactionBalance(transaction, quantity, value))
    return result


def _update_dates(ledger: StockLedgerEntry, date: datetime | None) -> None:
    if date is None:
        return
    ledger.first_date = date if ledger.first_date is None else min(ledger.first_date, date)
    ledger.last_date = date if ledger.last_date is None else max(ledger.last_date, date)


def _ordered_transactions(transactions: Iterable[StockTransaction]) -> list[tuple[int, StockTransaction]]:
    return sorted(
        enumerate(transactions),
        key=lambda pair: (pair[1].date is None, pair[1].date or datetime.max, pair[0]),
    )
