from decimal import Decimal

from backend.app.domain.transaction_rules import (
    is_count,
    is_usage,
    quantity_effect,
)


def test_quantity_effects_for_known_transaction_types() -> None:
    assert quantity_effect("Stock Opening") == Decimal("0")
    assert quantity_effect("Intake") == Decimal("1")
    assert quantity_effect("Movement In") == Decimal("1")
    assert quantity_effect("Movement Out") == Decimal("-1")
    assert quantity_effect("Stock Used") == Decimal("-1")
    assert quantity_effect("Count") == Decimal("0")


def test_unknown_transaction_type_has_no_stock_effect() -> None:
    assert quantity_effect("Unknown Transaction") == Decimal("0")


def test_usage_transaction_detection() -> None:
    assert is_usage("Stock Used") is True
    assert is_usage("Movement Out") is False


def test_count_transaction_detection() -> None:
    assert is_count("Count") is True
    assert is_count("Stock Used") is False

