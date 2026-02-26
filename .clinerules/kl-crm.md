# K&L Recycling CRM - Engineering Standards

This document defines the mandatory development rules and architectural conventions for the K&L Recycling CRM. All AI coding agents must strictly adhere to these guidelines.

## 1. Architectural Integrity (4-Tier SOA)
The system is organized into four tiers. Maintain this separation of concerns:
*   **Tier 1: Core Engine:** Low-level utilities and configuration (`Config.js`, `SharedUtils.js`, `SchemaNormalizer.js`).
*   **Tier 2: Business Services:** Entity-specific business rules (`ProspectFunctions.js`, `OutreachFunctions.js`).
*   **Tier 3: Workflow & Automation:** Orchestration and triggers (`Sync.js`, `PipelineService.js`).
*   **Tier 4: User Interface:** Frontend and backend UI logic (`CRM_Suite.html`, `DashboardBackend.js`).

## 2. Configuration & Schema (The "Source of Truth")
*   **Config-First:** NEVER use hardcoded strings for sheet names, column headers, or global constants. Use the `CONFIG` object in `Config.js`.
*   **Schema Normalization:** Use `SchemaNormalizer.js` to handle field name variations. Always map raw sheet headers to canonical field names (e.g., `companyName`, `contactStatus`) before processing.
*   **System Schema:** Refer to `system-schema.json` for the master data model definition.

## 3. Spreadsheet Performance & Safety
*   **Batch Operations:** DO NOT call `getValue()` or `setValue()` inside loops. Use `getValues()` and `setValues()` for batch I/O.
*   **Safe Data Access:** Always use `SharedUtils.getSafeSheetData()` for reading sheet data. This utility automatically handles header normalization and injects `_rowIndex` for easy updates.
*   **Standardized Returns:** All service-level functions MUST return a standard object:
    ```javascript
    { success: true, data: resultData, error: null }
    // or
    { success: false, data: null, error: "Error message" }
    ```

## 4. Data Handling & Identifiers
*   **Primary Keys:** Always use unique IDs (`Company ID`, `Outreach ID`) for record identification. Do not rely on row indexes for long-term storage or cross-sheet lookups.
*   **ID Generation:** Use `SharedUtils.generateUniqueId()` or `SharedUtils.generateCompanyId()` to ensure ID consistency.
*   **Date Formatting:** Use `SharedUtils.formatDate(date)` for all date operations to ensure consistent timezones (`CONFIG.TIMEZONE`) and formats (`CONFIG.DATE_FORMAT`).

## 5. Development Workflow
*   **Logging:** Log errors and significant system events to the `System_OpsLog` sheet using the pattern established in `getGlobalConstant`.
*   **Testing:** Before applying fixes, attempt to reproduce the issue using the local test runner (`npm test`). All new features or bug fixes must include corresponding test cases in `run_tests.js` or dedicated test files.
*   **Deployment:** Use `clasp push` to deploy changes to the Google Apps Script environment.

## 6. Prohibited Practices
*   No "magic strings" for data keys or sheet names.
*   No direct manipulation of `SpreadsheetApp` without checking access via `SharedUtils.checkSpreadsheetAccess()`.
*   No UI logic mixed with business service logic.
