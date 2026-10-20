from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from decimal import Decimal
import re

from backend.app.domain.models import StockTransaction
from backend.app.domain.transaction_rules import is_usage, normalize_transaction_type

ZERO = Decimal("0")
KNOWN_REGION_CODES = {"ECP", "FS", "GAU", "KZN", "LIM", "MPU", "NC", "NW", "WCP"}
TEAM_CODE = re.compile(r"^([A-Z]{2,4})\s+Team\s+\d{1,2}(?:\s*,\s*\d{1,2})*$", re.IGNORECASE)


def build_data_quality_issues(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    """Find stock opening discontinuities and suspicious region labels."""
    issues = _opening_mismatch_issues(transactions)
    issues.extend(_region_naming_issues(transactions))
    return sorted(
        issues,
        key=lambda issue: (
            str(issue.get("date") or ""),
            str(issue.get("region") or ""),
            str(issue.get("team") or ""),
            str(issue["type"]),
        ),
    )


def _opening_mismatch_issues(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str, str], list[StockTransaction]] = defaultdict(list)
    for transaction in transactions:
        if transaction.date:
            grouped[(transaction.region, transaction.team, transaction.item_code)].append(transaction)

    issues: list[dict[str, object]] = []
    for (region, team, item_code), rows in grouped.items():
        rows.sort(key=lambda tx: tx.date or datetime.max)
        balance: Decimal | None = None
        has_opening_baseline = False
        previous_date = None
        previous_close: Decimal | None = None
        current_date = None
        current_day_opening_seen = False

        for transaction in rows:
            day = transaction.date.date() if transaction.date else None
            if day != current_date:
                if current_date is not None:
                    previous_date = current_date
                    previous_close = balance if has_opening_baseline else None
                current_date = day
                current_day_opening_seen = False

            transaction_type = normalize_transaction_type(transaction.transaction_type)
            if transaction_type == "Stock Opening":
                if not current_day_opening_seen:
                    if previous_close is not None and previous_date is not None and transaction.quantity != previous_close:
                        issues.append({
                            "id": f"opening:{region}:{team}:{item_code}:{day.isoformat()}",
                            "type": "stock_opening_mismatch",
                            "severity": "high",
                            "title": "Opening stock does not match prior closing",
                            "message": (
                                f"Opening is {transaction.quantity} units; prior recorded closing was "
                                f"{previous_close} units."
                            ),
                            "region": region,
                            "team": team,
                            "item_code": item_code,
                            "item_name": transaction.item_name,
                            "date": day.isoformat(),
                            "previous_date": previous_date.isoformat(),
                            "expected_quantity": float(previous_close),
                            "actual_quantity": float(transaction.quantity),
                            "site": transaction.destination_site or transaction.source_site,
                        })
                    current_day_opening_seen = True
                balance = transaction.quantity
                has_opening_baseline = True
                continue

            if balance is None:
                balance = ZERO
            if transaction_type in {"Intake", "Movement In"}:
                balance += transaction.quantity
            elif transaction_type in {"Movement Out"} or is_usage(transaction_type):
                balance -= transaction.quantity

    return issues


def _region_naming_issues(transactions: list[StockTransaction]) -> list[dict[str, object]]:
    examples: dict[tuple[str, str, str], StockTransaction] = {}
    for transaction in transactions:
        team_match = TEAM_CODE.fullmatch(transaction.team.strip())
        team_region = team_match.group(1).upper() if team_match else None
        region = transaction.region.strip()
        region_code_like = re.fullmatch(r"[A-Za-z]{2,4}", region)

        if team_region and team_region not in KNOWN_REGION_CODES:
            key = ("unrecognized_region_code", team_region, transaction.team)
        elif team_region and region.upper() != team_region:
            key = ("region_team_mismatch", region, transaction.team)
        elif region_code_like and (region.upper() not in KNOWN_REGION_CODES or region != region.upper()):
            key = ("unrecognized_region_code", region, transaction.team)
        else:
            continue
        examples.setdefault(key, transaction)

    issues: list[dict[str, object]] = []
    for (kind, region_label, team), transaction in examples.items():
        if kind == "region_team_mismatch":
            title = "Region label does not match team code"
            message = f"Team {team} is grouped under region {region_label}; expected {TEAM_CODE.fullmatch(team).group(1).upper()}."
        else:
            title = "Region naming needs review"
            if team_region := (TEAM_CODE.fullmatch(team).group(1).upper() if TEAM_CODE.fullmatch(team) else None):
                message = f"Team {team} uses region code {team_region}, which is not in the recognized region list. Confirm the region mapping."
            else:
                message = f"Region label {region_label} is not a recognized regional code. Confirm whether this site is mapped to the right region."
        issues.append({
            "id": f"region:{kind}:{region_label}:{team}",
            "type": kind,
            "severity": "medium",
            "title": title,
            "message": message,
            "region": transaction.region,
            "team": team,
            "item_code": transaction.item_code,
            "item_name": transaction.item_name,
            "date": transaction.date.date().isoformat() if transaction.date else None,
            "previous_date": None,
            "expected_quantity": None,
            "actual_quantity": None,
            "site": transaction.destination_site or transaction.source_site,
        })
    return issues
