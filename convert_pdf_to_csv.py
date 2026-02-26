"""
convert_pdf_to_csv.py
=====================
Converts 'Untitled document.pdf' (95-page transaction report) to a clean CSV.

PDF structure (table per page, 7 columns):
  [0] Ticket #  [1] Date  [2] Supplier  [3] Group  [4] Material  [5] Net  [6] Price

Cells may contain embedded newlines (word-wrapped) that must be collapsed.
"""

import pdfplumber
import csv
import re

INPUT_FILE  = 'Untitled document.pdf'
OUTPUT_FILE = 'converted_transactions.csv'

# Column indices
COL_TICKET   = 0
COL_DATE     = 1
COL_SUPPLIER = 2
COL_CATEGORY = 3
COL_MATERIAL = 4
COL_NET      = 5
COL_PRICE    = 6

# Header cell values to skip (the repeating page header row)
HEADER_VALUES = {'ticket #', 'ticket', 'date', 'supplier', 'group', 'material', 'net', 'price'}

def clean_cell(value):
    """Collapse embedded newlines and normalise whitespace."""
    if value is None:
        return ''
    # Replace newlines with space, collapse multiple spaces
    return re.sub(r'\s+', ' ', value.replace('\n', ' ')).strip()

def is_header_row(row):
    """True if this row is a column-label header (repeats on each page)."""
    non_empty = [clean_cell(c).lower() for c in row if c and c.strip()]
    return any(v in HEADER_VALUES for v in non_empty) and len(non_empty) >= 3

def is_blank_row(row):
    """True if every cell is empty/None."""
    return all(not (c and c.strip()) for c in row)

def is_data_row(row):
    """True if the row has a date in column 1."""
    if len(row) <= COL_DATE:
        return False
    date_val = clean_cell(row[COL_DATE])
    return bool(re.match(r'\d{2}/\d{2}/\d{4}', date_val))

def normalize_net(raw):
    """Keep net weight as-is (comma-formatted number like 18,740)."""
    v = clean_cell(raw)
    if v in ('-', ''):
        return ''
    return v

def normalize_price(raw):
    v = clean_cell(raw)
    if v in ('-', ''):
        return ''
    return v

def extract_rows_from_page(page):
    """Extract data rows from a single PDF page via pdfplumber table extraction."""
    tables = page.extract_tables()
    rows_out = []
    for table in tables:
        for row in table:
            # Pad to 7 cols
            while len(row) < 7:
                row.append('')
            if is_blank_row(row):
                continue
            if is_header_row(row):
                continue
            if not is_data_row(row):
                continue
            rows_out.append({
                'Ticket #':   clean_cell(row[COL_TICKET]),
                'Date':       clean_cell(row[COL_DATE]),
                'Supplier':   clean_cell(row[COL_SUPPLIER]),
                'Category':   clean_cell(row[COL_CATEGORY]),
                'Material':   clean_cell(row[COL_MATERIAL]),
                'Net Weight': normalize_net(row[COL_NET]),
                'Price':      normalize_price(row[COL_PRICE]),
            })
    return rows_out

def main():
    print(f'Reading: {INPUT_FILE}')
    all_rows = []

    with pdfplumber.open(INPUT_FILE) as pdf:
        total_pages = len(pdf.pages)
        print(f'Total pages: {total_pages}')

        for pg_num, page in enumerate(pdf.pages, start=1):
            rows = extract_rows_from_page(page)
            all_rows.extend(rows)
            if pg_num % 10 == 0 or pg_num == total_pages:
                print(f'  Processed page {pg_num}/{total_pages} — running total: {len(all_rows)} rows')

    if not all_rows:
        print('ERROR: No data rows extracted.')
        return

    fieldnames = ['Ticket #', 'Date', 'Supplier', 'Category', 'Material', 'Net Weight', 'Price']

    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f'\nSuccess! {len(all_rows)} transactions written to: {OUTPUT_FILE}')

    # Quick stats
    categories = {}
    for r in all_rows:
        cat = r['Category'] or 'Unknown'
        categories[cat] = categories.get(cat, 0) + 1

    print('\nRow breakdown by category:')
    for cat, count in sorted(categories.items()):
        print(f'  {cat:35s} {count:>5} rows')

    # Sample of first 5 rows
    print('\nFirst 5 rows:')
    for r in all_rows[:5]:
        print(f"  {r['Ticket #']:>6}  {r['Date']}  {r['Supplier'][:30]:30s}  "
              f"{r['Category']:12s}  Net={r['Net Weight']:>8}  Price={r['Price']}")

if __name__ == '__main__':
    main()
