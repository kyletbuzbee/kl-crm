# AGENTS.md - K&L Recycling CRM

Agentic coding guidelines for the K&L Recycling CRM - a Google Apps Script-based CRM for prospect management and outreach tracking.

## Project Overview

- **Platform**: Google Apps Script (V8 Runtime)
- **Database**: Google Sheets
- **Frontend**: HTML Service (Google Apps Script)
- **Deployment**: clasp (Command Line Apps Script Projects)
- **Architecture**: 4-Tier Service-Oriented Architecture

## Build & Deployment Commands

```bash
# Deploy to Google Apps Script
clasp push

# Open project in browser
clasp open

# Pull remote changes (use with caution)
clasp pull

# Check clasp status
clasp status

# Run in Apps Script console (use gas-run extension or manual)
# Tests run via GAS web IDE or HTML service
```

## Testing Commands

Tests are Google Apps Script functions, run via the Apps Script editor or HTML service:

```javascript
// Run all test suites
runAllTests()

// Run quick smoke tests
runQuickTests()

// Run a single test function
UnitTests_Core.testConfigSchemaIntegrity()
IntegrationTests_Prospects.testCSVParseWithHeaders()
OutreachProspectsLogicTests.testCompanyIdLinking()

// Count test coverage
countTests()

// Available test suites:
// - UnitTests_Core (Config, SharedUtils)
// - IntegrationTests_Prospects (ProspectFunctions)
// - OutreachProspectsLogicTests (Outreach-Prospects mapping)
// - WorkflowTests (end-to-end workflows)
// - ValidationTests (data validation)
```

### Creating New Tests

Add tests to existing suites in `test_outreach_prospects_logic.js` or create new test files:

```javascript
var MyTests = {
  testMyFeature: function() {
    TestRunner.assert.equals(actual, expected, "description");
    TestRunner.assert.isTrue(condition, "description");
    TestRunner.assert.notNull(value, "description");
  }
};
```

## Code Style Guidelines

### JavaScript Style

- **Variables**: Use `var` for GAS compatibility (not `let`/`const`)
- **Functions**: Use traditional functions, not arrow functions for GAS
- **Quotes**: Single quotes for strings
- **Indentation**: 2 spaces
- **Line length**: 100 characters max
- **Comments**: JSDoc for public APIs, inline for complex logic

### Naming Conventions

- **Variables/Functions**: camelCase (`getSafeSheetData`, `companyId`)
- **Constants**: UPPER_SNAKE_CASE (`CONFIG`, `SHEET_OUTREACH`)
- **Object Names**: PascalCase (`SharedUtils`, `SchemaNormalizer`)
- **Test Suites**: `Tests_` or `*Tests` suffix (`UnitTests_Core`, `OutreachProspectsLogicTests`)
- **Test Methods**: `test` prefix (`testCompanyIdLinking`)
- **Private Methods**: Leading underscore (`_internalHelper`)

### Imports & Dependencies

- No ES6 imports - GAS uses global scope
- Load order matters: Config.js → SharedUtils.js → SchemaNormalizer.js → Business Logic
- Check dependencies exist before use:
  ```javascript
  if (typeof SharedUtils === 'undefined') {
    throw new Error('SharedUtils not loaded');
  }
  ```

### Error Handling

All service functions MUST return standardized result objects:

```javascript
// Success
return { success: true, data: resultData, error: null };

// Failure
return { success: false, data: null, error: "Descriptive error message" };

// Try-catch pattern
try {
  var result = riskyOperation();
  return { success: true, data: result, error: null };
} catch (e) {
  console.error('Operation failed:', e.message);
  return { success: false, data: null, error: e.message };
}
```

### Configuration & Constants

- **NEVER** use hardcoded strings for sheet names, headers, or magic numbers
- Always use `CONFIG` object from `Config.js`:
  ```javascript
  // CORRECT
  var sheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
  var headers = CONFIG.HEADERS.OUTREACH;
  
  // INCORRECT
  var sheet = ss.getSheetByName('Outreach'); // Magic string!
  ```

### Spreadsheet Performance

- **Batch operations ONLY** - never use `getValue()`/`setValue()` in loops
- Use `getValues()`/`setValues()` for bulk I/O
- Use `SharedUtils.getSafeSheetData()` for safe data access
- Process in chunks to avoid 6-minute timeout

```javascript
// CORRECT - Batch operation
var values = range.getValues();
for (var i = 0; i < values.length; i++) {
  values[i][0] = transform(values[i][0]);
}
range.setValues(values);

// INCORRECT - Slow loop
for (var i = 0; i < rows; i++) {
  sheet.getRange(i + 1, 1).setValue(transform(sheet.getRange(i + 1, 1).getValue()));
}
```

