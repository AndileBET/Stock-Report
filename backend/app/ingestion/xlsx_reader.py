from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile


SPREADSHEET_NAMESPACE = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships"

NAMESPACES = {
    "main": SPREADSHEET_NAMESPACE,
    "rel": RELATIONSHIPS_NAMESPACE,
    "pkgrel": PACKAGE_RELATIONSHIPS_NAMESPACE,
}


def read_xlsx_sheet(file_path: Path, sheet_index: int = 0) -> list[dict[str, str]]:
    """Read the first worksheet in an XLSX file into dictionaries keyed by header."""
    with ZipFile(file_path) as xlsx_file:
        shared_strings = _read_shared_strings(xlsx_file)
        worksheet_path = _get_worksheet_path(xlsx_file, sheet_index)
        worksheet = ElementTree.fromstring(xlsx_file.read(worksheet_path))

    raw_rows = [
        _read_row(row, shared_strings)
        for row in worksheet.findall(".//main:sheetData/main:row", NAMESPACES)
    ]
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


def _read_shared_strings(xlsx_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in xlsx_file.namelist():
        return []

    shared_strings_root = ElementTree.fromstring(xlsx_file.read("xl/sharedStrings.xml"))
    values = []

    for string_item in shared_strings_root.findall("main:si", NAMESPACES):
        text_parts = [
            text_node.text or ""
            for text_node in string_item.findall(".//main:t", NAMESPACES)
        ]
        values.append("".join(text_parts))

    return values


def _get_worksheet_path(xlsx_file: ZipFile, sheet_index: int) -> str:
    workbook = ElementTree.fromstring(xlsx_file.read("xl/workbook.xml"))
    workbook_relationships = ElementTree.fromstring(
        xlsx_file.read("xl/_rels/workbook.xml.rels")
    )
    sheets = workbook.findall("main:sheets/main:sheet", NAMESPACES)

    if sheet_index >= len(sheets):
        raise ValueError(f"Sheet index {sheet_index} does not exist.")

    relationship_id = sheets[sheet_index].attrib[
        f"{{{RELATIONSHIPS_NAMESPACE}}}id"
    ]
    relationship = workbook_relationships.find(
        f"pkgrel:Relationship[@Id='{relationship_id}']",
        NAMESPACES,
    )

    if relationship is None:
        raise ValueError(f"Worksheet relationship {relationship_id} was not found.")

    target = relationship.attrib["Target"]
    return f"xl/{target.lstrip('/')}" if not target.startswith("xl/") else target


def _read_row(row: ElementTree.Element, shared_strings: list[str]) -> list[str]:
    values_by_index = {}

    for cell in row.findall("main:c", NAMESPACES):
        cell_reference = cell.attrib.get("r", "")
        column_index = _column_index(cell_reference)
        values_by_index[column_index] = _read_cell_value(cell, shared_strings)

    if not values_by_index:
        return []

    max_index = max(values_by_index)
    return [values_by_index.get(index, "") for index in range(max_index + 1)]


def _read_cell_value(
    cell: ElementTree.Element,
    shared_strings: list[str],
) -> str:
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        return "".join(
            text_node.text or ""
            for text_node in cell.findall(".//main:t", NAMESPACES)
        )

    value_node = cell.find("main:v", NAMESPACES)
    if value_node is None or value_node.text is None:
        return ""

    value = value_node.text

    if cell_type == "s":
        return shared_strings[int(value)]

    return value


def _column_index(cell_reference: str) -> int:
    letters = "".join(character for character in cell_reference if character.isalpha())
    index = 0

    for letter in letters:
        index = index * 26 + (ord(letter.upper()) - ord("A") + 1)

    return index - 1

