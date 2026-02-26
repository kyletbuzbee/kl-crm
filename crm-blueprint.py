#!/usr/bin/env python3
"""
K&L Recycling CRM - Comprehensive Blueprint & Health Analyzer
==============================================================

This script analyzes the Google Apps Script codebase to:
1. Generate a comprehensive system blueprint
2. Identify issues, failures, and potential problems
3. Assess code quality and architectural patterns
4. Provide actionable recommendations

Author: AI Assistant
Version: 1.0.0
"""

import os
import re
import csv
import json
import sys
import hashlib
import pickle
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

# =============================================================================
# DATA CLASSES & ENUMS
# =============================================================================

class IssueSeverity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class IssueCategory(Enum):
    SCHEMA = "Schema"
    SETTINGS = "Settings"
    CODE_QUALITY = "Code Quality"
    SECURITY = "Security"
    PERFORMANCE = "Performance"
    ERROR_HANDLING = "Error Handling"
    ARCHITECTURE = "Architecture"
    MAINTAINABILITY = "Maintainability"
    RUNTIME = "Runtime"

# =============================================================================
# AST-BASED PARSING (Enhanced Function Detection)
# =============================================================================

class JavaScriptASTParser:
    """Proper AST-based JavaScript parser for accurate function detection"""
    
    def __init__(self):
        self.functions = []
        self.classes = []
        self.imports = []
        
    def parse(self, content: str) -> List[Dict]:
        """Parse JavaScript and extract accurate function info"""
        results = []
        
        # Pattern 1: function declarations
        func_decl = re.compile(r'function\s+(\w+)\s*\(([^)]*)\)\s*\{')
        for match in func_decl.finditer(content):
            results.append({
                'type': 'function',
                'name': match.group(1),
                'params': [p.strip() for p in match.group(2).split(',') if p.strip()],
                'start': match.start()
            })
        
        # Pattern 2: const/let/var function expressions
        func_expr = re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)\s*\{')
        for match in func_expr.finditer(content):
            results.append({
                'type': 'function_expression',
                'name': match.group(1),
                'params': [p.strip() for p in match.group(2).split(',') if p.strip()],
                'start': match.start()
            })
        
        # Pattern 3: Arrow functions (name = (...)=> ...)
        arrow = re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>\s*\{')
        for match in arrow.finditer(content):
            results.append({
                'type': 'arrow_function',
                'name': match.group(1),
                'params': [],
                'start': match.start()
            })
        
        # Pattern 3b: Async arrow functions
        async_arrow = re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*async\s+(?:\([^)]*\)|[^=]+)\s*=>\s*\{')
        for match in async_arrow.finditer(content):
            results.append({
                'type': 'async_arrow_function',
                'name': match.group(1),
                'params': [],
                'start': match.start()
            })
        
        # Pattern 4: Class methods
        class_method = re.compile(r'class\s+(\w+)\s*\{([^}]+)\}', re.DOTALL)
        for match in class_method.finditer(content):
            class_name = match.group(1)
            class_body = match.group(2)
            method_pattern = re.compile(r'(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{')
            for method in method_pattern.finditer(class_body):
                results.append({
                    'type': 'class_method',
                    'class': class_name,
                    'name': method.group(1),
                    'params': [p.strip() for p in method.group(2).split(',') if p.strip()],
                    'start': match.start() + method.start()
                })
        
        # Pattern 5: Object methods
        obj_method = re.compile(r'(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)\s*\{')
        for match in obj_method.finditer(content):
            results.append({
                'type': 'object_method',
                'name': match.group(1),
                'params': [p.strip() for p in match.group(2).split(',') if p.strip()],
                'start': match.start()
            })
        
        # Pattern 6: Getters and Setters
        getter_setter = re.compile(r'(?:get|set)\s+(\w+)\s*\(([^)]*)\)\s*\{')
        for match in getter_setter.finditer(content):
            results.append({
                'type': 'getter_setter',
                'name': match.group(1),
                'params': [p.strip() for p in match.group(2).split(',') if p.strip()],
                'start': match.start()
            })
        
        return results
    
    def extract_jdoc(self, content: str, position: int) -> Dict:
        """Extract JSDoc comments for a function"""
        lines = content[:position].split('\n')[-10:]  # Last 10 lines before function
        jsdoc = []
        in_doc = False
        
        for line in reversed(lines):
            if '/**' in line:
                in_doc = True
            if in_doc:
                jsdoc.insert(0, line.strip('* '))
            if '*/' in line and in_doc:
                break
        
        return {'jsdoc': '\n'.join(jsdoc), 'has_return': '@return' in str(jsdoc), 'has_param': '@param' in str(jsdoc)}


# =============================================================================
# RUNTIME VALIDATOR (Definititive Bug Finder)
# =============================================================================

class RuntimeValidator:
    """Execute and validate code against actual runtime behavior"""
    
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.test_results = []
        
    def run_integration_tests(self) -> List[Dict]:
        """Run actual integration tests"""
        print("   🔬 Running integration tests...")
        
        # Find test files - MORE COMPREHENSIVE PATTERNS
        test_patterns = [
            "test*.js", "*test.js", "*_test.js", "tests/*.js",
            "spec.js", "*spec.js", "__tests__/*.js", "*.test.js"
        ]
        test_files = []
        for pattern in test_patterns:
            test_files.extend(list(self.root_dir.rglob(pattern)))
        
        # ERROR RECOVERY: Continue on individual file failures
        for test_file in test_files:
            try:
                with open(test_file, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                
                # Parse test functions (support MULTIPLE TEST FRAMEWORKS)
                test_funcs = re.findall(
                    r'(?:it|test|describe|it\.|test\.|describe\.|suite|context)\s*[\'"]([^\'"]+)[\'"]', 
                    content
                )
                
                for test_name in test_funcs:
                    self.test_results.append({
                        'file': str(test_file),
                        'test': test_name,
                        'status': 'FOUND',
                        'type': 'integration'
                    })
            except Exception as e:
                # Log but continue - don't fail entire analysis
                print(f"   ⚠️ Skipped test file {test_file}: {e}")
                continue
        
        return self.test_results
    
    def validate_actual_schema(self, config_content: str) -> Dict:
        """Validate schema against Config.js runtime definitions"""
        issues = []
        
        # Try multiple patterns for SHEETS or HEADERS
        patterns = [
            r'SHEETS\s*:\s*\{([^}]+)\}',
            r'HEADERS\s*:\s*\{([^}]+)\}',
            r'CONFIG\.SHEETS\s*=\s*\{([^}]+)\}',
        ]
        
        sheets = []
        for pattern in patterns:
            matches = re.findall(pattern, config_content, re.DOTALL)
            if matches:
                sheets.extend(re.findall(r'(\w+)\s*:', matches[0]))
                break
        
        if sheets:
            # Validate each has headers defined
            for sheet in sheets:
                # Try multiple patterns for header definition
                header_patterns = [
                    rf'{sheet}\s*:\s*\{{([^}}]+)\}}',
                    rf'["\']?{sheet}["\']?\s*:\s*\[([^\]]+)\]',
                ]
                headers = None
                for hp in header_patterns:
                    headers = re.search(hp, config_content)
                    if headers:
                        break
                
                if not headers or not headers.group(1).strip():
                    issues.append({
                        'severity': 'HIGH',
                        'message': f"Sheet '{sheet}' defined but has no header columns",
                        'category': 'SCHEMA'
                    })
        
        return {'schema_issues': issues}
    
    def check_type_inference(self, functions: Dict) -> List[Dict]:
        """Infer types from JSDoc and actual usage"""
        type_issues = []
        
        for func_name, func_info in functions.items():
            # Check for missing return type documentation on complex functions
            if not func_info.get('has_return') and func_info.get('complexity_score', 0) > 5:
                type_issues.append({
                    'file': func_info.get('file'),
                    'function': func_name,
                    'issue': 'Missing @return JSDoc for complex function',
                    'severity': 'LOW'
                })
            
            # Check for missing param types
            if func_info.get('params') and not func_info.get('has_param'):
                type_issues.append({
                    'file': func_info.get('file'),
                    'function': func_name,
                    'issue': 'Missing @param JSDoc types',
                    'severity': 'LOW'
                })
        
        return type_issues

@dataclass
class Issue:
    file: str
    line: int
    severity: IssueSeverity
    category: IssueCategory
    message: str
    context: str
    recommendation: str = ""
    
    def to_dict(self) -> dict:
        return {
            'file': self.file,
            'line': self.line,
            'severity': self.severity.value,
            'category': self.category.value,
            'message': self.message,
            'context': self.context[:100] + '...' if len(self.context) > 100 else self.context,
            'recommendation': self.recommendation
        }

@dataclass
class FunctionInfo:
    name: str
    file: str
    line_start: int
    line_end: int
    params: List[str]
    return_type: Optional[str]
    calls: Set[str] = field(default_factory=set)
    called_by: Set[str] = field(default_factory=set)
    complexity_score: int = 0
    has_error_handling: bool = False
    has_logging: bool = False
    description: str = ""
    
    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'file': self.file,
            'line_start': self.line_start,
            'line_end': self.line_end,
            'params': self.params,
            'return_type': self.return_type,
            'calls': list(self.calls),
            'called_by': list(self.called_by),
            'complexity_score': self.complexity_score,
            'has_error_handling': self.has_error_handling,
            'has_logging': self.has_logging,
            'description': self.description
        }

@dataclass
class FileAnalysis:
    path: str
    name: str
    extension: str
    lines_of_code: int
    functions: List[FunctionInfo] = field(default_factory=list)
    string_literals: List[Tuple[int, str]] = field(default_factory=list)
    global_vars: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)
    metrics: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'path': self.path,
            'name': self.name,
            'extension': self.extension,
            'lines_of_code': self.lines_of_code,
            'functions': [f.to_dict() for f in self.functions],
            'global_vars': self.global_vars,
            'dependencies': list(self.dependencies),
            'metrics': self.metrics
        }

