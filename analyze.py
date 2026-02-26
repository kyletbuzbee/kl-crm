import os
import csv
import re
import difflib
from collections import defaultdict

class CRMMasterAuditor:
    def __init__(self, root_dir="."):
        self.root_dir = root_dir
        
        # --- KNOWLEDGE BASE (Populated from Config Files) ---
        self.schema = {
            'Prospects': set(),
            'Outreach': set(),
            'Accounts': set(),
            'Contacts': set()
        }
        self.settings = {
            'Outcomes': set(),
            'Stages': set(),
            'Statuses': set(),
            'Workflow_Rules': {} # { 'Outcome': {'Stage': 'X', 'Status': 'Y'} }
        }
        
        # --- REPORTING ---
        self.violations = []
        self.stats = {'files_scanned': 0, 'issues_found': 0}

    def load_configuration(self):
        """Builds the Source of Truth from CSV/TSV files."""
        print("🔵 INITIALIZING SYSTEM KNOWLEDGE BASE...")
        
        # 1. Load System Schema (The "Skeleton")
        schema_path = self._find_file("System_Schema.csv")
        if schema_path:
            with open(schema_path, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    obj = row.get('Object', '').strip()
                    label = row.get('Label', '').strip()
                    api = row.get('API_Name', '').strip()
                    
                    if obj in self.schema:
                        if label: self.schema[obj].add(label)
                        if api: self.schema[obj].add(api)
            print(f"   ✅ Schema Loaded: Mapped fields for {', '.join(self.schema.keys())}")
        else:
            print("   ❌ CRITICAL: System_Schema.csv not found.")

        # 2. Load Settings (The "Brain")
        settings_path = self._find_file("Settings.csv")
        if settings_path:
            with open(settings_path, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f, delimiter='\t')
                next(reader, None) # Skip Header
                for row in reader:
                    if len(row) < 3: continue
                    category = row[0].strip()
                    key = row[1].strip()
                    val1 = row[2].strip()
                    val2 = row[3].strip()

                    # Capture Validation Lists
                    if category == 'VALIDATION_LIST':
                        # Valid values often span multiple columns or are comma-separated
                        raw_values = ','.join(row[2:]).split(',')
                        clean_values = {v.strip() for v in raw_values if v.strip()}
                        
                        if key == 'Outcomes': self.settings['Outcomes'] = clean_values
                        elif key == 'Stages': self.settings['Stages'] = clean_values
                        elif key == 'Statuses': self.settings['Statuses'] = clean_values

                    # Capture Workflow Logic (The "Flow")
                    elif category == 'WORKFLOW_RULE':
                        # key = Outcome, val1 = Stage, val2 = Status
                        self.settings['Workflow_Rules'][key] = {'Stage': val1, 'Status': val2}

            print(f"   ✅ Settings Loaded: {len(self.settings['Outcomes'])} Outcomes, {len(self.settings['Workflow_Rules'])} Workflow Rules")
        else:
            print("   ❌ CRITICAL: Settings.tsv not found.")

    def run_deep_scan(self):
        """Recursively scans all code files."""
        print("\n🔵 STARTING DEEP CODE SCAN...")
        exclude = {'.git', 'node_modules', '__pycache__', 'venv'}
        
        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            dirnames[:] = [d for d in dirnames if d not in exclude]
            
            for filename in filenames:
                ext = filename.lower().split('.')[-1]
                if ext in ['js', 'gs', 'html']:
                    filepath = os.path.join(dirpath, filename)
                    self._analyze_file(filepath, ext)
                    self.stats['files_scanned'] += 1

    def _analyze_file(self, filepath, ext):
        rel_path = os.path.relpath(filepath, self.root_dir)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
        except: return

        # Regex for finding string literals (single or double quoted)
        str_pattern = re.compile(r'["\']([^"\']+)["\']')

        for i, line in enumerate(lines):
            line_num = i + 1
            code = line.strip()
            if not code or code.startswith('//'): continue # Skip empty or comments

            # Extract all string literals in this line
            strings = str_pattern.findall(code)
            
            for s in strings:
                self._audit_string_literal(s, rel_path, line_num, code, ext)

            # SPECIAL: Check HTML Attributes for Logic Flow
            if ext == 'html':
                self._audit_html_logic(code, rel_path, line_num)

    def _audit_string_literal(self, text, filename, line_num, code, ext):
        """Validates a specific string found in the code."""
        # Noise Filter
        if len(text) < 3: return
        if text in ['GET', 'POST', 'application/json', 'center', 'width', 'true', 'false']: return

        # 1. "Not Contacted" Check (The User's specific pain point)
        if text == "Not Contacted":
            # Allowed in Prospects logic as a default, BANNED in Outreach inputs/buttons
            if "Outreach" in filename or "dashboard.html" in filename:
                self._log(filename, line_num, "HIGH", 
                          "Found banned status 'Not Contacted' in Outreach/UI context. Should be 'No Answer'?", code)

        # 2. Schema Validation (Are you referencing columns that don't exist?)
        # We check if the string looks like a column header
        for obj, fields in self.schema.items():
            if self._is_close_match(text, fields):
                if text not in fields:
                     self._log(filename, line_num, "MEDIUM", 
                               f"Potential Schema Typo. Found '{text}', matches known field in {obj}.", code)

        # 3. Settings/Logic Validation (Are you using invalid Outcomes/Stages?)
        # Only check if the string 'looks like' a CRM term (capitalized, specific words)
        if text in self.settings['Outcomes']: return # Valid
        if text in self.settings['Stages']: return # Valid
        
        # If it's NOT in the lists, but looks suspiciously like one (Typos or Old Data)
        if self._is_close_match(text, self.settings['Outcomes']):
             self._log(filename, line_num, "HIGH", f"Invalid Outcome '{text}'. Value matches Settings list but is not exact.", code)

    def _audit_html_logic(self, code, filename, line_num):
        """Checks HTML specific logic (Buttons, Dropdowns)."""
        # Check for hardcoded onclick outcome setters
        # Example: onclick="setOutcome('Not Contacted')"
        match = re.search(r"setOutcome\(['\"]([^'\"]+)['\"]", code)
        if match:
            outcome = match.group(1)
            if outcome not in self.settings['Outcomes'] and outcome != "Not Contacted": 
                # Note: Not Contacted caught by string audit, this catches others
                self._log(filename, line_num, "HIGH", f"HTML Button sets invalid Outcome: '{outcome}'", code)

    def _is_close_match(self, val, target_set):
        """Fuzzy matching to catch typos."""
        if val in target_set: return False # Exact match is fine
        for t in target_set:
            ratio = difflib.SequenceMatcher(None, val.lower(), t.lower()).ratio()
            if ratio > 0.9: return True # It's a typo
        return False

    def _find_file(self, name):
        for root, dirs, files in os.walk(self.root_dir):
            if name in files: return os.path.join(root, name)
        return None

    def _log(self, file, line, severity, msg, context):
        self.violations.append({
            'file': file, 'line': line, 'sev': severity, 'msg': msg, 'ctx': context
        })
        self.stats['issues_found'] += 1

    def generate_report(self):
        print("\n" + "="*70)
        print("       🛡️ K&L CRM MASTER LOGIC AUDIT REPORT")
        print("="*70)
        
        if not self.violations:
            print("\n✅ SYSTEM HEALTHY. No logic or schema violations found.")
        else:
            print(f"\n🚨 FOUND {len(self.violations)} ISSUES ACROSS {self.stats['files_scanned']} FILES:")
            
            # Group by file for readability
            self.violations.sort(key=lambda x: x['file'])
            current_file = ""
            
            for v in self.violations:
                if v['file'] != current_file:
                    print(f"\n📄 {v['file']}")
                    current_file = v['file']
                
                icon = "🔴" if v['sev'] == "HIGH" else "⚠️"
                print(f"   {icon} Line {v['line']}: {v['msg']}")
                print(f"      Code: {v['ctx'].strip()}")

        print("\n" + "-"*70)
        print("Audit Complete.")

if __name__ == "__main__":
    auditor = CRMMasterAuditor()
    auditor.load_configuration()
    auditor.run_deep_scan()
    auditor.generate_report()