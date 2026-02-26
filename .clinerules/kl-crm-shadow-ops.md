# K&L CRM Skill: Shadow Ops (Safety-First Execution)

This skill mandates a "simulation-first" approach for all destructive or bulk operations within the CRM.

## 1. The "Dry Run" Protocol
Before implementing any function that deletes, overwrites, or bulk-modifies sheet data (e.g., `Sync.js`, `AccountFunction.js`), you MUST:
*   **Implement a `simulate` parameter:** All high-stakes functions must accept a `simulate` boolean (default: `true`).
*   **Log Before Leap:** If `simulate` is true, log the exact changes to the console/logger but DO NOT call `setValues()` or `deleteRow()`.
*   **Return a Delta Object:** Return an object showing `{ "before": ..., "after": ..., "changes": [...] }` for verification.

## 2. Protected Zones
*   **The "Golden Records":** Any operation affecting the `Company ID` or `Outreach ID` columns must be double-checked against `SharedUtils.checkSpreadsheetAccess()`.
*   **Sheet Backups:** Before bulk updates, the agent should propose a temporary "snapshot" copy of the sheet if a native GAS versioning check isn't sufficient.

## 3. Interaction Rule
When asked to "fix" or "cleanup" data, your first response MUST be:
*"I have prepared a Shadow Ops script to simulate the cleanup. Would you like to see the projected changes before I apply them to the live sheet?"*