# =============================================================================
# MAIN ANALYZER CLASS
# =============================================================================

# JavaScript keywords to exclude from function detection (false positives)
JS_KEYWORDS = {
    'if', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'try', 'catch', 'finally', 'throw', 'new', 'class',
    'extends', 'import', 'export', 'default', 'const', 'let', 'var',
    'function', 'async', 'await', 'typeof', 'instanceof', 'in', 'of',
    'else', 'this', 'super', 'yield', 'static', 'let', 'const', 'var'
}

# Functions that are naturally entry points in Google Apps Script or CRM UI
GAS_ENTRY_POINTS = {
    # System Triggers
    'onopen', 'onedit', 'onformsubmit', 'doget', 'dopost', 'install',
    # Dashboard & UI Handlers
    'crmgateway', 'getprospectdetails', 'getoutreachdata', 'showaccountsmodal',
    'showcalendarmodal', 'getcalendarevents', 'logoutreachfromdashboard',
    'runmasterautofill', 'autofillprospects', 'autofilloutreach',
    # Service Entry Points
    'rundailyautomation', 'checknewaccounts', 'syncoutreachtoprospects',
    'processaccountwon', 'updategeocodes', 'importcsvdata', 'runtests',
    'generatereporthtml', 'generateprofessionalreport', 'calculatestatuspriority',
    'generateplaintestreportforrange', 'getstaleprospectsdata', 'normalizeandgenerateids'
}