### Data Access Patterns

```javascript
// Always use safe data access
var data = SharedUtils.getSafeSheetData(sheetName);
// Returns: [{ 'Company ID': 'CID-001', 'Company Name': 'Acme', _rowIndex: 2 }, ...]

// ID-based lookups (preferred)
var prospect = SharedUtils.findById(prospects, 'Company ID', 'CID-001');

// Date formatting (timezone-safe)
var formatted = SharedUtils.formatDate(new Date());
```

### Date Handling

- Always use `SharedUtils.formatDate()` for consistent formatting
- Timezone: `America/Chicago` (set in `appsscript.json`)
- Date format: `MM/dd/yyyy` (as configured in CONFIG)

## Architecture (4-Tier SOA)

Maintain strict separation of concerns:

| Tier | Purpose | Key Files |
|------|---------|-----------|
| **Tier 1** | Core Engine | `Config.js`, `SharedUtils.js`, `SchemaNormalizer.js` |
| **Tier 2** | Business Services | `ProspectFunctions.js`, `OutreachFunctions.js`, `AccountFunction.js` |
| **Tier 3** | Workflow & Automation | `Sync.js`, `PipelineService.js`, `WorkflowAutomationService.js` |
| **Tier 4** | User Interface | `CRM_Suite.html`, `DashboardBackend.js`, `MenuFunctions.js` |

### Cross-Tier Rules

- Tier 4 (UI) NEVER calls Tier 1 (Core) directly - go through Tier 2
- Tier 2 (Business) NEVER manipulates `SpreadsheetApp` without checking access
- Tier 1 (Core) NEVER contains business logic

## Critical Business Logic

### Outreach → Prospects Sync

When creating/updating Outreach records, the system must sync to Prospects:

```javascript
// Key fields synced:
// - Last Outreach Date ← Visit Date
// - Last Outcome ← Outcome
// - Contact Status ← derived from Outcome
// - Days Since Last Contact ← calculated
```

### Contact Status Mapping

| Outreach Outcome | Contact Status |
|-----------------|----------------|
| Account Won | Active |
| Interested (Hot) | Interested (Hot) |
| Interested (Warm) | Interested (Warm) |
| Not Interested | Disqualified |
| Disqualified | Disqualified |
| No Answer | Cold |
| Initial Contact | Interested (Warm) |
| Follow-Up | Interested (Warm) |

## Testing Requirements

Every change MUST be tested against:

1. **Empty Sheet Case**: What happens with no data?
2. **Malformed Input**: Invalid dates, null required fields
3. **Timeout Case**: GAS 6-minute execution limit
4. **Regression**: Run existing tests in `test_outreach_prospects_logic.js`

### Test-First Development

For bug fixes:
1. Write a test that reproduces the failure
2. Verify it fails
3. Apply the fix
4. Verify test passes
5. Check against all 4 scenarios above

## Prohibited Practices

- Magic strings for data keys or sheet names
- Direct `SpreadsheetApp` manipulation without access checks
- UI logic mixed with business service logic
- Row index reliance for long-term storage (use IDs)
- `let`/`const` or arrow functions (GAS V8 compatibility)
- `getValue()`/`setValue()` in loops

## Key Files Reference

| File | Purpose |
|------|---------|
| `Config.js` | Sheet names, headers, constants |
| `SharedUtils.js` | Safe data access, ID generation, date handling |
| `SchemaNormalizer.js` | Field name normalization |
| `system-schema.json` | Master data model |
| `ProspectFunctions.js` | Prospect business logic |
| `OutreachFunctions.js` | Outreach business logic |
| `Sync.js` | Outreach → Prospects sync |
| `MenuFunctions.js` | UI menu handlers |
| `test_outreach_prospects_logic.js` | Primary test suite |

## Deployment Checklist

Before `clasp push`:
- [ ] Tests pass: `runQuickTests()`
- [ ] No hardcoded strings added
- [ ] Batch operations used for sheet I/O
- [ ] Standardized return objects used
- [ ] Console logs added for debugging
- [ ] Error handling covers edge cases

## Project-Specific Rules from .clinerules/

- **Test-First**: Features not finished without tests (from `global-test-oracle.md`)
- **4-Tier SOA**: Strict architectural separation enforced
- **Config-First**: All constants from `CONFIG` object
- **Batch Operations**: No single-cell operations in loops
- **Schema-Driven**: Use `SchemaNormalizer` for field access

---

Last updated: March 2026
