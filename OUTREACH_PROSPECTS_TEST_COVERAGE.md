# Outreach-Prospects Logic & Mapping Test Coverage

## Overview
This document describes the comprehensive test coverage for the critical Outreach-Prospects logic flow in the K&L CRM system.

## Test File: `test_outreach_prospects_logic.js`

### Test Coverage Areas

#### 1. **Company ID Linking** (`testCompanyIdLinking`)
- Verifies that Company ID is the primary key linking Outreach and Prospects
- Ensures Company Name consistency between tables
- Tests foreign key relationship integrity

#### 2. **Last Outreach Date Sync** (`testLastOutreachDateSync`)
- Tests automatic sync of Visit Date from Outreach to Last Outreach Date in Prospects
- Verifies Last Outcome field synchronization
- Ensures data consistency after each outreach activity

#### 3. **Contact Status Updates** (`testContactStatusUpdate`)
Maps Outreach Outcome → Prospect Contact Status:
- `Account Won` → `Won`
- `Interested (Hot)` → `Interested (Hot)`
- `Interested (Warm)` → `Interested (Warm)`
- `Not Interested` → `Disqualified`
- `Disqualified` → `Disqualified`
- `No Answer` → `Cold`
- `Initial Contact` → `Interested (Warm)`
- `Follow-Up` → `Interested (Warm)`

#### 4. **Stage Mapping** (`testStageMapping`)
Maps Outreach Outcome → Stage:
- `Account Won` → `Won`
- `Interested (Hot)` → `Nurture`
- `Interested (Warm)` → `Nurture`
- `Not Interested` → `Lost`
- `Disqualified` → `Lost`
- `No Answer` → `Outreach`
- `Initial Contact` → `Outreach`
- `Follow-Up` → `Nurture`

#### 5. **Days Since Last Contact** (`testDaysSinceLastContactCalculation`)
- Calculates days between today and Last Outreach Date
- Tests proper date arithmetic
- Verifies string storage format in Prospects table

#### 6. **Next Steps Due Date** (`testNextStepsDueDateCalculation`)
Tests workflow rule intervals:
- `Account Won`: 1 day
- `Interested (Hot)`: 7 days
- `Interested (Warm)`: 14 days
- `Initial Contact`: 30 days
- `No Answer`: 3 days
- `Not Interested`: 180 days
- `Disqualified`: 0 days
- `Follow-Up`: 14 days

#### 7. **Urgency Band Calculation** (`testUrgencyBandCalculation`)
Maps days until due → Urgency Band:
- Overdue (< 0 days): Score 150
- High (0-7 days): Score 115
- Medium (8-30 days): Score 75
- Low (> 30 days): Score 25

#### 8. **Priority Score Calculation** (`testPriorityScoreCalculation`)
- Industry base scores (Metal Fabrication: 90, Manufacturing: 75, etc.)
- Stale prospect penalty (30% reduction if > 60 days)
- Urgency multiplier integration

#### 9. **Account Won Conversion** (`testAccountWonConversion`)
- Tests complete conversion workflow
- Verifies status changes: `Interested (Hot)` → `Won`
- Confirms Stage = `Won`, Status = `Active`
- Validates data migration readiness

#### 10. **Follow-Up Actions** (`testFollowUpActionDetermination`)
Maps Outcome → Next Action:
- `Account Won` → `Onboard Account`
- `Interested (Hot)` → `Send pricing`
- `Interested (Warm)` → `General follow`
- `No Answer` → `Try again`
- `Not Interested` → `See Notes`
- `Disqualified` → `See Notes`
- `Initial Contact` → `Send pricing`
- `Follow-Up` → `General follow`

#### 11. **Competitor Tracking** (`testCompetitorTracking`)
- Validates competitor field for lost deals
- Tests valid competitor values: AIM, Tyler Iron, Huntwell, Other, None
- Ensures competitor is recorded when Outcome = Not Interested/Disqualified

#### 12. **Contact Type Tracking** (`testContactTypeTracking`)
- Tests valid contact types: Visit, Phone, Email
- Verifies default type is 'Visit'
- Validates contact method documentation

#### 13. **Data Integrity** (`testDataIntegrity`)
- Tests multiple outreach records linking to single prospect
- Verifies latest outreach updates prospect fields
- Ensures referential integrity across records

## Schema Alignment

All tests align with `system-schema.json` v1.3:

### Tables Covered
- **Outreach**: 17 fields including Company ID (FK), Outcome, Stage, Status
- **Prospects**: 16 fields including Company ID (PK), Contact Status, Last Outreach Date

### Enums Validated
- `CONTACT_STATUS`: 8 values including Won, Active, Interested (Hot/Warm), Cold, Disqualified
- `OUTCOME`: 9 values including Account Won, Interested variants, No Answer, etc.
- `STAGE`: 4 values (Outreach, Nurture, Won, Lost)
- `CONTACT_TYPE`: 3 values (Visit, Phone, Email)
- `COMPETITOR`: 5 values (AIM, Tyler Iron, Huntwell, Other, None)

### Workflow Rules Tested
- All 9 workflow rules with correct day intervals
- Urgency band calculations with proper score assignments

## Usage

### Run in Google Apps Script:
```javascript
// Load test file
// Run individual test
OutreachProspectsLogicTests.testCompanyIdLinking();

// Or run all tests via TestRunner
TestRunner.runSuite(OutreachProspectsLogicTests, 'Outreach-Prospects Logic');
```

### Run in Node.js (with mocks):
```javascript
const { OutreachProspectsLogicTests } = require('./test_outreach_prospects_logic.js');
// Tests can be executed with appropriate mocking
```

## Integration with Other Tests

This test file complements:
- `test_unit.js`: Core engine tests
- `test_integration.js`: Cross-table integration tests
- `test_workflow_aligned.js`: End-to-end workflow tests
- `test_schema_aligned.js`: Schema validation tests

## Maintenance Notes

When updating Outreach-Prospects logic:
1. Update corresponding tests in this file
2. Verify schema alignment in `system-schema.json`
3. Run full test suite to ensure no regressions
4. Update this documentation with new test cases
