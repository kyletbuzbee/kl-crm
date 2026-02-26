import csv
import glob

OUTPUT_FILE = "combined_headers.txt"

csv_files = glob.glob("*.csv")

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)
    
    for csv_file in sorted(csv_files):
        with open(csv_file, "r", newline="", encoding="utf-8") as infile:
            reader = csv.reader(infile)
            headers = next(reader)
            writer.writerow([f"=== {csv_file} ==="])
            writer.writerow(headers)

print(f"Combined headers from {len(csv_files)} CSV files into {OUTPUT_FILE}")
