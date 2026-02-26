"""
Inspect 'Untitled document.pdf' to understand its structure
and find where Net Weight data lives.
"""
import subprocess
import sys

# Try pdfplumber first (best for tables), fall back to pypdf2/pdfminer
def try_pdfplumber():
    try:
        import pdfplumber
        with pdfplumber.open('Untitled document.pdf') as pdf:
            print(f"Pages: {len(pdf.pages)}")
            for pg_num, page in enumerate(pdf.pages[:3]):  # first 3 pages
                print(f"\n=== PAGE {pg_num+1} TEXT (first 3000 chars) ===")
                text = page.extract_text() or ''
                print(text[:3000])
                print(f"\n=== PAGE {pg_num+1} TABLES ===")
                tables = page.extract_tables()
                print(f"  Found {len(tables)} table(s)")
                for t_idx, table in enumerate(tables):
                    print(f"\n  Table {t_idx} ({len(table)} rows):")
                    for r_idx, row in enumerate(table[:10]):  # first 10 rows
                        print(f"    Row {r_idx}: {row}")
        return True
    except ImportError:
        return False

def try_pypdf2():
    try:
        import PyPDF2
        with open('Untitled document.pdf', 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            print(f"Pages: {len(reader.pages)}")
            for pg_num, page in enumerate(reader.pages[:3]):
                print(f"\n=== PAGE {pg_num+1} TEXT (first 3000 chars) ===")
                text = page.extract_text() or ''
                print(text[:3000])
        return True
    except ImportError:
        return False

def try_pdfminer():
    try:
        from pdfminer.high_level import extract_text
        text = extract_text('Untitled document.pdf')
        print("=== FULL TEXT (first 5000 chars) ===")
        print(text[:5000])
        return True
    except ImportError:
        return False

if not try_pdfplumber():
    print("pdfplumber not available, trying PyPDF2...")
    if not try_pypdf2():
        print("PyPDF2 not available, trying pdfminer...")
        if not try_pdfminer():
            print("No PDF library available. Installing pdfplumber...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pdfplumber', '-q'])
            try_pdfplumber()