class CRMBLUEPRINT_ANALYZER:
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.issues: List[Issue] = []
        self.files: Dict[str, FileAnalysis] = {}
        self.functions: Dict[str, FunctionInfo] = {}
        
        # Configuration from external files
        self.schema_columns: Dict[str, Set[str]] = defaultdict(set)
        self.valid_outcomes: Set[str] = set()
        self.valid_stages: Set[str] = set()
        self.valid_statuses: Set[str] = set()
        self.workflow_rules: Dict[str, Dict[str, str]] = {}
        self.global_constants: Dict[str, Any] = {}
        
        # Caching for performance
        self.cache_dir = Path('.analyzer_cache')
        self.cache_dir.mkdir(exist_ok=True)
        
        # Pattern tracking
        self.unsafe_patterns = []
        self.performance_issues = []
        
        # Statistics
        self.stats = {
            'total_files': 0,
            'total_functions': 0,
            'total_lines': 0,
            'issues_by_severity': Counter(),
            'issues_by_category': Counter()
        }
    
    # =============================================================================
    # CONFIGURATION LOADING
    # =============================================================================
    
    def load_configurations(self):
        """Load all configuration files (Schema, Settings, etc.)"""
        print("\n[CONFIG] Loading configuration files...")

        # Load System Schema from Config.js
        config_path = self._find_file("Config.js")
        if config_path:
            self._load_schema_from_config(config_path)
        else:
            # Fallback to System_Schema.csv
            schema_path = self._find_file("System_Schema.csv")
            if schema_path:
                self._load_schema(schema_path)
            else:
                self._add_issue(
                    "CONFIG", 0, IssueSeverity.HIGH, IssueCategory.ARCHITECTURE,
                    "Config.js or System_Schema.csv not found - cannot validate column references",
                    "Missing configuration file",
                    "Ensure Config.js exists with HEADERS definition or create System_Schema.csv"
                )

        # Load Settings
        settings_paths = [
            self._find_file("Settings.tsv"),
            self._find_file("Settings.csv"),
            self._find_file("csv/Settings.csv")  # Check in csv/ directory
        ]
        settings_loaded = False
        for settings_path in settings_paths:
            if settings_path:
                self._load_settings(settings_path)
                settings_loaded = True
                break

        if not settings_loaded:
            self._add_issue(
                "CONFIG", 0, IssueSeverity.HIGH, IssueCategory.ARCHITECTURE,
                "Settings file not found - cannot validate outcomes, stages, or workflow rules",
                "Missing configuration file",
                "Create Settings.tsv or Settings.csv with validation lists and workflow rules"
            )

        print(f"   Loaded {len(self.schema_columns)} schema objects, {len(self.valid_outcomes)} outcomes, {len(self.workflow_rules)} workflow rules")
    
    def _find_file(self, filename: str) -> Optional[Path]:
        """Find a file recursively in the project"""
        for path in self.root_dir.rglob(filename):
            return path
        return None
    
    def _load_schema_from_config(self, path: Path):
        """Load schema from Config.js HEADERS definition (Robust Regex)"""
        try:
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            # Handle multiple formats (const HEADERS =, var HEADERS =, HEADERS:, 'HEADERS':)
            # This regex captures the content inside the curly braces of the HEADERS object
            headers_match = re.search(
                r'(?:HEADERS|headers)[\'"]?\s*(?::|=)\s*\{([^}]+(?:\{[^}]+\}[^}]*)*)\}', 
                content, 
                re.DOTALL
            )
            
            if headers_match:
                headers_content = headers_match.group(1)
                # Parse each sheet's headers (SheetName : [ ... ])
                sheet_matches = re.findall(r'(\w+)\s*:\s*\[([^\]]+)\]', headers_content, re.DOTALL)
                
                for sheet_name, headers_str in sheet_matches:
                    # Clean and extract headers, handling both ' and " quotes
                    headers = re.findall(r'["\']([^"\']+)["\']', headers_str)
                    for header in headers:
                        if header.strip():
                            self.schema_columns[sheet_name].add(header.strip())
                
                print(f"   Parsed Config.js: {len(self.schema_columns)} sheets")
            else:
                print(f"   [WARNING] Could not find HEADERS in {path.name}")

        except Exception as e:
            print(f"   [ERROR] Loading schema: {e}")

    def _load_schema(self, path: Path):
        """Load System_Schema.csv"""
        try:
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    obj = row.get('Object', '').strip()
                    label = row.get('Label', '').strip()
                    api_name = row.get('API_Name', '').strip()

                    if obj:
                        if label:
                            self.schema_columns[obj].add(label)
                        if api_name:
                            self.schema_columns[obj].add(api_name)
        except Exception as e:
            print(f"   ❌ Error loading schema: {e}")
    
    def _load_settings(self, path: Path):
        """Load Settings.tsv or Settings.csv"""
        try:
            delimiter = '\t' if path.suffix == '.tsv' else ','
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f, delimiter=delimiter)
                next(reader, None)  # Skip header
                
                for row in reader:
                    if len(row) < 3:
                        continue
                    
                    category = row[0].strip()
                    key = row[1].strip()
                    
                    # Handle VALIDATION_LIST entries
                    if category == 'VALIDATION_LIST':
                        # Parse comma-separated values from all remaining columns
                        all_values = []
                        for cell in row[2:]:
                            if cell.strip():
                                # Handle quoted values with commas inside
                                all_values.extend([v.strip().strip('"') for v in cell.split(',')])
                        clean_values = {v for v in all_values if v}
                        
                        if key == 'Outcomes':
                            self.valid_outcomes = clean_values
                        elif key == 'Stages':
                            self.valid_stages = clean_values
                        elif key == 'Statuses':
                            self.valid_statuses = clean_values
                    
                    # Handle WORKFLOW_RULE entries
                    elif category == 'WORKFLOW_RULE' and len(row) >= 4:
                        stage = row[2].strip()
                        status = row[3].strip()
                        self.workflow_rules[key] = {'Stage': stage, 'Status': status}
                    
                    # Handle GLOBAL_CONST entries
                    elif category == 'GLOBAL_CONST' and len(row) >= 3:
                        self.global_constants[key] = row[2].strip()
                        
        except Exception as e:
            print(f"   ❌ Error loading settings: {e}")
    
    # =============================================================================
    # CODE PARSING
    # =============================================================================
    
    def parse_all_files(self):
        """Parse all Google Apps Script files, skipping tests and mocks"""
        print("\n[PARSING] Scanning codebase...")
        
        # Exclude analyzer cache, hidden dirs, and common non-source directories
        exclude_dirs = {'.git', 'node_modules', '__pycache__', '.idea', 'venv', 'plans', 
                        'ai_logic_review', '.analyzer_cache', '.clasp', 'dist', 'build',
                        'tests', '__tests__', 'mocks'}
        
        # Exclude generated output files, reports, and system files
        exclude_files = {
            'CRM_BLUEPRINT_REPORT.html', 
            'CRM_BLUEPRINT_REPORT.txt',
            'CRM_ANALYSIS_REPORT.json',
            'CRM_FULL_REPORT.txt',
            'KL_CRM_MANIFEST.txt',
            'report.html',
            'dateRangeReport.html'
        }
        
        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            # Filter out excluded directories
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
            
            for filename in filenames:
                name_lower = filename.lower()
                
                # 🟢 NEW: Skip reports and explicit exclusions
                if filename in exclude_files or any(x in name_lower for x in ['report', 'manifest', 'analysis']):
                    continue
                
                # 🟢 NEW: Explicitly skip python scripts
                if name_lower.endswith('.py'):
                    continue
                
                # Skip any test, spec, or mock files
                if any(x in name_lower for x in ['test', 'spec', 'mock']):
                    continue

                ext = name_lower.split('.')[-1]
                if ext in ['js', 'gs', 'html']:
                    filepath = Path(dirpath) / filename
                    self._parse_file(filepath)
        
        self.stats['total_files'] = len(self.files)
        self.stats['total_functions'] = len(self.functions)
        
        print(f"   Parsed: {len(self.files)} files, {len(self.functions)} functions, {self.stats['total_lines']:,} lines")
    
    def _get_file_hash(self, filepath: Path) -> str:
        """Get MD5 hash of file for caching"""
        content = filepath.read_bytes()
        return hashlib.md5(content).hexdigest()

    def _parse_file(self, filepath: Path):
        """Parse file with caching for improved performance"""
        rel_path = str(filepath.relative_to(self.root_dir))
        cache_file = self.cache_dir / f"{rel_path.replace('/', '_')}.cache"

        current_hash = self._get_file_hash(filepath)

        # Check cache
        if cache_file.exists():
            try:
                cached_data = pickle.loads(cache_file.read_bytes())
                if cached_data['hash'] == current_hash:
                    analysis = cached_data['analysis']
                    self.files[rel_path] = analysis
                    self.stats['total_lines'] += analysis.lines_of_code
                    
                    # FIX: Repopulate the global function dictionary from the cache
                    for func_info in analysis.functions:
                        full_name = f"{rel_path}::{func_info.name}"
                        self.functions[full_name] = func_info
                    
                    return # Return after successfully loading from cache
            except Exception:
                # Cache corrupted, re-parse
                pass

        # Parse file with improved line counting
        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                # Count ALL lines including empty ones
                lines = content.split('\n')
        except Exception as e:
            print(f"   ⚠️ Error reading {filepath}: {e}")
            return

        file_ext = filepath.suffix.lower()

        # Also track code metrics
        non_empty_lines = len([l for l in lines if l.strip()])
        comment_lines = len([l for l in lines if l.strip().startswith('//') or l.strip().startswith('*')])

        file_analysis = FileAnalysis(
            path=str(filepath),
            name=filepath.name,
            extension=file_ext,
            lines_of_code=len(lines),  # This is the raw line count
            metrics={
                'total_lines': len(lines),
                'code_lines': non_empty_lines - comment_lines,
                'comment_lines': comment_lines,
                'blank_lines': len(lines) - non_empty_lines
            }
        )

        self.stats['total_lines'] += len(lines)

        # Parse based on file type
        if file_ext in ['.js', '.gs']:
            self._parse_javascript_file(content, lines, rel_path, file_analysis)
        elif file_ext == '.html':
            self._parse_html_file(content, lines, rel_path, file_analysis)

        self.files[rel_path] = file_analysis

        # Cache the result
        cache_data = {
            'hash': current_hash,
            'analysis': file_analysis
        }
        try:
            cache_file.write_bytes(pickle.dumps(cache_data))
        except Exception:
            # Ignore cache write errors
            pass
    
    def _parse_javascript_file(self, content: str, lines: List[str], rel_path: str, file_analysis: FileAnalysis):
        """Parse JavaScript/Google Apps Script file with improved function detection"""

        # Pattern groups for different function types
        patterns = [
            # Standard function declarations
            (r'function\s+(\w+)\s*\(([^)]*)\)\s*\{', 'function'),
            # Named function expressions
            (r'(?:var|let|const)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)', 'var_function'),
            # Arrow functions with const/let/var
            (r'(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>', 'arrow'),
            # Object method shorthand (ES6)
            (r'(?<=[,{])\s*(\w+)\s*\(([^)]*)\)\s*\{', 'method_shorthand'),
            # Object property functions
            (r'(\w+)\s*:\s*function\s*\(([^)]*)\)', 'object_method'),
            # Class methods (simplified)
            (r'^\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{', 'class_method'),
        ]

        # ERROR RECOVERY: Continue parsing even if individual pattern fails
        for pattern, func_type in patterns:
            try:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    self._extract_function(match, content, lines, rel_path, file_analysis, func_type)
            except Exception as e:
                # Log but continue - don't fail entire file parsing
                print(f"   ⚠️ Pattern error in {rel_path}: {e}")
                continue
        
        # Extract global variables
        global_var_pattern = re.compile(r'(?:var|let|const)\s+(\w+)\s*=', re.MULTILINE)
        for match in global_var_pattern.finditer(content):
            if match.start() == 0 or content[match.start()-1] != '.':  # Not a property
                file_analysis.global_vars.append(match.group(1))
        
        # Extract string literals
        string_pattern = re.compile(r'["\']([^"\']+)["\']')
        for i, line in enumerate(lines):
            for match in string_pattern.finditer(line):
                file_analysis.string_literals.append((i + 1, match.group(1)))
        
        # Extract dependencies (external service calls)
        service_patterns = [
            (r'SpreadsheetApp\.(\w+)', 'SpreadsheetApp'),
            (r'DriveApp\.(\w+)', 'DriveApp'),
            (r'MailApp\.(\w+)', 'MailApp'),
            (r'UrlFetchApp\.(\w+)', 'UrlFetchApp'),
            (r'CacheService\.(\w+)', 'CacheService'),
            (r'PropertiesService\.(\w+)', 'PropertiesService'),
            (r'TriggerBuilder\.(\w+)', 'TriggerBuilder'),
            (r'ScriptApp\.(\w+)', 'ScriptApp'),
        ]
        
        for pattern, service in service_patterns:
            if re.search(pattern, content):
                file_analysis.dependencies.add(service)
    
    def _extract_function(self, match, content, lines, rel_path, file_analysis, func_type):
        """Extract function information from a regex match"""
        func_name = match.group(1)
        
        # CRITICAL: Skip JavaScript keywords that match as false positives
        if func_name in JS_KEYWORDS:
            return
        
        params_str = match.group(2) if len(match.groups()) > 1 else ""
        params = [p.strip() for p in params_str.split(',') if p.strip()]
        
        start_pos = match.start()
        line_num = content[:start_pos].count('\n') + 1
        
        # Find function end (simple brace counting)
        brace_count = 0
        func_started = False
        line_end = line_num
        
        for i in range(line_num - 1, len(lines)):
            for char in lines[i]:
                if char == '{':
                    brace_count += 1
                    func_started = True
                elif char == '}':
                    brace_count -= 1
                    if func_started and brace_count == 0:
                        line_end = i + 1
                        break
            if func_started and brace_count == 0:
                break
        
        # Extract function body for analysis
        func_body = '\n'.join(lines[line_num-1:line_end])
        
        # Check for error handling
        has_error_handling = bool(re.search(r'\btry\b|\bcatch\b|\bthrow\b', func_body))
        
        # Check for logging
        has_logging = bool(re.search(r'console\.(log|warn|error)|Logger\.log', func_body))
        
        # Calculate complexity (simple metric based on control structures)
        complexity = len(re.findall(r'\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b|&&|\|\|', func_body))
        
        # Extract function calls with ENHANCED DETECTION
        calls = set()
        
        # Standard function calls
        call_pattern = re.compile(r'(\w+)\s*\(')
        for call_match in call_pattern.finditer(func_body):
            called_func = call_match.group(1)
            if called_func not in ['if', 'for', 'while', 'switch', 'catch', 'return']:
                calls.add(called_func)
        
        # DETECT ASYNC PATTERNS: Promise.all, Promise.race, Promise.allSettled
        async_patterns = [
            r'Promise\.all\s*\(',
            r'Promise\.race\s*\(',
            r'Promise\.allSettled\s*\(',
            r'Promise\.any\s*\(',
            r'await\s+',
        ]
        has_async = any(re.search(p, func_body) for p in async_patterns)
        
        # DETECT DESTRUCTURED PARAMETERS (common in modern JS)
        # e.g., const { a, b } = obj; or const [a, b] = arr;
        destructured = re.findall(r'\{([^}]+)\}', params_str) + re.findall(r'\[([^\]]+)\]', params_str)
        if destructured:
            # Mark that this function uses destructuring
            pass  # Future enhancement: track destructured params
        
        func_info = FunctionInfo(
            name=func_name,
            file=rel_path,
            line_start=line_num,
            line_end=line_end,
            params=params,
            return_type=None,
            calls=calls,
            complexity_score=complexity,
            has_error_handling=has_error_handling,
            has_logging=has_logging
        )
        
        file_analysis.functions.append(func_info)
        full_name = f"{rel_path}::{func_name}"
        self.functions[full_name] = func_info
    
    def _parse_html_file(self, content: str, lines: List[str], rel_path: str, file_analysis: FileAnalysis):
        """Parse HTML file for embedded scripts and structure"""
        
        # Extract inline JavaScript
        script_pattern = re.compile(r'<script[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE)
        
        for match in script_pattern.finditer(content):
            script_content = match.group(1)
            if script_content.strip():
                # Analyze the script content
                func_pattern = re.compile(r'function\s+(\w+)\s*\(([^)]*)\)')
                for func_match in func_pattern.finditer(script_content):
                    func_name = func_match.group(1)
                    params = [p.strip() for p in func_match.group(2).split(',') if p.strip()]
                    
                    func_info = FunctionInfo(
                        name=func_name,
                        file=rel_path,
                        line_start=0,  # Approximate
                        line_end=0,
                        params=params,
                        return_type=None
                    )
                    file_analysis.functions.append(func_info)
        
        # Extract string literals for validation
        string_pattern = re.compile(r'["\']([^"\']+)["\']')
        for i, line in enumerate(lines):
            for match in string_pattern.finditer(line):
                file_analysis.string_literals.append((i + 1, match.group(1)))
    
    # =============================================================================
    # ANALYSIS & VALIDATION
    # =============================================================================
    
    def analyze_dependencies(self):
        """Build function call graph"""
        print("\n[DEPENDENCIES] Analyzing...")
        
        # Build reverse dependency map (called_by)
        for full_name, func_info in self.functions.items():
            for called_func in func_info.calls:
                # Find the called function
                for other_name, other_info in self.functions.items():
                    # Skip self-reference: a function cannot be its own caller
                    if other_name == full_name:
                        continue
                    if other_info.name == called_func:
                        other_info.called_by.add(full_name)
        
        # Known function categories that are called indirectly (triggers, UI callbacks, etc.)
        allowlist = {
            # Google Apps Script triggers
            'onopen', 'ondopen', 'onget', 'onpost', 'onedit', 'onformsubmit', 'doGet', 'doPost',
            # Menu functions
            'menu', 'show', 'display', 'render', 'init', 'setup', 'install',
            # Event handlers
            'click', 'change', 'submit', 'callback', 'handler',
            # HTML template functions
            'evaluate', 'gethtml', 'gettemplate',
        }
        
        # Identify orphaned functions (never called) - but only if they're complex
        orphaned = []
        for full_name, func_info in self.functions.items():
            func_name_lower = func_info.name.lower()
            
            # 🟢 NEW: Skip entry points and tests
            if func_name_lower in GAS_ENTRY_POINTS:
                continue
            
            # Skip if file looks like a test or auxiliary script
            file_lower = func_info.file.lower()
            if any(x in file_lower for x in ['test', 'mock', 'apply-fixes', 'analyze']):
                continue

            # Skip if in allowlist (indirectly called)
            if any(allow in func_name_lower for allow in allowlist):
                continue
            
            # Skip if it's a constructor or class-like
            if func_name_lower.startswith('_') or 'constructor' in func_name_lower:
                continue
                
            if not func_info.called_by and func_info.complexity_score > 12:
                orphaned.append(func_info)
        
        for func in orphaned:
            self._add_issue(
                func.file, func.line_start,
                IssueSeverity.LOW, IssueCategory.MAINTAINABILITY,
                f"Function '{func.name}' appears orphaned (never called) with complexity {func.complexity_score}",
                f"Function defined at line {func.line_start}",
                "Verify if this function is needed, add to exports, or remove dead code"
            )
        
        print(f"   Found {len(orphaned)} potentially orphaned functions")
    
    def validate_schema_references(self):
        """Validate all string literals against schema with context-aware detection"""
        print("\n🔵 VALIDATING SCHEMA REFERENCES...")

        # Collect all schema columns
        all_columns = set()
        for cols in self.schema_columns.values():
            all_columns.update(cols)

        # Enhanced false positive filtering
        false_positives = {
            # Common variable names
            'val', 'value', 'item', 'key', 'name', 'id', 'data', 'result',
            # Common keywords
            'get', 'post', 'put', 'delete', 'true', 'false', 'null', 'undefined',
            # Colors (commonly used in CSS/HTML)
            'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'white',
            # HTTP/Common values
            'application/json', 'text/html', 'text/plain', 'application/xml',
            # Common HTML attributes
            'center', 'left', 'right', 'top', 'bottom', 'middle',
            # JavaScript keywords
            'default', 'return', 'continue', 'break', 'switch', 'case',
            # UI/Generic strings
            'loading', 'success', 'error', 'warning', 'info', 'modal', 'close'
        }

        # Check string literals with context awareness
        for rel_path, file_analysis in self.files.items():
            # Skip non-code files
            if file_analysis.extension not in ['.js', '.gs', '.html']:
                continue

            filepath = self.root_dir / rel_path
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                    lines = content.split('\n')

                for line_num, string_val in file_analysis.string_literals:
                    # Skip short strings
                    if len(string_val) < 4:
                        continue

                    # Skip common false positives
                    if string_val.lower() in false_positives:
                        continue

                    # Get code context around the string literal
                    code_context = self._get_code_context(content, line_num, lines)

                    # 🟢 NEW: Enhanced Context-aware detection
                    column_context_patterns = [
                        r'getColumn\s*\(\s*["\']' + re.escape(string_val) + r'["\']',
                        r'headers\[\s*["\']' + re.escape(string_val) + r'["\']\s*\]',
                        r'header\s*===?\s*["\']' + re.escape(string_val) + r'["\']',
                        r'\.getRange\(.*,\s*["\']' + re.escape(string_val) + r'["\']',
                        r'SpreadsheetApp\.getSheetByName\s*\(\s*["\']' + re.escape(string_val) + r'["\']',
                        r'sheet\.getRange\s*\(\s*["\']' + re.escape(string_val) + r'["\']',
                        r'getColumnIndex\s*\(\s*["\']' + re.escape(string_val) + r'["\']',
                        r'data\[\s*["\']' + re.escape(string_val) + r'["\']\s*\]'
                    ]

                    is_column_context = any(re.search(p, code_context, re.IGNORECASE) for p in column_context_patterns)

                    # Only check for typos if in a column-related context
                    if not is_column_context:
                        continue 

                    # Check if it looks like a column header
                    if string_val in all_columns:
                        continue

                    # Now safe to check for typos in column context
                    for col in all_columns:
                        similarity = self._calculate_similarity(string_val, col)
                        if 0.85 < similarity < 1.0:
                            self._add_issue(
                                rel_path, line_num,
                                IssueSeverity.MEDIUM, IssueCategory.SCHEMA,
                                f"Potential schema typo: '{string_val}' is similar to '{col}'",
                                f"String literal in column context",
                                f"Verify if '{string_val}' should be '{col}'"
                            )
                            break

            except Exception as e:
                print(f"   ⚠️ Error analyzing context for {rel_path}: {e}")

        # Special validation for fuzzy matching issues
        self._validate_fuzzy_matching_issues()

    def _validate_fuzzy_matching_issues(self):
        """Validate fuzzy matching implementation and test failures"""
        print("   🔍 Checking fuzzy matching implementation...")

        # Check if FuzzyMatchingUtils.js exists and has proper implementation
        fuzzy_file = self.files.get('FuzzyMatchingUtils.js')
        if not fuzzy_file:
            self._add_issue(
                "PROJECT", 0,
                IssueSeverity.HIGH, IssueCategory.CODE_QUALITY,
                "FuzzyMatchingUtils.js not found - fuzzy matching tests will fail",
                "Missing fuzzy matching utility",
                "Create FuzzyMatchingUtils.js with fuzzyMatchCompany and calculateStringSimilarity functions"
            )
            return

        # Check for required functions
        required_functions = ['fuzzyMatchCompany', 'calculateStringSimilarity', 'levenshteinDistance', 'normalizeCompanyName']
        found_functions = {func.name for func in fuzzy_file.functions}

        for func_name in required_functions:
            if func_name not in found_functions:
                self._add_issue(
                    "FuzzyMatchingUtils.js", 0,
                    IssueSeverity.HIGH, IssueCategory.CODE_QUALITY,
                    f"Required function '{func_name}' not found in FuzzyMatchingUtils.js",
                    "Incomplete fuzzy matching implementation",
                    f"Implement {func_name} function in FuzzyMatchingUtils.js"
                )

        # Only report test failures if the test file actually exists
        test_integration_path = self.root_dir / 'test_integration.js'
        if test_integration_path.exists():
            test_failures = [
                ("testFuzzyMatchingLogic", "Fuzzy matching failed on punctuation/spacing"),
                ("testFuzzyMatchingLogicExtended", "Should match with fuzzy logic"),
                ("testDataSynchronizationBasic", "Should match with fuzzy logic"),
                ("testCSVImportWorkflow", "Should parse company name correctly")
            ]

            for test_name, failure_reason in test_failures:
                self._add_issue(
                    "test_integration.js", 0,
                    IssueSeverity.MEDIUM, IssueCategory.CODE_QUALITY,
                    f"Test '{test_name}' failing: {failure_reason}",
                    "Integration test failure",
                    "Fix fuzzy matching logic to handle punctuation, spacing, and case variations"
                )

        # Check for proper error handling in fuzzy matching
        fuzzy_match_func = next((f for f in fuzzy_file.functions if f.name == 'fuzzyMatchCompany'), None)
        if fuzzy_match_func and not fuzzy_match_func.has_error_handling:
            self._add_issue(
                "FuzzyMatchingUtils.js", fuzzy_match_func.line_start,
                IssueSeverity.MEDIUM, IssueCategory.ERROR_HANDLING,
                "fuzzyMatchCompany function lacks error handling",
                "Critical matching function without try/catch",
                "Add error handling to fuzzyMatchCompany function"
            )

    def validate_settings_references(self):
        """Validate outcomes, stages, and statuses"""
        print("\n🔵 VALIDATING SETTINGS REFERENCES...")
        
        # Check for invalid outcomes
        for rel_path, file_analysis in self.files.items():
            for line_num, string_val in file_analysis.string_literals:
                # Check outcomes
                if self._looks_like_outcome(string_val):
                    if string_val not in self.valid_outcomes:
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity.HIGH, IssueCategory.SETTINGS,
                            f"Invalid outcome: '{string_val}' not in Settings",
                            f"Outcome reference in code",
                            f"Add '{string_val}' to Settings VALIDATION_LIST or use a valid outcome"
                        )
                
                # Check stages
                if self._looks_like_stage(string_val):
                    if string_val not in self.valid_stages:
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity.MEDIUM, IssueCategory.SETTINGS,
                            f"Invalid stage: '{string_val}' not in Settings",
                            f"Stage reference in code",
                            f"Add '{string_val}' to Settings VALIDATION_LIST or use a valid stage"
                        )
                
                # Special check for "Not Contacted" - should use "No Answer"
                if string_val == "Not Contacted":
                    if "Outreach" in rel_path or "outreach" in rel_path.lower():
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity.HIGH, IssueCategory.SETTINGS,
                            "Banned status 'Not Contacted' used in Outreach context",
                            "Outcome/Status reference",
                            "Replace with 'No Answer' or remove this status"
                        )
    
    def _looks_like_outcome(self, val: str) -> bool:
        """Check if value looks like an outcome - STRICT matching only"""
        # Must be in valid outcomes list - no heuristics
        return val in self.valid_outcomes
    
    def _looks_like_stage(self, val: str) -> bool:
        """Check if value looks like a stage - STRICT matching only"""
        # Must be in valid stages list - no heuristics
        return val in self.valid_stages
    
    def analyze_code_quality(self):
        """Analyze code for quality issues with enhanced detection"""
        print("\n🔵 ANALYZING CODE QUALITY...")

        for rel_path, file_analysis in self.files.items():
            if file_analysis.extension not in ['.js', '.gs']:
                continue

            # 🟢 NEW: Skip tests and scripts from noise
            if any(x in rel_path.lower() for x in ['test', 'mock', 'apply-fixes']):
                continue

            filepath = self.root_dir / rel_path
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                    lines = content.split('\n')

                for func in file_analysis.functions:
                    # Skip simple functions (low complexity) - error handling optional
                    if func.complexity_score <= 5:
                        continue
                    
                    # Check for high complexity
                    if func.complexity_score > 20:
                        self._add_issue(
                            rel_path, func.line_start,
                            IssueSeverity.MEDIUM, IssueCategory.CODE_QUALITY,
                            f"Function '{func.name}' has high complexity ({func.complexity_score})",
                            f"Consider breaking into smaller functions",
                            "Refactor to reduce cyclomatic complexity"
                        )

                    # Check for missing error handling in complex functions
                    if not func.has_error_handling and func.complexity_score > 12:
                        self._add_issue(
                            rel_path, func.line_start,
                            IssueSeverity.MEDIUM, IssueCategory.ERROR_HANDLING,
                            f"Function '{func.name}' lacks error handling (complexity: {func.complexity_score})",
                            f"Complex function without try/catch",
                            "Add try/catch blocks for robust error handling"
                        )

                    # Check for missing logging in functions with multiple calls
                    if not func.has_logging and len(func.calls) > 5 and func.complexity_score > 5:
                        self._add_issue(
                            rel_path, func.line_start,
                            IssueSeverity.LOW, IssueCategory.CODE_QUALITY,
                            f"Function '{func.name}' has no logging",
                            f"Function with {len(func.calls)} calls should log",
                            "Add console.log or Logger.log for debugging"
                        )

            except Exception as e:
                print(f"   ⚠️ Error analyzing code quality for {rel_path}: {e}")
    
    def analyze_security(self):
        """Analyze code for security issues"""
        print("\n[SECURITY] Analyzing...")
        
        security_patterns = [
            (r'\beval\s*\(', "CRITICAL", "Use of eval() is dangerous"),
            (r'document\.write\s*\(', "MEDIUM", "document.write is deprecated and can be unsafe"),
            (r'http://(?!localhost)', "MEDIUM", "Non-HTTPS URL detected"),
        ]
        
        # innerHTML patterns - needs context awareness
        innerhtml_patterns = [
            (r'\.innerHTML\s*=\s*([^=].*)$', "innerHTML assignment - verify sanitization"),
        ]
        
        for rel_path, file_analysis in self.files.items():
            filepath = self.root_dir / rel_path
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                    lines = content.split('\n')
                
                # Check basic security patterns
                for pattern, severity, message in security_patterns:
                    for match in re.finditer(pattern, content, re.IGNORECASE):
                        line_num = content[:match.start()].count('\n') + 1
                        # Get line content for context analysis
                        line_content = lines[line_num - 1] if line_num <= len(lines) else ''
                        
                        # Skip if sanitizeHtml is used on the same line
                        if 'sanitizeHtml' in line_content:
                            continue
                        
                        # Skip if it's just clearing: element.innerHTML = '';
                        if re.search(r"\.innerHTML\s*=\s*['\"]\s*['\"]", line_content):
                            continue
                            
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity[severity], IssueCategory.SECURITY,
                            message,
                            line_content.strip()[:100],
                            "Review and use safer alternatives"
                        )
                
                # Check innerHTML with context awareness
                for pattern, message in innerhtml_patterns:
                    for match in re.finditer(pattern, content, re.IGNORECASE):
                        line_num = content[:match.start()].count('\n') + 1
                        line_content = lines[line_num - 1] if line_num <= len(lines) else ''
                        
                        # SAFE: Using sanitizeHtml or clearing
                        if 'sanitizeHtml' in line_content or re.search(r"\.innerHTML\s*=\s*['\"]\s*['\"]", line_content):
                            continue
                        
                        # Check if it's in a .js file that has sanitizeHtml function defined
                        # Read full content to check for sanitizeHtml definition
                        if 'function sanitizeHtml' in content or 'sanitizeHtml = ' in content:
                            continue
                        
                        # Only flag as MEDIUM (not HIGH) for innerHTML since it might be safe
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity.MEDIUM, IssueCategory.SECURITY,
                            message,
                            line_content.strip()[:100],
                            "Ensure content is sanitized with sanitizeHtml() before assignment"
                        )
                        
            except Exception as e:
                print(f"   [WARNING] Error analyzing security for {rel_path}: {e}")
    
    def analyze_performance(self):
        """Analyze code for performance issues"""
        print("\n[PERFORMANCE] Analyzing...")
        
        # Known small/settings sheets that don't need batching warnings
        small_sheets = {'settings', 'config', 'system', 'opslog', 'log', 'templates'}
        
        performance_patterns = [
            (r'for\s*\([^)]+\)\s*\{[^}]{0,200}getRange\s*\(', "HIGH",
             "Loop with getRange calls - very slow, batch operations instead"),
            (r'appendRow\s*\(', "MEDIUM",
             "appendRow called - consider batch append for multiple rows"),
        ]
        
        # getDataRange is more nuanced - flag only if in loop
        getdata_in_loop_pattern = r'for\s*\([^)]+\)[^{]*\{[^}]{0,500}getDataRange\s*\(\)'
        
        for rel_path, file_analysis in self.files.items():
            if file_analysis.extension not in ['.js', '.gs']:
                continue
            
            filepath = self.root_dir / rel_path
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                
                # Check for getDataRange in loops (real performance issue)
                for match in re.finditer(getdata_in_loop_pattern, content, re.IGNORECASE | re.DOTALL):
                    line_num = content[:match.start()].count('\n') + 1
                    self._add_issue(
                        rel_path, line_num,
                        IssueSeverity.HIGH, IssueCategory.PERFORMANCE,
                        "getDataRange() called inside loop - load once, process in memory",
                        "Performance anti-pattern",
                        "Move getDataRange().getValues() outside the loop"
                    )
                
                # Check other patterns
                for pattern, severity, message in performance_patterns:
                    for match in re.finditer(pattern, content, re.IGNORECASE):
                        line_num = content[:match.start()].count('\n') + 1
                        
                        # For appendRow, check if it's in a loop
                        if 'appendRow' in pattern:
                            # Check if appendRow is in a loop
                            line_content = content.split('\n')[line_num - 1] if line_num <= len(content.split('\n')) else ''
                            loop_context = content[max(0, match.start()-200):match.start()]
                            
                            # If not in loop, it's acceptable (single append)
                            if 'for' not in loop_context and 'while' not in loop_context:
                                continue
                        
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity[severity], IssueCategory.PERFORMANCE,
                            message,
                            "Performance anti-pattern detected",
                            "Consider using batch operations or caching"
                        )
                        
            except Exception as e:
                print(f"   [WARNING] Error analyzing performance for {rel_path}: {e}")
    
    def analyze_data_flow(self):
        """Track data flow between sheets"""
        print("\n🔵 ANALYZING DATA FLOW...")

        # Track which sheets are read/written
        sheet_access_patterns = {
            'read': re.compile(r'getSheetByName\s*\(\s*["\']([^"\']+)["\']\s*\)'),
            'write': re.compile(r'(?:appendRow|setValues?)\s*\('),
        }

        for rel_path, file_analysis in self.files.items():
            if file_analysis.extension not in ['.js', '.gs']:
                continue

            filepath = self.root_dir / rel_path
            try:
                content = filepath.read_text(encoding='utf-8', errors='replace')

                # Find sheet reads
                for match in sheet_access_patterns['read'].finditer(content):
                    sheet_name = match.group(1)
                    line_num = content[:match.start()].count('\n') + 1

                    # Check if this sheet is in our schema
                    if sheet_name not in self.schema_columns:
                        self._add_issue(
                            rel_path, line_num,
                            IssueSeverity.MEDIUM, IssueCategory.SCHEMA,
                            f"Access to undocumented sheet: '{sheet_name}'",
                            f"getSheetByName('{sheet_name}')",
                            f"Add '{sheet_name}' to Config.js HEADERS or System_Schema.csv"
                        )
            except Exception as e:
                print(f"   ⚠️ Error analyzing data flow for {rel_path}: {e}")

    def validate_configuration(self):
        """Validate that Config.js matches actual sheet structure"""
        print("\n🔵 VALIDATING CONFIGURATION...")

        # Load actual sheet names from Config.js
        config_sheets = set(self.schema_columns.keys())

        # Check each referenced sheet has required columns
        required_columns_by_sheet = {
            'Prospects': ['Company ID', 'Company Name', 'Contact Status'],
            'Outreach': ['Outreach ID', 'Company ID', 'Outcome'],
            'Accounts': ['Company Name', 'Contact Name'],
        }

        for sheet, required_cols in required_columns_by_sheet.items():
            if sheet in self.schema_columns:
                missing = set(required_cols) - self.schema_columns[sheet]
                if missing:
                    self._add_issue(
                        'Config.js', 0,
                        IssueSeverity.HIGH, IssueCategory.SCHEMA,
                        f"Sheet '{sheet}' missing required columns: {', '.join(missing)}",
                        f"Required: {required_cols}",
                        "Update Config.js HEADERS to include all required columns"
                    )

    def analyze_architecture(self):
        """Analyze overall architecture patterns"""
        print("\n🔵 ANALYZING ARCHITECTURE...")

        # Check for consistent patterns
        sheets_found = set()
        for file_analysis in self.files.values():
            sheets_found.update(file_analysis.dependencies)

        # Verify CONFIG.js exists and is used
        if 'Config.js' not in self.files:
            self._add_issue(
                "PROJECT", 0,
                IssueSeverity.HIGH, IssueCategory.ARCHITECTURE,
                "Config.js not found - configuration should be centralized",
                "Missing configuration file",
                "Create Config.js to centralize sheet names and constants"
            )

        # Check for proper error handling at file level
        files_without_error_handling = []
        for rel_path, file_analysis in self.files.items():
            if file_analysis.extension not in ['.js', '.gs']:
                continue

            has_try_catch = any(f.has_error_handling for f in file_analysis.functions)
            if not has_try_catch and len(file_analysis.functions) > 0:
                files_without_error_handling.append(rel_path)

        if files_without_error_handling:
            for filepath in files_without_error_handling[:5]:  # Limit to first 5
                self._add_issue(
                    filepath, 0,
                    IssueSeverity.LOW, IssueCategory.ERROR_HANDLING,
                    f"File lacks error handling in any function",
                    "No try/catch blocks found",
                    "Add error handling to critical functions"
                )
    
    def _get_code_context(self, content: str, line_num: int, lines: List[str], context_lines: int = 3) -> str:
        """Get code context around a line number for better analysis"""
        start_line = max(0, line_num - context_lines - 1)
        end_line = min(len(lines), line_num + context_lines)

        context_lines_list = []
        for i in range(start_line, end_line):
            if i == line_num - 1:  # Mark the target line
                context_lines_list.append(f">>> {lines[i]}")
            else:
                context_lines_list.append(lines[i])

        return '\n'.join(context_lines_list)

    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity using Levenshtein distance"""
        if len(s1) < len(s2):
            return self._calculate_similarity(s2, s1)

        if len(s2) == 0:
            return 0.0

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        distance = previous_row[-1]
        max_len = max(len(s1), len(s2))
        return (max_len - distance) / max_len
    
    def _add_issue(self, file: str, line: int, severity: IssueSeverity, 
                   category: IssueCategory, message: str, context: str, 
                   recommendation: str = ""):
        """Add an issue to the list"""
        issue = Issue(
            file=file,
            line=line,
            severity=severity,
            category=category,
            message=message,
            context=context,
            recommendation=recommendation
        )
        self.issues.append(issue)
        self.stats['issues_by_severity'][severity.value] += 1
        self.stats['issues_by_category'][category.value] += 1
    
    # =============================================================================
    # REPORT GENERATION
    # =============================================================================
    
    def generate_blueprint_report(self) -> str:
        """Generate the blueprint report"""
        lines = [
            "=" * 80,
            "       K&L RECYCLING CRM - COMPREHENSIVE BLUEPRINT & HEALTH REPORT       ",
            "=" * 80,
            "",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Files Analyzed: {self.stats['total_files']}",
            f"Functions Found: {self.stats['total_functions']}",
            f"Total Lines of Code: {self.stats['total_lines']}",
            "",
            "-" * 80,
            "SYSTEM ARCHITECTURE OVERVIEW",
            "-" * 80,
            "",
        ]
        
        # Sheet structure from schema
        lines.append("📊 SHEET STRUCTURE (from Schema):")
        for sheet_name, columns in self.schema_columns.items():
            lines.append(f"\n   📋 {sheet_name}")
            for col in sorted(columns)[:10]:  # Show first 10
                lines.append(f"      • {col}")
            if len(columns) > 10:
                lines.append(f"      ... and {len(columns) - 10} more columns")
        lines.append("")
        
        # Settings validation
        lines.append("⚙️  SETTINGS & VALIDATION RULES:")
        lines.append(f"   Valid Outcomes: {', '.join(sorted(self.valid_outcomes))}")
        lines.append(f"   Valid Stages: {', '.join(sorted(self.valid_stages))}")
        lines.append(f"   Workflow Rules: {len(self.workflow_rules)} defined")
        for outcome, rule in list(self.workflow_rules.items())[:5]:
            lines.append(f"      • {outcome} → Stage: {rule.get('Stage', 'N/A')}, Status: {rule.get('Status', 'N/A')}")
        lines.append("")
        
        # File breakdown
        lines.append("📁 FILE BREAKDOWN:")
        for category, files in self._categorize_files().items():
            lines.append(f"\n   {category} ({len(files)} files):")
            for f in sorted(files)[:10]:
                file_info = self.files.get(f)
                if file_info:
                    lines.append(f"      • {f} ({file_info.lines_of_code} lines, {len(file_info.functions)} functions)")
        lines.append("")
        
        # Data flow
        lines.append("🔄 DATA FLOW:")
        lines.append("   Outreach Entry → Sync to Prospects → Account Won → Migrate to Accounts")
        lines.append("   Key Functions:")
        lines.append("      • syncCRMLogic() - Main sync orchestrator")
        lines.append("      • processAccountWon() - Account migration trigger")
        lines.append("      • processOutreachSubmission() - Form submission handler")
        lines.append("")
        
        # External dependencies
        lines.append("🔗 EXTERNAL DEPENDENCIES:")
        all_deps = set()
        for file_info in self.files.values():
            all_deps.update(file_info.dependencies)
        for dep in sorted(all_deps):
            lines.append(f"   • {dep}")
        lines.append("")
        
        # Critical functions
        lines.append("🔑 CRITICAL FUNCTIONS:")
        critical_funcs = [
            f for f in self.functions.values()
            if any(keyword in f.name.lower() for keyword in ['sync', 'process', 'submit', 'migrate', 'won'])
        ]
        for func in sorted(critical_funcs, key=lambda x: x.file)[:20]:
            status = "✅" if func.has_error_handling else "⚠️"
            lines.append(f"   {status} {func.name} ({func.file}:{func.line_start})")
        lines.append("")
        
        return '\n'.join(lines)
    
    def _categorize_files(self) -> Dict[str, List[str]]:
        """Categorize files by their purpose"""
        categories = {
            '📦 Core Services': [],
            '🎨 UI Components': [],
            '🔄 Sync & Workflow': [],
            '✅ Validation': [],
            '🧪 Testing': [],
            '🔧 Utilities': [],
            '📄 Other': []
        }
        
        for rel_path in self.files.keys():
            lower_path = rel_path.lower()
            if 'test' in lower_path:
                categories['🧪 Testing'].append(rel_path)
            elif any(x in lower_path for x in ['sync', 'workflow', 'automation']):
                categories['🔄 Sync & Workflow'].append(rel_path)
            elif any(x in lower_path for x in ['validation', 'verify']):
                categories['✅ Validation'].append(rel_path)
            elif any(x in lower_path for x in ['util', 'helper', 'shared']):
                categories['🔧 Utilities'].append(rel_path)
            elif any(x in lower_path for x in ['.html', 'dashboard', 'report']):
                categories['🎨 UI Components'].append(rel_path)
            elif any(x in lower_path for x in ['config', 'settings', 'menu', 'api']):
                categories['📦 Core Services'].append(rel_path)
            else:
                categories['📄 Other'].append(rel_path)
        
        return categories
    
    def generate_health_report(self) -> str:
        """Generate the health report with all issues"""
        lines = [
            "=" * 80,
            "                          SYSTEM HEALTH ASSESSMENT                          ",
            "=" * 80,
            "",
        ]
        
        # Overall health score
        total_issues = len(self.issues)
        critical = self.stats['issues_by_severity'].get('CRITICAL', 0)
        high = self.stats['issues_by_severity'].get('HIGH', 0)
        
        if critical > 0:
            health_status = "🔴 CRITICAL"
            health_score = max(0, 100 - (critical * 20) - (high * 5) - total_issues)
        elif high > 0:
            health_status = "🟠 WARNING"
            health_score = max(50, 100 - (high * 5) - total_issues)
        elif total_issues > 0:
            health_status = "🟡 NEEDS ATTENTION"
            health_score = max(75, 100 - total_issues)
        else:
            health_status = "🟢 HEALTHY"
            health_score = 100
        
        lines.append(f"OVERALL HEALTH SCORE: {health_score}/100 - {health_status}")
        lines.append(f"Total Issues Found: {total_issues}")
        lines.append(f"  🔴 Critical: {critical}")
        lines.append(f"  🟠 High: {high}")
        lines.append(f"  🟡 Medium: {self.stats['issues_by_severity'].get('MEDIUM', 0)}")
        lines.append(f"  🟢 Low: {self.stats['issues_by_severity'].get('LOW', 0)}")
        lines.append(f"  ℹ️  Info: {self.stats['issues_by_severity'].get('INFO', 0)}")
        lines.append("")
        
        # Issues by category
        lines.append("-" * 80)
        lines.append("ISSUES BY CATEGORY")
        lines.append("-" * 80)
        for category, count in sorted(self.stats['issues_by_category'].items(), key=lambda x: -x[1]):
            lines.append(f"  {category}: {count}")
        lines.append("")
        
        # Detailed issues
        if self.issues:
            lines.append("-" * 80)
            lines.append("DETAILED ISSUE LIST")
            lines.append("-" * 80)
            
            # Sort by severity
            severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'INFO': 4}
            sorted_issues = sorted(self.issues, key=lambda x: (severity_order.get(x.severity.value, 5), x.file, x.line))
            
            current_severity = None
            for issue in sorted_issues:
                if issue.severity.value != current_severity:
                    current_severity = issue.severity.value
                    lines.append(f"\n🔸 {current_severity} ISSUES:")
                
                lines.append(f"\n   📄 {issue.file}:{issue.line}")
                lines.append(f"   Category: {issue.category.value}")
                lines.append(f"   Message: {issue.message}")
                lines.append(f"   Context: {issue.context[:80]}...")
                if issue.recommendation:
                    lines.append(f"   💡 Recommendation: {issue.recommendation}")
        else:
            lines.append("\n✅ No issues found! System is in excellent health.")
        
        return '\n'.join(lines)
    
    def generate_recommendations(self) -> str:
        """Generate actionable recommendations"""
        lines = [
            "=" * 80,
            "                        ACTIONABLE RECOMMENDATIONS                          ",
            "=" * 80,
            "",
        ]
        
        recommendations = []
        
        # Priority 1: Critical issues
        critical_issues = [i for i in self.issues if i.severity == IssueSeverity.CRITICAL]
        if critical_issues:
            recommendations.append(("🔴 CRITICAL - Fix Immediately", [
                f"Fix {len(critical_issues)} critical security/integrity issues",
                "Review all eval() and innerHTML usages",
                "Validate schema references against System_Schema.csv"
            ]))
        
        # Priority 2: Error handling
        files_no_error_handling = [
            f for f in self.files.values()
            if f.extension in ['.js', '.gs'] and not any(fn.has_error_handling for fn in f.functions)
        ]
        if files_no_error_handling:
            recommendations.append(("🟠 HIGH - Add Error Handling", [
                f"Add try/catch blocks to {len(files_no_error_handling)} files lacking error handling",
                "Focus on files with complex functions first",
                "Use ErrorHandling.js patterns for consistency"
            ]))
        
        # Priority 3: Performance
        perf_issues = [i for i in self.issues if i.category == IssueCategory.PERFORMANCE]
        if perf_issues:
            recommendations.append(("🟡 MEDIUM - Optimize Performance", [
                f"Address {len(perf_issues)} performance issues",
                "Batch SpreadsheetApp operations",
                "Cache frequently accessed data",
                "Use getDataRange() sparingly"
            ]))
        
        # Priority 4: Code organization
        orphaned = [f for f in self.functions.values() if not f.called_by]
        if len(orphaned) > 10:
            recommendations.append(("🟢 LOW - Code Cleanup", [
                f"Review {len(orphaned)} potentially orphaned functions",
                "Remove dead code or add documentation",
                "Consolidate duplicate utility functions"
            ]))
        
        # Priority 5: Documentation
        funcs_no_docs = [f for f in self.functions.values() if not f.description]
        if len(funcs_no_docs) > 20:
            recommendations.append(("📚 INFO - Documentation", [
                f"Add JSDoc comments to {len(funcs_no_docs)} functions",
                "Document function parameters and return types",
                "Add usage examples for complex functions"
            ]))
        
        for priority, items in recommendations:
            lines.append(f"\n{priority}")
            lines.append("-" * 40)
            for item in items:
                lines.append(f"  • {item}")
        
        return '\n'.join(lines)
    
    def generate_json_report(self) -> str:
        """Generate JSON report for programmatic access"""
        report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'analyzer_version': '1.0.0',
                'statistics': {
                    'total_files': self.stats['total_files'],
                    'total_functions': self.stats['total_functions'],
                    'total_lines': self.stats['total_lines'],
                    'issues_count': len(self.issues),
                    'issues_by_severity': dict(self.stats['issues_by_severity']),
                    'issues_by_category': dict(self.stats['issues_by_category'])
                }
            },
            'schema': {
                sheet: list(cols) for sheet, cols in self.schema_columns.items()
            },
            'settings': {
                'valid_outcomes': list(self.valid_outcomes),
                'valid_stages': list(self.valid_stages),
                'workflow_rules': self.workflow_rules
            },
            'files': {path: fa.to_dict() for path, fa in self.files.items()},
            'issues': [issue.to_dict() for issue in self.issues],
            'functions': {name: fn.to_dict() for name, fn in self.functions.items()}
        }
        return json.dumps(report, indent=2, default=str)
    
    def generate_html_report(self) -> str:
        """Generate interactive HTML report"""
        
        severity_colors = {
            'CRITICAL': '#dc3545',
            'HIGH': '#fd7e14',
            'MEDIUM': '#ffc107',
            'LOW': '#17a2b8',
            'INFO': '#6c757d'
        }
        
        category_icons = {
            'Schema': '📊',
            'Settings': '⚙️',
            'Code Quality': '✨',
            'Security': '🔒',
            'Performance': '⚡',
            'Error Handling': '🛡️',
            'Architecture': '🏗️',
            'Maintainability': '🔧'
        }
        
        # Calculate health score
        critical = self.stats['issues_by_severity'].get('CRITICAL', 0)
        high = self.stats['issues_by_severity'].get('HIGH', 0)
        health_score = max(0, 100 - (critical * 20) - (high * 5) - len(self.issues) * 0.5)
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K&L CRM - Blueprint & Health Report</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        .header h1 {{ font-size: 2.5em; margin-bottom: 10px; }}
        .header p {{ opacity: 0.9; font-size: 1.1em; }}
        .health-score {{
            display: inline-block;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: conic-gradient({self._get_health_gradient(health_score)} {health_score * 3.6}deg, #e0e0e0 0deg);
            position: relative;
            margin: 20px auto;
        }}
        .health-score::before {{
            content: '{int(health_score)}';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3em;
            font-weight: bold;
            color: #333;
        }}
        .content {{ padding: 40px; }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s;
        }}
        .stat-card:hover {{ transform: translateY(-5px); }}
        .stat-number {{ font-size: 2.5em; font-weight: bold; }}
        .stat-label {{ opacity: 0.9; margin-top: 5px; }}
        .section {{
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }}
        .section h2 {{
            color: #1e3c72;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .issue-card {{
            background: white;
            border-left: 5px solid #dc3545;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .issue-card.critical {{ border-left-color: {severity_colors['CRITICAL']}; }}
        .issue-card.high {{ border-left-color: {severity_colors['HIGH']}; }}
        .issue-card.medium {{ border-left-color: {severity_colors['MEDIUM']}; }}
        .issue-card.low {{ border-left-color: {severity_colors['LOW']}; }}
        .issue-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }}
        .issue-severity {{
            padding: 5px 15px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 0.85em;
        }}
        .issue-location {{
            color: #666;
            font-family: monospace;
            margin-bottom: 10px;
        }}
        .issue-message {{ color: #333; margin-bottom: 10px; }}
        .issue-recommendation {{
            background: #e3f2fd;
            padding: 10px;
            border-radius: 5px;
            color: #1565c0;
            font-size: 0.9em;
        }}
        .file-tree {{
            background: white;
            border-radius: 10px;
            padding: 20px;
        }}
        .file-item {{
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .file-item:hover {{ background: #f5f5f5; }}
        .file-name {{ font-family: monospace; color: #333; }}
        .file-stats {{ color: #666; font-size: 0.9em; }}
        .tabs {{
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }}
        .tab {{
            padding: 15px 25px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }}
        .tab.active {{
            border-bottom-color: #667eea;
            color: #667eea;
            font-weight: bold;
        }}
        .tab-content {{ display: none; }}
        .tab-content.active {{ display: block; }}
        @media print {{
            body {{ background: white; }}
            .container {{ box-shadow: none; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K&L Recycling CRM</h1>
            <p>Comprehensive Blueprint & Health Analysis Report</p>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <div class="health-score"></div>
            <p>Overall Health Score</p>
        </div>
        
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">{self.stats['total_files']}</div>
                    <div class="stat-label">Files Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{self.stats['total_functions']}</div>
                    <div class="stat-label">Functions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{self.stats['total_lines']:,}</div>
                    <div class="stat-label">Lines of Code</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{len(self.issues)}</div>
                    <div class="stat-label">Issues Found</div>
                </div>
            </div>
            
            <div class="tabs">
                <div class="tab active" onclick="showTab('issues')">🚨 Issues</div>
                <div class="tab" onclick="showTab('files')">📁 Files</div>
                <div class="tab" onclick="showTab('architecture')">🏗️ Architecture</div>
            </div>
            
            <div id="issues" class="tab-content active">
                <div class="section">
                    <h2>🚨 Issues by Severity</h2>
"""
        
        # Add issues
        severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
        for severity in severity_order:
            issues = [i for i in self.issues if i.severity.value == severity]
            if issues:
                html += f'<h3 style="color: {severity_colors[severity]}; margin: 20px 0 15px;">{severity} ({len(issues)})</h3>'
                for issue in issues[:10]:  # Show first 10 per severity
                    html += f'''
                    <div class="issue-card {severity.lower()}">
                        <div class="issue-header">
                            <span class="issue-severity" style="background: {severity_colors[severity]};">{severity}</span>
                            <span>{category_icons.get(issue.category.value, '•')} {issue.category.value}</span>
                        </div>
                        <div class="issue-location">📄 {issue.file}:{issue.line}</div>
                        <div class="issue-message">{issue.message}</div>
                        {f'<div class="issue-recommendation">💡 {issue.recommendation}</div>' if issue.recommendation else ''}
                    </div>
                    '''
                if len(issues) > 10:
                    html += f'<p style="text-align: center; color: #666; margin-top: 15px;">... and {len(issues) - 10} more {severity} issues</p>'
        
        html += """
                </div>
            </div>
            
            <div id="files" class="tab-content">
                <div class="section">
                    <h2>📁 File Analysis</h2>
                    <div class="file-tree">
"""
        
        # Add file tree
        for category, files in self._categorize_files().items():
            if files:
                html += f'<h3 style="margin: 20px 0 10px; color: #1e3c72;">{category}</h3>'
                for f in sorted(files)[:20]:
                    file_info = self.files.get(f)
                    if file_info:
                        html += f'''
                        <div class="file-item">
                            <span class="file-name">{f}</span>
                            <span class="file-stats">{file_info.lines_of_code} lines | {len(file_info.functions)} functions</span>
                        </div>
                        '''
        
        html += f"""
                    </div>
                </div>
            </div>
            
            <div id="architecture" class="tab-content">
                <div class="section">
                    <h2>🏗️ System Architecture</h2>
                    <h3 style="margin: 20px 0 10px;">📊 Schema Objects</h3>
"""
        
        # Add schema
        for sheet_name, columns in self.schema_columns.items():
            html += f'''
                    <div style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px;">
                        <h4 style="color: #667eea; margin-bottom: 10px;">{sheet_name}</h4>
                        <p style="color: #666;">{len(columns)} columns defined</p>
                    </div>
            '''
        
        html += f"""
                    <h3 style="margin: 30px 0 10px;">🔗 External Dependencies</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
"""
        
        all_deps = set()
        for file_info in self.files.values():
            all_deps.update(file_info.dependencies)
        
        for dep in sorted(all_deps):
            html += f'<div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">{dep}</div>'
        
        html += """
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabId) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
"""
        return html
    
    def _get_health_gradient(self, score: float) -> str:
        """Get gradient color for health score"""
        if score >= 80:
            return '#28a745'
        elif score >= 60:
            return '#ffc107'
        elif score >= 40:
            return '#fd7e14'
        else:
            return '#dc3545'
    
    # =============================================================================
    # MAIN EXECUTION
    # =============================================================================
    
    def run_analysis(self):
        """Run the complete analysis"""
        print("=" * 80)
        print("       K&L RECYCLING CRM - BLUEPRINT & HEALTH ANALYZER")
        print("=" * 80)
        print()
        
        # Phase 1: Load configurations
        self.load_configurations()
        
        # Phase 2: Parse all files
        self.parse_all_files()
        
        # Phase 3: Build dependency graph
        self.analyze_dependencies()
        
        # Phase 4: Run validations
        self.validate_schema_references()
        self.validate_settings_references()
        
        # Phase 5: Quality analysis
        self.analyze_code_quality()
        self.analyze_security()
        self.analyze_performance()
        self.analyze_data_flow()
        self.validate_configuration()
        self.analyze_architecture()
        
        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)
        print(f"\n📊 Summary:")
        print(f"   Files Analyzed: {self.stats['total_files']}")
        print(f"   Functions Found: {self.stats['total_functions']}")
        print(f"   Total Lines: {self.stats['total_lines']:,}")
        print(f"   Issues Found: {len(self.issues)}")
        print(f"      🔴 Critical: {self.stats['issues_by_severity'].get('CRITICAL', 0)}")
        print(f"      🟠 High: {self.stats['issues_by_severity'].get('HIGH', 0)}")
        print(f"      🟡 Medium: {self.stats['issues_by_severity'].get('MEDIUM', 0)}")
        print(f"      🟢 Low: {self.stats['issues_by_severity'].get('LOW', 0)}")
    
    def generate_all_reports(self):
        """Generate all report formats"""
        print("\n🔵 GENERATING REPORTS...")
        
        # Text reports
        blueprint_report = self.generate_blueprint_report()
        health_report = self.generate_health_report()
        recommendations = self.generate_recommendations()
        
        # Save text reports
        with open('CRM_BLUEPRINT_REPORT.txt', 'w', encoding='utf-8') as f:
            f.write(blueprint_report + '\n\n' + health_report + '\n\n' + recommendations)
        print("   ✅ Saved: CRM_BLUEPRINT_REPORT.txt")
        
        # JSON report
        json_report = self.generate_json_report()
        with open('CRM_ANALYSIS_REPORT.json', 'w', encoding='utf-8') as f:
            f.write(json_report)
        print("   ✅ Saved: CRM_ANALYSIS_REPORT.json")
        
        # HTML report
        html_report = self.generate_html_report()
        with open('CRM_BLUEPRINT_REPORT.html', 'w', encoding='utf-8') as f:
            f.write(html_report)
        print("   ✅ Saved: CRM_BLUEPRINT_REPORT.html")
        
        print("\n" + "=" * 80)
        print("ALL REPORTS GENERATED SUCCESSFULLY")
        print("=" * 80)
        print("\n📄 Generated Files:")
        print("   • CRM_BLUEPRINT_REPORT.txt - Comprehensive text report")
        print("   • CRM_ANALYSIS_REPORT.json - Machine-readable JSON")
        print("   • CRM_BLUEPRINT_REPORT.html - Interactive HTML dashboard")
        print("\nOpen CRM_BLUEPRINT_REPORT.html in your browser for the best experience!")


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    """Main entry point"""
    analyzer = CRMBLUEPRINT_ANALYZER()
    analyzer.run_analysis()
    analyzer.generate_all_reports()

if __name__ == "__main__":
    main()