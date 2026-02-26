# Define File Paths
$pdfPath = "D:\K&L Recycling Outreach\INFORMATION FOR KYLE.pdf"
$csvPath = "D:\K&L Recycling Outreach\INFORMATION_FOR_KYLE.csv"

Write-Host "--- K&L Recycling Data Extraction ---" -ForegroundColor Cyan

if (Test-Path $pdfPath) {
    Write-Host "Targeting: $pdfPath" -ForegroundColor Gray
    
    # Using python to execute the extraction logic via pdfplumber
    python -c "
import pdfplumber
import csv
import os

pdf_input = r'$pdfPath'
csv_output = r'$csvPath'

data_rows = []
# Standardized headers based on your document structure [cite: 3, 13, 31]
headers = ['Ticket #', 'Date', 'Supplier', 'Group', 'Material', 'Net', 'Price']

try:
    with pdfplumber.open(pdf_input) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table:
                    # Clean up internal newlines found in your PDF [cite: 14, 22]
                    clean_row = [' '.join(str(cell).split()) if cell else '' for cell in row]
                    
                    # Filter: Ensure it's a data row and not a 'Total' or empty row [cite: 9, 28, 37]
                    if clean_row[0] and 'Ticket' not in clean_row[0] and 'Total' not in clean_row[0]:
                        data_rows.append(clean_row)

    with open(csv_output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(data_rows)
    print('PYTHON_SUCCESS')
except Exception as e:
    print(f'PYTHON_ERROR: {e}')
" | Out-Null

    if (Test-Path $csvPath) {
        Write-Host "Success! Generated: INFORMATION_FOR_KYLE.csv" -ForegroundColor Green
    } else {
        Write-Host "Error: The CSV was not created. Check your Python installation." -ForegroundColor Red
    }
} else {
    Write-Host "Error: File not found at $pdfPath" -ForegroundColor Red
}