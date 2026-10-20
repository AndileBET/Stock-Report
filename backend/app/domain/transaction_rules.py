from decimal import Decimal


QUANTITY_EFFECT_BY_TRANSACTION = {
    "Stock Opening": Decimal("0"),
    "Intake": Decimal("1"),
    "Movement In": Decimal("1"),
    "Movement Out": Decimal("-1"),
    "Stock Used": Decimal("-1"),
    "Count": Decimal("0"),
}

USAGE_TRANSACTION_TYPES = {"Stock Used"}
COUNT_TRANSACTION_TYPES = {"Count"}


def normalize_transaction_type(value: str) -> str:
    raw = " ".join(str(value or "").strip().split())
    key = raw.casefold()
    aliases = {
        "stock opening": "Stock Opening",
        "opening stock": "Stock Opening",
        "opening": "Stock Opening",
        "intake": "Intake",
        "movement in": "Movement In",
        "movement inwards": "Movement In",
        "movement out": "Movement Out",
        "movement outwards": "Movement Out",
        "stock used": "Stock Used",
        "used": "Stock Used",
        "usage": "Stock Used",
        "count": "Count",
        "stock count": "Count",
    }
    return aliases.get(key, raw)


def quantity_effect(transaction_type: str) -> Decimal:
    return QUANTITY_EFFECT_BY_TRANSACTION.get(normalize_transaction_type(transaction_type), Decimal("0"))


def is_usage(transaction_type: str) -> bool:
    return normalize_transaction_type(transaction_type) in USAGE_TRANSACTION_TYPES


def is_count(transaction_type: str) -> bool:
    return normalize_transaction_type(transaction_type) in COUNT_TRANSACTION_TYPES
