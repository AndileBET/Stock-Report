from backend.app.ingestion.normalize import _extract_region, _extract_team, normalize_rows


def row(**overrides):
    base={"Date":"2026/08/19 08:30:00","Job Reference":"REQ-001","Source Site":"","Destination Site":"FS Team 07","Operator":"Operator A","Classification":"","Code":"ONCE1880","Name":"JACK SUNGLASSES","Category":"HWM - Stock","Sub Category":"","Unit":"Unit","Transaction":"Stock Used","Quantity":"1","Value":"19,84","Batch":"111","Actioned":"FALSE"}
    base.update(overrides)
    return base


def test_duplicate_batches_collapse_to_one():
    transactions=normalize_rows([row(Batch="111"),row(Batch="222"),row(Batch="333")])
    assert len(transactions)==1


def test_different_time_or_operator_remains_distinct():
    transactions=normalize_rows([row(Batch="111"),row(Date="2026/08/19 09:30:00", Batch="222")])
    assert len(transactions)==2


def test_different_job_reference_remains_distinct():
    transactions=normalize_rows([row(**{"Job Reference": "REQ-001"}),row(**{"Job Reference": "REQ-002"}, Batch="222")])
    assert len(transactions)==2


def test_extracts_team_from_clocking_site_description():
    site = "Germiston Branch - CLOCKING SITE - GAU Team 30 - Germiston Branch"
    assert _extract_team(site) == "GAU Team 30"
    assert _extract_region(site) == "GAU"


def test_preserves_multiple_team_numbers_as_written_in_site_value():
    site = "Hollywood Makhado Branch - CLOCKING SITE - LIM Team 10, 15 - Hollywood Makhado Branch"
    assert _extract_team(site) == "LIM Team 10, 15"
    assert _extract_region(site) == "LIM"


def test_maps_kwa_zulu_natal_spelling_to_kzn():
    assert _extract_region("KwaZulu Natal") == "KZN"
