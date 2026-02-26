# K&L CRM Skill: GAS Performance Optimizer (The Quota Master)

This skill mandates strict adherence to Google Apps Script (GAS) performance best practices to avoid execution timeouts and service quotas.

## 1. The "Batch or Bust" Rule
*   **NEVER** call `getValue()`, `setValue()`, `getRow()`, or `setRow()` inside a loop.
*   **ALWAYS** use `getValues()` to pull a 2D array and `setValues()` to push it back in one operation.
*   **Threshold:** If processing >100 rows, use `BatchProcessor.js` to chunk the work and prevent the 6-minute timeout.

## 2. Resource Conservation
*   **Spreadsheet Flushing:** Use `SpreadsheetApp.flush()` strategically after large write operations to ensure data integrity before the next read.
*   **Minimize API Calls:** Cache the results of `getActiveSpreadsheet()` and `getSheetByName()` in local variables. Do not call them repeatedly in a loop.
*   **The "Silent Row" Check:** Use `SharedUtils.getSafeSheetData()` to filter out empty rows before processing, saving iteration cycles.

## 3. Interaction Rule
If a proposed change involves a loop over sheet data, your response MUST include:
*"I am utilizing batch operations (getValues/setValues) to ensure we stay within GAS execution limits and avoid service timeouts."*
