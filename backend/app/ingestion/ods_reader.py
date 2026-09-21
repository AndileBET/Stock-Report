from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile


NAMESPACES = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}


def read_ods_sheet(file_path: Path, sheet_index: int = 0) -> list[dict[str, str]]:
    """Read the first table in an ODS file into dictionaries keyed by header."""
    with ZipFile(file_path) as ods_file:
        content = ods_file.read("content.xml")

    root = ElementTree.fromstring(content)
    spreadsheet = root.find("office:body", NAMESPACES).find(
        "office:spreadsheet",
        NAMESPACES,
    )
    sheets = spreadsheet.findall("table:table", NAMESPACES)

    if sheet_index >= len(sheets):
        raise ValueError(f"Sheet index {sheet_index} does not exist.")

    raw_rows = [_read_row(row) for row in sheets[sheet_index].findall("table:table-row", NAMESPACES)]
    raw_rows = [row for row in raw_rows if any(cell.strip() for cell in row)]

    if not raw_rows:
        return []

    headers = [header.strip() for header in raw_rows[0]]
    records = []

    for row in raw_rows[1:]:
        record = {}
        for index, header in enumerate(headers):
            if header:
                record[header] = row[index].strip() if index < len(row) else ""
        records.append(record)

    return records


def _read_row(row: ElementTree.Element) -> list[str]:
    values = []

    for cell in row.findall("table:table-cell", NAMESPACES):
        repeat = int(
            cell.attrib.get(
                f"{{{NAMESPACES['table']}}}number-columns-repeated",
                "1",
            )
        )
        text = " ".join(
            "".join(paragraph.itertext())
            for paragraph in cell.findall(".//text:p", NAMESPACES)
        ).strip()
        values.extend([text] * repeat)

    return values

